/**
 * Teacher Analytics Dashboard
 * Dashboard profissional para gestão de entregas
 * Gráfico de progresso + Gradebook + Sistema de correção
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface TaskAnalytics {
    id: string;
    title: string;
    total_assigned: number;
    submitted_count: number;
    graded_count: number;
    pending_count: number;
    missing_count: number;
    average_score: number | null;
    max_score: number;
}

interface StudentSubmission {
    user_id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    submission_id: string | null;
    status: 'submitted' | 'graded' | 'missing';
    score: number | null;
    feedback: string | null;
    file_url: string | null;
    file_name: string | null;
    submitted_at: string | null;
    is_late: boolean;
}

type FilterType = 'all' | 'submitted' | 'graded' | 'missing';

// ============================================
// COMPONENT
// ============================================

export default function TaskAnalyticsScreen() {
    const { id: teamId, taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
    const { user } = useAuthContext();

    // State
    const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
    const [students, setStudents] = useState<StudentSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    // Grading Modal
    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentSubmission | null>(null);
    const [gradeScore, setGradeScore] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [grading, setGrading] = useState(false);

    // Fetch data
    useEffect(() => {
        if (taskId && user?.id) {
            fetchAnalytics();
        }
    }, [taskId, user?.id]);

    const fetchAnalytics = async () => {
        if (!taskId || !teamId) return;

        try {
            setLoading(true);

            // Try RPC first
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_task_teacher_analytics', {
                p_task_id: taskId,
            });

            if (!rpcError && rpcData) {
                setAnalytics(rpcData.analytics);
                setStudents(rpcData.students || []);
            } else {
                // Fallback: fetch manually
                await fetchAnalyticsFallback();
            }
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalyticsFallback = async () => {
        if (!taskId || !teamId) return;

        try {
            // Get task info
            const { data: task } = await supabase
                .from('tasks')
                .select('id, title, config')
                .eq('id', taskId)
                .single();

            // Get all assignments
            const { data: assignments } = await supabase
                .from('task_assignments')
                .select(`
                    user_id,
                    user:profiles(id, full_name, username, avatar_url)
                `)
                .eq('task_id', taskId);

            // Get all submissions
            const { data: submissions } = await supabase
                .from('task_submissions')
                .select('*')
                .eq('task_id', taskId);

            const submissionMap = new Map(submissions?.map(s => [s.user_id, s]) || []);

            // Build student list
            const studentList: StudentSubmission[] = (assignments || [])
                .filter(a => a.user && !Array.isArray(a.user))
                .map(a => {
                    const profile = a.user as any;
                    const sub = submissionMap.get(a.user_id);
                    return {
                        user_id: a.user_id,
                        full_name: profile.full_name || profile.username,
                        username: profile.username,
                        avatar_url: profile.avatar_url,
                        submission_id: sub?.id || null,
                        status: sub?.status === 'graded' ? 'graded' : sub?.status === 'submitted' ? 'submitted' : 'missing',
                        score: sub?.score || null,
                        feedback: sub?.feedback || null,
                        file_url: sub?.file_url || null,
                        file_name: sub?.file_name || null,
                        submitted_at: sub?.submitted_at || null,
                        is_late: sub?.is_late || false,
                    };
                });

            // Calculate analytics
            const submitted = studentList.filter(s => s.status === 'submitted').length;
            const graded = studentList.filter(s => s.status === 'graded').length;
            const missing = studentList.filter(s => s.status === 'missing').length;
            const scores = studentList.filter(s => s.score !== null).map(s => s.score!);
            const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

            setAnalytics({
                id: task?.id || taskId,
                title: task?.title || 'Tarefa',
                total_assigned: studentList.length,
                submitted_count: submitted,
                graded_count: graded,
                pending_count: submitted, // submitted but not graded
                missing_count: missing,
                average_score: avgScore,
                max_score: task?.config?.max_score || 20,
            });

            setStudents(studentList);
        } catch (err) {
            console.error('Fallback error:', err);
        }
    };

    // ============================================
    // HANDLERS
    // ============================================

    const handleOpenGrading = (student: StudentSubmission) => {
        if (student.status === 'missing') {
            Alert.alert('Sem Entrega', 'Este aluno ainda não entregou o trabalho.');
            return;
        }
        setSelectedStudent(student);
        setGradeScore(student.score?.toString() || '');
        setGradeFeedback(student.feedback || '');
        setGradingModalVisible(true);
    };

    const handleGrade = async () => {
        if (!selectedStudent || !selectedStudent.submission_id || !user?.id || !analytics) return;

        const score = parseInt(gradeScore);
        if (isNaN(score) || score < 0 || score > analytics.max_score) {
            Alert.alert('Erro', `A nota deve estar entre 0 e ${analytics.max_score}.`);
            return;
        }

        setGrading(true);
        try {
            // Use secure RPC for grading (validates permissions server-side)
            const { data, error } = await supabase.rpc('grade_submission', {
                p_submission_id: selectedStudent.submission_id,
                p_score: score,
                p_feedback: gradeFeedback || null,
            });

            if (error) throw error;

            const result = data as { success: boolean; xp_awarded: number; message: string };

            if (!result.success) {
                throw new Error(result.message || 'Failed to grade submission');
            }

            Alert.alert(
                '✅ Nota Lançada!',
                `${selectedStudent.full_name} recebeu ${score}/${analytics.max_score}${result.xp_awarded > 0 ? ` e +${result.xp_awarded} XP` : ''}.`
            );
            setGradingModalVisible(false);
            fetchAnalytics(); // Refresh
        } catch (err: any) {
            console.error('Grading error:', err);
            Alert.alert('Erro', err?.message || 'Não foi possível lançar a nota.');
        } finally {
            setGrading(false);
        }
    };

    // ============================================
    // FILTERED DATA
    // ============================================

    const filteredStudents = students.filter(s => {
        if (filter === 'all') return true;
        if (filter === 'submitted') return s.status === 'submitted';
        if (filter === 'graded') return s.status === 'graded';
        if (filter === 'missing') return s.status === 'missing';
        return true;
    });

    // ============================================
    // CHART DATA
    // ============================================

    const chartData = analytics ? [
        { value: analytics.graded_count, color: colors.success.primary, label: 'Corrigidos' },
        { value: analytics.submitted_count, color: colors.warning.primary, label: 'Por corrigir' },
        { value: analytics.missing_count, color: colors.danger.primary, label: 'Em falta' },
    ].filter(d => d.value > 0) : [];

    // ============================================
    // RENDER
    // ============================================

    const renderStudent = ({ item }: { item: StudentSubmission }) => {
        const getStatusStyle = () => {
            switch (item.status) {
                case 'graded':
                    return { bg: colors.success.light, color: colors.success.primary };
                case 'submitted':
                    return { bg: colors.warning.light, color: colors.warning.primary };
                case 'missing':
                    return { bg: colors.danger.light, color: colors.danger.primary };
            }
        };

        const statusStyle = getStatusStyle();

        return (
            <Pressable
                style={styles.studentCard}
                onPress={() => handleOpenGrading(item)}
            >
                {/* Avatar */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.full_name?.[0]?.toUpperCase() || '?'}
                    </Text>
                </View>

                {/* Info */}
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.full_name}</Text>
                    <View style={styles.studentMeta}>
                        {item.submitted_at && (
                            <Text style={styles.submittedAt}>
                                {new Date(item.submitted_at).toLocaleDateString('pt-PT')}
                                {item.is_late && ' (atrasado)'}
                            </Text>
                        )}
                        {item.file_name && (
                            <Ionicons name="attach" size={14} color={colors.text.tertiary} />
                        )}
                    </View>
                </View>

                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    {item.status === 'graded' ? (
                        <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                            {item.score}/{analytics?.max_score || 20}
                        </Text>
                    ) : item.status === 'submitted' ? (
                        <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                            Por corrigir
                        </Text>
                    ) : (
                        <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                            Em falta
                        </Text>
                    )}
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </Pressable>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Entregas</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {analytics?.title}
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Stats Card with Chart */}
                <View style={styles.statsCard}>
                    <View style={styles.chartContainer}>
                        <PieChart
                            data={chartData}
                            donut
                            radius={60}
                            innerRadius={40}
                            centerLabelComponent={() => (
                                <View style={styles.chartCenter}>
                                    <Text style={styles.chartCenterNumber}>
                                        {(analytics?.graded_count || 0) + (analytics?.submitted_count || 0)}
                                    </Text>
                                    <Text style={styles.chartCenterLabel}>
                                        /{analytics?.total_assigned || 0}
                                    </Text>
                                </View>
                            )}
                        />
                    </View>
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.success.primary }]} />
                            <Text style={styles.legendLabel}>Corrigidos</Text>
                            <Text style={styles.legendValue}>{analytics?.graded_count || 0}</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.warning.primary }]} />
                            <Text style={styles.legendLabel}>Por corrigir</Text>
                            <Text style={styles.legendValue}>{analytics?.submitted_count || 0}</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.danger.primary }]} />
                            <Text style={styles.legendLabel}>Em falta</Text>
                            <Text style={styles.legendValue}>{analytics?.missing_count || 0}</Text>
                        </View>
                        {analytics && analytics.average_score !== null && (
                            <View style={[styles.legendItem, styles.legendItemAverage]}>
                                <Ionicons name="stats-chart" size={16} color={colors.accent.primary} />
                                <Text style={styles.legendLabel}>Média</Text>
                                <Text style={[styles.legendValue, styles.legendValueAverage]}>
                                    {analytics.average_score.toFixed(1)}/{analytics.max_score}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterTabs}>
                    {[
                        { id: 'all', label: 'Todos', count: students.length },
                        { id: 'submitted', label: 'Por corrigir', count: analytics?.submitted_count || 0 },
                        { id: 'graded', label: 'Corrigidos', count: analytics?.graded_count || 0 },
                        { id: 'missing', label: 'Em falta', count: analytics?.missing_count || 0 },
                    ].map(tab => (
                        <Pressable
                            key={tab.id}
                            style={[
                                styles.filterTab,
                                filter === tab.id && styles.filterTabActive,
                            ]}
                            onPress={() => setFilter(tab.id as FilterType)}
                        >
                            <Text style={[
                                styles.filterTabText,
                                filter === tab.id && styles.filterTabTextActive,
                            ]}>
                                {tab.label} ({tab.count})
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Student List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        📋 Alunos ({filteredStudents.length})
                    </Text>
                    <FlatList
                        data={filteredStudents}
                        renderItem={renderStudent}
                        keyExtractor={item => item.user_id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.listContent}
                    />
                </View>
            </ScrollView>

            {/* Grading Modal */}
            <Modal
                visible={gradingModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setGradingModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setGradingModalVisible(false)}>
                            <Text style={styles.modalCancel}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>Correção</Text>
                        <Pressable onPress={handleGrade} disabled={grading}>
                            {grading ? (
                                <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                                <Text style={styles.modalSave}>Lançar</Text>
                            )}
                        </Pressable>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {selectedStudent && (
                            <>
                                {/* Student Info */}
                                <View style={styles.gradingStudentCard}>
                                    <View style={styles.gradingAvatar}>
                                        <Text style={styles.gradingAvatarText}>
                                            {selectedStudent.full_name?.[0]?.toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.gradingStudentName}>
                                            {selectedStudent.full_name}
                                        </Text>
                                        <Text style={styles.gradingSubmittedAt}>
                                            Entregue: {selectedStudent.submitted_at
                                                ? new Date(selectedStudent.submitted_at).toLocaleString('pt-PT')
                                                : 'N/A'}
                                            {selectedStudent.is_late && ' (atrasado)'}
                                        </Text>
                                    </View>
                                </View>

                                {/* File Link */}
                                {selectedStudent.file_url && (
                                    <Pressable
                                        style={styles.fileCard}
                                        onPress={() => Linking.openURL(selectedStudent.file_url!)}
                                    >
                                        <View style={styles.fileIconBox}>
                                            <Ionicons name="document" size={24} color={colors.accent.primary} />
                                        </View>
                                        <View style={styles.fileInfo}>
                                            <Text style={styles.fileName}>{selectedStudent.file_name}</Text>
                                            <Text style={styles.fileAction}>Toca para abrir</Text>
                                        </View>
                                        <Ionicons name="open-outline" size={20} color={colors.text.tertiary} />
                                    </Pressable>
                                )}

                                {/* Score Input */}
                                <View style={styles.gradeInputGroup}>
                                    <Text style={styles.gradeLabel}>
                                        Nota (0-{analytics?.max_score || 20})
                                    </Text>
                                    <View style={styles.scoreInputRow}>
                                        <TextInput
                                            style={styles.scoreInput}
                                            value={gradeScore}
                                            onChangeText={setGradeScore}
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            placeholderTextColor={colors.text.tertiary}
                                        />
                                        <Text style={styles.scoreMax}>
                                            / {analytics?.max_score || 20}
                                        </Text>
                                    </View>
                                </View>

                                {/* Quick Grades */}
                                <View style={styles.quickGrades}>
                                    {[
                                        { label: '😞', value: Math.round((analytics?.max_score || 20) * 0.25) },
                                        { label: '😐', value: Math.round((analytics?.max_score || 20) * 0.5) },
                                        { label: '🙂', value: Math.round((analytics?.max_score || 20) * 0.75) },
                                        { label: '🤩', value: analytics?.max_score || 20 },
                                    ].map(qg => (
                                        <Pressable
                                            key={qg.value}
                                            style={[
                                                styles.quickGradeButton,
                                                gradeScore === qg.value.toString() && styles.quickGradeButtonActive,
                                            ]}
                                            onPress={() => setGradeScore(qg.value.toString())}
                                        >
                                            <Text style={styles.quickGradeEmoji}>{qg.label}</Text>
                                            <Text style={[
                                                styles.quickGradeValue,
                                                gradeScore === qg.value.toString() && styles.quickGradeValueActive,
                                            ]}>
                                                {qg.value}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                {/* Feedback Input */}
                                <View style={styles.gradeInputGroup}>
                                    <Text style={styles.gradeLabel}>Feedback</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.textArea]}
                                        value={gradeFeedback}
                                        onChangeText={setGradeFeedback}
                                        placeholder="Comentários sobre o trabalho..."
                                        placeholderTextColor={colors.text.tertiary}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },

    // Stats Card
    statsCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        margin: spacing.lg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.md,
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartCenter: {
        alignItems: 'center',
    },
    chartCenterNumber: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    chartCenterLabel: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    legendContainer: {
        flex: 1,
        marginLeft: spacing.lg,
        justifyContent: 'center',
        gap: spacing.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    legendItemAverage: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    legendValue: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    legendValueAverage: {
        color: colors.accent.primary,
    },

    // Filter Tabs
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    filterTab: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
    },
    filterTabActive: {
        backgroundColor: colors.accent.primary,
    },
    filterTabText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    filterTabTextActive: {
        color: '#FFF',
    },

    // Section
    section: {
        paddingHorizontal: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    listContent: {
        paddingBottom: spacing.xl,
    },

    // Student Card
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    studentInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    studentName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    studentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: 2,
    },
    submittedAt: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginRight: spacing.sm,
    },
    statusBadgeText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalCancel: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    modalSave: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    modalContent: {
        padding: spacing.lg,
    },

    // Grading Student Card
    gradingStudentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    gradingAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    gradingAvatarText: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    gradingStudentName: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    gradingSubmittedAt: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },

    // File Card
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.accent.primary,
    },
    fileIconBox: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    fileName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    fileAction: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },

    // Grade Input
    gradeInputGroup: {
        marginBottom: spacing.lg,
    },
    gradeLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    scoreInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreInput: {
        width: 100,
        fontSize: typography.size['3xl'],
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        textAlign: 'center',
    },
    scoreMax: {
        fontSize: typography.size.xl,
        color: colors.text.tertiary,
        marginLeft: spacing.sm,
    },

    // Quick Grades
    quickGrades: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    quickGradeButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.divider,
    },
    quickGradeButtonActive: {
        borderColor: colors.accent.primary,
        backgroundColor: colors.accent.light,
    },
    quickGradeEmoji: {
        fontSize: 24,
    },
    quickGradeValue: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },
    quickGradeValueActive: {
        color: colors.accent.primary,
    },

    // Text Input
    textInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    textArea: {
        minHeight: 120,
    },
});
