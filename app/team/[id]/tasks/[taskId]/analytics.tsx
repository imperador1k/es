/**
 * Teacher Analytics Dashboard - Premium Dark Design
 * Dashboard profissional para gestão de entregas
 * Gráfico de progresso + Gradebook + Sistema de correção
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
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

    const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
    const [students, setStudents] = useState<StudentSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentSubmission | null>(null);
    const [gradeScore, setGradeScore] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [grading, setGrading] = useState(false);

    useEffect(() => {
        if (taskId && user?.id) fetchAnalytics();
    }, [taskId, user?.id]);

    const fetchAnalytics = async () => {
        if (!taskId || !teamId) return;

        try {
            setLoading(true);
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_task_teacher_analytics', { p_task_id: taskId });

            if (!rpcError && rpcData) {
                setAnalytics(rpcData.analytics);
                setStudents(rpcData.students || []);
            } else {
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
            // Buscar tarefa
            const { data: task } = await supabase.from('tasks').select('id, title, config, team_id').eq('id', taskId).single();

            // Tentar buscar assignments primeiro
            const { data: assignments } = await supabase
                .from('task_assignments')
                .select(`user_id, user:profiles(id, full_name, username, avatar_url)`)
                .eq('task_id', taskId);

            // Se não há assignments, buscar membros da equipa diretamente
            let memberProfiles: any[] = [];
            if (!assignments || assignments.length === 0) {
                const { data: teamMembers } = await supabase
                    .from('team_members')
                    .select(`user_id, profile:profiles(id, full_name, username, avatar_url)`)
                    .eq('team_id', task?.team_id || teamId);

                memberProfiles = (teamMembers || [])
                    .filter(m => m.profile && !Array.isArray(m.profile))
                    .map(m => ({ user_id: m.user_id, user: m.profile }));
            } else {
                memberProfiles = assignments.filter(a => a.user && !Array.isArray(a.user));
            }

            // Buscar todas as submissions
            const { data: submissions } = await supabase.from('task_submissions').select('*').eq('task_id', taskId);
            const submissionMap = new Map(submissions?.map((s) => [s.user_id, s]) || []);

            // Construir lista de estudantes
            const studentList: StudentSubmission[] = memberProfiles.map((a) => {
                const profile = a.user as any;
                const sub = submissionMap.get(a.user_id);
                return {
                    user_id: a.user_id,
                    full_name: profile?.full_name || profile?.username || 'Unknown',
                    username: profile?.username || '',
                    avatar_url: profile?.avatar_url || null,
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

            const submitted = studentList.filter((s) => s.status === 'submitted').length;
            const graded = studentList.filter((s) => s.status === 'graded').length;
            const missing = studentList.filter((s) => s.status === 'missing').length;
            const scores = studentList.filter((s) => s.score !== null).map((s) => s.score!);
            const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

            setAnalytics({
                id: task?.id || taskId,
                title: task?.title || 'Tarefa',
                total_assigned: studentList.length,
                submitted_count: submitted,
                graded_count: graded,
                pending_count: submitted,
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
            const { data, error } = await supabase.rpc('grade_submission', {
                p_submission_id: selectedStudent.submission_id,
                p_score: score,
                p_feedback: gradeFeedback || null,
            });

            if (error) throw error;
            const result = data as { success: boolean; xp_awarded: number; message: string };
            if (!result.success) throw new Error(result.message || 'Failed to grade submission');

            Alert.alert(
                '✅ Nota Lançada!',
                `${selectedStudent.full_name} recebeu ${score}/${analytics.max_score}${result.xp_awarded > 0 ? ` e +${result.xp_awarded} XP` : ''}.`
            );
            setGradingModalVisible(false);
            fetchAnalytics();
        } catch (err: any) {
            console.error('Grading error:', err);
            Alert.alert('Erro', err?.message || 'Não foi possível lançar a nota.');
        } finally {
            setGrading(false);
        }
    };

    // ============================================
    // DATA
    // ============================================

    const filteredStudents = students.filter((s) => {
        if (filter === 'all') return true;
        return s.status === filter;
    });

    const chartData = analytics
        ? [
            { value: analytics.graded_count, color: '#22C55E', label: 'Corrigidos' },
            { value: analytics.submitted_count, color: '#F59E0B', label: 'Por corrigir' },
            { value: analytics.missing_count, color: '#EF4444', label: 'Em falta' },
        ].filter((d) => d.value > 0)
        : [];

    const progressPercent = analytics?.total_assigned
        ? Math.round(((analytics.graded_count + analytics.submitted_count) / analytics.total_assigned) * 100)
        : 0;

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar analytics...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>📊 Analytics</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>{analytics?.title}</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Stats Overview */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { borderColor: '#22C55E' }]}>
                            <Text style={styles.statValue}>{analytics?.graded_count || 0}</Text>
                            <Text style={styles.statLabel}>Corrigidos</Text>
                        </View>
                        <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
                            <Text style={styles.statValue}>{analytics?.submitted_count || 0}</Text>
                            <Text style={styles.statLabel}>Por corrigir</Text>
                        </View>
                        <View style={[styles.statCard, { borderColor: '#EF4444' }]}>
                            <Text style={styles.statValue}>{analytics?.missing_count || 0}</Text>
                            <Text style={styles.statLabel}>Em falta</Text>
                        </View>
                    </View>

                    {/* Chart Card */}
                    <View style={styles.chartCard}>
                        <View style={styles.chartContainer}>
                            {chartData.length > 0 ? (
                                <PieChart
                                    data={chartData}
                                    donut
                                    radius={70}
                                    innerRadius={50}
                                    centerLabelComponent={() => (
                                        <View style={styles.chartCenter}>
                                            <Text style={styles.chartPercent}>{progressPercent}%</Text>
                                            <Text style={styles.chartPercentLabel}>entregue</Text>
                                        </View>
                                    )}
                                />
                            ) : (
                                <View style={styles.chartEmpty}>
                                    <Ionicons name="pie-chart-outline" size={48} color={COLORS.text.tertiary} />
                                </View>
                            )}
                        </View>

                        <View style={styles.legendContainer}>
                            {[
                                { label: 'Corrigidos', value: analytics?.graded_count || 0, color: '#22C55E' },
                                { label: 'Por corrigir', value: analytics?.submitted_count || 0, color: '#F59E0B' },
                                { label: 'Em falta', value: analytics?.missing_count || 0, color: '#EF4444' },
                            ].map((item) => (
                                <View key={item.label} style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendLabel}>{item.label}</Text>
                                    <Text style={styles.legendValue}>{item.value}</Text>
                                </View>
                            ))}
                            {analytics?.average_score !== null && (
                                <View style={styles.averageRow}>
                                    <Ionicons name="stats-chart" size={16} color="#6366F1" />
                                    <Text style={styles.averageLabel}>Média</Text>
                                    <Text style={styles.averageValue}>
                                        {analytics?.average_score?.toFixed(1)}/{analytics?.max_score}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.filterContainer}>
                        {[
                            { id: 'all' as FilterType, label: 'Todos', count: students.length },
                            { id: 'submitted' as FilterType, label: 'Por corrigir', count: analytics?.submitted_count || 0 },
                            { id: 'graded' as FilterType, label: 'Corrigidos', count: analytics?.graded_count || 0 },
                            { id: 'missing' as FilterType, label: 'Em falta', count: analytics?.missing_count || 0 },
                        ].map((tab) => (
                            <Pressable
                                key={tab.id}
                                style={[styles.filterTab, filter === tab.id && styles.filterTabActive]}
                                onPress={() => setFilter(tab.id)}
                            >
                                <Text style={[styles.filterTabText, filter === tab.id && styles.filterTabTextActive]}>
                                    {tab.label} ({tab.count})
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Students List */}
                    <Text style={styles.sectionTitle}>📋 Alunos ({filteredStudents.length})</Text>
                    {filteredStudents.map((student) => (
                        <StudentRow key={student.user_id} student={student} maxScore={analytics?.max_score || 20} onPress={() => handleOpenGrading(student)} />
                    ))}
                </ScrollView>

                {/* Grading Modal */}
                <Modal visible={gradingModalVisible} animationType="slide" transparent onRequestClose={() => setGradingModalVisible(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setGradingModalVisible(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Lançar Nota</Text>

                            {selectedStudent && (
                                <>
                                    <View style={styles.gradingHeader}>
                                        <View style={styles.gradingAvatar}>
                                            <Text style={styles.gradingAvatarText}>{selectedStudent.full_name?.[0]?.toUpperCase()}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.gradingName}>{selectedStudent.full_name}</Text>
                                            <Text style={styles.gradingDate}>
                                                {selectedStudent.submitted_at
                                                    ? new Date(selectedStudent.submitted_at).toLocaleString('pt-PT')
                                                    : 'N/A'}
                                                {selectedStudent.is_late && ' (atrasado)'}
                                            </Text>
                                        </View>
                                    </View>

                                    {selectedStudent.file_url && (
                                        <Pressable style={styles.fileCard} onPress={() => Linking.openURL(selectedStudent.file_url!)}>
                                            <Ionicons name="document" size={24} color="#6366F1" />
                                            <Text style={styles.fileCardName}>{selectedStudent.file_name}</Text>
                                            <Ionicons name="open-outline" size={18} color={COLORS.text.tertiary} />
                                        </Pressable>
                                    )}

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Nota (0-{analytics?.max_score || 20})</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={gradeScore}
                                            onChangeText={setGradeScore}
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            placeholderTextColor={COLORS.text.tertiary}
                                        />
                                    </View>

                                    {/* Quick Grades */}
                                    <View style={styles.quickGrades}>
                                        {[
                                            { emoji: '😞', value: Math.round((analytics?.max_score || 20) * 0.25) },
                                            { emoji: '😐', value: Math.round((analytics?.max_score || 20) * 0.5) },
                                            { emoji: '🙂', value: Math.round((analytics?.max_score || 20) * 0.75) },
                                            { emoji: '🤩', value: analytics?.max_score || 20 },
                                        ].map((qg) => (
                                            <Pressable
                                                key={qg.value}
                                                style={[styles.quickGrade, gradeScore === qg.value.toString() && styles.quickGradeActive]}
                                                onPress={() => setGradeScore(qg.value.toString())}
                                            >
                                                <Text style={styles.quickGradeEmoji}>{qg.emoji}</Text>
                                                <Text style={[styles.quickGradeValue, gradeScore === qg.value.toString() && styles.quickGradeValueActive]}>
                                                    {qg.value}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Feedback</Text>
                                        <TextInput
                                            style={[styles.input, { height: 100 }]}
                                            value={gradeFeedback}
                                            onChangeText={setGradeFeedback}
                                            placeholder="Comentários sobre o trabalho..."
                                            placeholderTextColor={COLORS.text.tertiary}
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </View>

                                    <View style={styles.modalButtons}>
                                        <Pressable style={styles.modalBtnCancel} onPress={() => setGradingModalVisible(false)}>
                                            <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                                        </Pressable>
                                        <Pressable style={styles.modalBtnConfirm} onPress={handleGrade} disabled={grading}>
                                            {grading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnConfirmText}>Lançar Nota</Text>}
                                        </Pressable>
                                    </View>
                                </>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// STUDENT ROW COMPONENT
// ============================================

function StudentRow({
    student,
    maxScore,
    onPress,
}: {
    student: StudentSubmission;
    maxScore: number;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const getStatusStyle = () => {
        switch (student.status) {
            case 'graded':
                return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' };
            case 'submitted':
                return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' };
            case 'missing':
                return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' };
        }
    };

    const statusStyle = getStatusStyle();

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={[styles.studentCard, { transform: [{ scale }] }]}>
                <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>{student.full_name?.[0]?.toUpperCase() || '?'}</Text>
                </View>

                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <View style={styles.studentMeta}>
                        {student.submitted_at && (
                            <Text style={styles.studentDate}>
                                {new Date(student.submitted_at).toLocaleDateString('pt-PT')}
                                {student.is_late && ' (atrasado)'}
                            </Text>
                        )}
                        {student.file_name && <Ionicons name="attach" size={14} color={COLORS.text.tertiary} />}
                    </View>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                        {student.status === 'graded' ? `${student.score}/${maxScore}` : student.status === 'submitted' ? 'Por corrigir' : 'Em falta'}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderLeftWidth: 3,
    },
    statValue: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Chart Card
    chartCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartCenter: {
        alignItems: 'center',
    },
    chartPercent: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    chartPercentLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },
    chartEmpty: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendContainer: {
        flex: 1,
        marginLeft: SPACING.lg,
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
    legendValue: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    averageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    averageLabel: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
    averageValue: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#6366F1',
    },

    // Filter Tabs
    filterContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.lg,
    },
    filterTab: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surfaceElevated,
    },
    filterTabActive: {
        backgroundColor: '#6366F1',
    },
    filterTabText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    filterTabTextActive: {
        color: '#FFF',
    },

    // Section
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },

    // Student Card
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    studentAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    studentAvatarText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#6366F1',
    },
    studentInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    studentName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    studentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: 2,
    },
    studentDate: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    statusBadge: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        marginRight: SPACING.sm,
    },
    statusBadgeText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },

    // Modal
    modalWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        padding: SPACING.xl,
        paddingBottom: 50,
    },
    modalHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xl,
        textAlign: 'center',
    },
    gradingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    gradingAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradingAvatarText: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#6366F1',
    },
    gradingName: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    gradingDate: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.lg,
    },
    fileCardName: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: '#6366F1',
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    quickGrades: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    quickGrade: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    quickGradeActive: {
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    quickGradeEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    quickGradeValue: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
    quickGradeValueActive: {
        color: '#6366F1',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    modalBtnCancel: {
        flex: 1,
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.xl,
    },
    modalBtnCancelText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    modalBtnConfirm: {
        flex: 1,
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        backgroundColor: '#6366F1',
        borderRadius: RADIUS.xl,
    },
    modalBtnConfirmText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
});
