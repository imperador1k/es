/**
 * Task Detail Screen - Premium Dark Design
 * Visualização da tarefa e sistema de entrega
 * Professor vê entregas, Aluno pode submeter
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import {
    getTask,
    getTaskSubmissions,
    getUserSubmission,
    gradeSubmission,
    submitTask,
    Task,
    TaskSubmission,
    uploadSubmissionFile,
} from '@/services/taskService';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// COMPONENT
// ============================================

export default function TaskDetailScreen() {
    const { id: teamId, taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
    const { user } = useAuthContext();

    const [task, setTask] = useState<Task | null>(null);
    const [submission, setSubmission] = useState<TaskSubmission | null>(null);
    const [allSubmissions, setAllSubmissions] = useState<TaskSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [linkUrl, setLinkUrl] = useState('');
    const [comment, setComment] = useState('');
    const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string } | null>(null);

    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState<TaskSubmission | null>(null);
    const [gradeScore, setGradeScore] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [grading, setGrading] = useState(false);

    useEffect(() => {
        if (taskId && teamId && user?.id) {
            loadData();
            checkTeacherRole();
        }
    }, [taskId, teamId, user?.id]);

    const loadData = async () => {
        if (!taskId || !user?.id) return;
        setLoading(true);
        try {
            const taskData = await getTask(taskId);
            setTask(taskData);
            const userSubmission = await getUserSubmission(taskId, user.id);
            setSubmission(userSubmission);
            if (isTeacher) {
                const submissions = await getTaskSubmissions(taskId);
                setAllSubmissions(submissions);
            }
        } catch (err) {
            console.error('Error loading task:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkTeacherRole = async () => {
        if (!teamId || !user?.id) return;
        try {
            const { data } = await supabase
                .from('team_members')
                .select('role')
                .eq('team_id', teamId)
                .eq('user_id', user.id)
                .single();

            const teacherRoles = ['owner', 'admin', 'moderator'];
            setIsTeacher(data ? teacherRoles.includes(data.role) : false);

            if (data && teacherRoles.includes(data.role) && taskId) {
                const submissions = await getTaskSubmissions(taskId);
                setAllSubmissions(submissions);
            }
        } catch (err) {
            console.error('Error checking role:', err);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // ============================================
    // HANDLERS
    // ============================================

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: task?.config?.allowed_file_types?.map((t) => {
                    const mimeTypes: Record<string, string> = {
                        pdf: 'application/pdf',
                        jpg: 'image/jpeg',
                        png: 'image/png',
                        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        zip: 'application/zip',
                    };
                    return mimeTypes[t] || '*/*';
                }) || ['*/*'],
            });

            if (result.canceled || !result.assets?.[0]) return;
            const file = result.assets[0];
            setSelectedFile({ uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
        } catch (err) {
            console.error('Error picking file:', err);
            Alert.alert('Erro', 'Não foi possível selecionar o ficheiro.');
        }
    };

    const handleSubmit = async () => {
        if (!task || !user?.id || !teamId) return;

        if (task.config?.requires_file_upload && !selectedFile && !submission?.file_url) {
            Alert.alert('Erro', 'É obrigatório anexar um ficheiro.');
            return;
        }

        setSubmitting(true);
        try {
            let fileUrl = submission?.file_url;
            let fileName = submission?.file_name;
            let fileType = submission?.file_type;
            let fileSize = submission?.file_size;

            if (selectedFile) {
                const uploadResult = await uploadSubmissionFile(teamId, task.id, user.id, selectedFile);
                if (uploadResult) {
                    fileUrl = uploadResult.url;
                    fileName = selectedFile.name;
                    fileType = selectedFile.type;
                }
            }

            const result = await submitTask(task.id, user.id, {
                content: comment,
                file_url: fileUrl || undefined,
                file_name: fileName || undefined,
                file_type: fileType || undefined,
                file_size: fileSize || undefined,
                link_url: linkUrl || undefined,
            }, task.due_date || undefined);

            if (result) {
                setSubmission(result);
                setSelectedFile(null);
                Alert.alert('✅ Entregue!', 'A tua entrega foi submetida com sucesso.');
            } else {
                Alert.alert('Erro', 'Não foi possível submeter a entrega.');
            }
        } catch (err) {
            console.error('Error submitting:', err);
            Alert.alert('Erro', 'Ocorreu um erro ao submeter.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenGrading = (sub: TaskSubmission) => {
        setGradingSubmission(sub);
        setGradeScore(sub.score?.toString() || '');
        setGradeFeedback(sub.feedback || '');
        setGradingModalVisible(true);
    };

    const handleGrade = async () => {
        if (!gradingSubmission || !user?.id) return;

        const score = parseInt(gradeScore);
        if (isNaN(score) || score < 0 || score > (task?.config?.max_score || 20)) {
            Alert.alert('Erro', `A nota deve estar entre 0 e ${task?.config?.max_score || 20}.`);
            return;
        }

        setGrading(true);
        try {
            const success = await gradeSubmission(gradingSubmission.id, user.id, score, gradeFeedback);
            if (success) {
                Alert.alert('✅', 'Nota atribuída com sucesso!');
                setGradingModalVisible(false);
                onRefresh();
            } else {
                Alert.alert('Erro', 'Não foi possível atribuir a nota.');
            }
        } catch (err) {
            console.error('Error grading:', err);
            Alert.alert('Erro', 'Ocorreu um erro.');
        } finally {
            setGrading(false);
        }
    };

    // ============================================
    // HELPERS
    // ============================================

    const isOverdue = task?.due_date ? new Date() > new Date(task.due_date) : false;
    const canSubmit = !isOverdue || task?.config?.allow_late_submissions;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return '#F59E0B';
            case 'graded': return '#22C55E';
            case 'returned': return '#EF4444';
            default: return COLORS.text.tertiary;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'Aguarda Avaliação';
            case 'graded': return 'Avaliado';
            case 'returned': return 'Devolvido';
            default: return 'Rascunho';
        }
    };

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar tarefa...</Text>
                </View>
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="alert-circle" size={48} color={COLORS.text.tertiary} />
                    <Text style={styles.loadingText}>Tarefa não encontrada</Text>
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
                        <Text style={styles.headerTitle} numberOfLines={1}>{task.title}</Text>
                    </View>
                    {isTeacher && (
                        <Pressable
                            style={styles.analyticsBtn}
                            onPress={() => router.push(`/team/${teamId}/tasks/${taskId}/analytics` as any)}
                        >
                            <Ionicons name="bar-chart" size={20} color="#6366F1" />
                        </Pressable>
                    )}
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
                >
                    {/* Task Info Card */}
                    <View style={styles.taskCard}>
                        <View style={styles.taskHeader}>
                            <View style={styles.typeBadge}>
                                <Ionicons name="document-text" size={16} color="#6366F1" />
                                <Text style={styles.typeBadgeText}>Tarefa</Text>
                            </View>
                            <View style={styles.xpBadge}>
                                <Ionicons name="flash" size={14} color="#FFD700" />
                                <Text style={styles.xpBadgeText}>{task.xp_reward} XP</Text>
                            </View>
                        </View>

                        <Text style={styles.taskTitle}>{task.title}</Text>
                        {task.description && <Text style={styles.taskDescription}>{task.description}</Text>}

                        {/* Due Date */}
                        {task.due_date && (
                            <View style={[styles.dueRow, isOverdue && styles.dueRowOverdue]}>
                                <Ionicons name="calendar" size={18} color={isOverdue ? '#EF4444' : COLORS.text.secondary} />
                                <Text style={[styles.dueText, isOverdue && styles.dueTextOverdue]}>
                                    {isOverdue ? 'Prazo expirado: ' : 'Prazo: '}
                                    {new Date(task.due_date).toLocaleDateString('pt-PT', {
                                        day: '2-digit',
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                        )}

                        {/* Config Info */}
                        <View style={styles.configList}>
                            {task.config?.requires_file_upload && (
                                <View style={styles.configItem}>
                                    <Ionicons name="attach" size={16} color={COLORS.text.tertiary} />
                                    <Text style={styles.configText}>
                                        Ficheiro obrigatório ({task.config.allowed_file_types?.join(', ')})
                                    </Text>
                                </View>
                            )}
                            <View style={styles.configItem}>
                                <Ionicons name="star" size={16} color={COLORS.text.tertiary} />
                                <Text style={styles.configText}>Nota máxima: {task.config?.max_score || 20}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Student View: Submission */}
                    {!isTeacher && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📤 A Tua Entrega</Text>

                            {submission && (
                                <View style={[styles.statusCard, { borderColor: getStatusColor(submission.status) }]}>
                                    <View style={styles.statusHeader}>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(submission.status) }]} />
                                        <Text style={styles.statusText}>{getStatusLabel(submission.status)}</Text>
                                        {submission.score !== null && (
                                            <Text style={styles.scoreText}>{submission.score}/{task.config?.max_score || 20}</Text>
                                        )}
                                    </View>
                                    {submission.file_name && (
                                        <Pressable style={styles.fileLink} onPress={() => Linking.openURL(submission.file_url!)}>
                                            <Ionicons name="document" size={18} color="#6366F1" />
                                            <Text style={styles.fileLinkText}>{submission.file_name}</Text>
                                        </Pressable>
                                    )}
                                    {submission.feedback && (
                                        <View style={styles.feedbackBox}>
                                            <Text style={styles.feedbackLabel}>Feedback do Professor:</Text>
                                            <Text style={styles.feedbackText}>{submission.feedback}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {canSubmit && (!submission || submission.status !== 'graded') && (
                                <View style={styles.submitForm}>
                                    <Pressable style={styles.uploadButton} onPress={handlePickFile}>
                                        <LinearGradient
                                            colors={selectedFile ? ['#22C55E', '#16A34A'] : ['#6366F1', '#4F46E5']}
                                            style={styles.uploadGradient}
                                        >
                                            <Ionicons name={selectedFile ? 'document' : 'cloud-upload-outline'} size={24} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.uploadText}>
                                            {selectedFile ? selectedFile.name : 'Anexar Ficheiro'}
                                        </Text>
                                    </Pressable>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Link (opcional)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={linkUrl}
                                            onChangeText={setLinkUrl}
                                            placeholder="https://..."
                                            placeholderTextColor={COLORS.text.tertiary}
                                            autoCapitalize="none"
                                            keyboardType="url"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Comentário (opcional)</Text>
                                        <TextInput
                                            style={[styles.input, { height: 80 }]}
                                            value={comment}
                                            onChangeText={setComment}
                                            placeholder="Notas ou observações..."
                                            placeholderTextColor={COLORS.text.tertiary}
                                            multiline
                                            textAlignVertical="top"
                                        />
                                    </View>

                                    <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
                                        {submitting ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="send" size={20} color="#FFF" />
                                                <Text style={styles.submitButtonText}>
                                                    {submission ? 'Atualizar Entrega' : 'Entregar'}
                                                </Text>
                                            </>
                                        )}
                                    </Pressable>

                                    {isOverdue && task.config?.allow_late_submissions && (
                                        <Text style={styles.lateWarning}>⚠️ Entrega em atraso</Text>
                                    )}
                                </View>
                            )}

                            {!canSubmit && !submission && (
                                <View style={styles.closedCard}>
                                    <Ionicons name="lock-closed" size={32} color={COLORS.text.tertiary} />
                                    <Text style={styles.closedText}>O prazo de entrega terminou</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Teacher View: Submissions */}
                    {isTeacher && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📋 Entregas ({allSubmissions.length})</Text>

                            {allSubmissions.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Ionicons name="file-tray-outline" size={48} color={COLORS.text.tertiary} />
                                    <Text style={styles.emptyText}>Nenhuma entrega ainda</Text>
                                </View>
                            ) : (
                                allSubmissions.map((sub) => (
                                    <SubmissionCard
                                        key={sub.id}
                                        sub={sub}
                                        maxScore={task.config?.max_score || 20}
                                        onPress={() => handleOpenGrading(sub)}
                                    />
                                ))
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Grading Modal */}
                <Modal visible={gradingModalVisible} animationType="slide" transparent onRequestClose={() => setGradingModalVisible(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setGradingModalVisible(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Avaliar Entrega</Text>

                            {gradingSubmission && (
                                <>
                                    <View style={styles.gradingInfo}>
                                        <Text style={styles.gradingName}>{(gradingSubmission as any).user?.full_name}</Text>
                                        <Text style={styles.gradingDate}>
                                            {new Date(gradingSubmission.submitted_at).toLocaleString('pt-PT')}
                                        </Text>
                                    </View>

                                    {gradingSubmission.file_url && (
                                        <Pressable style={styles.gradingFile} onPress={() => Linking.openURL(gradingSubmission.file_url!)}>
                                            <Ionicons name="document" size={24} color="#6366F1" />
                                            <Text style={styles.gradingFileName}>{gradingSubmission.file_name}</Text>
                                            <Ionicons name="open-outline" size={18} color={COLORS.text.tertiary} />
                                        </Pressable>
                                    )}

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Nota (0-{task?.config?.max_score || 20})</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={gradeScore}
                                            onChangeText={setGradeScore}
                                            keyboardType="number-pad"
                                            placeholder="0"
                                            placeholderTextColor={COLORS.text.tertiary}
                                        />
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
                                            {grading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalBtnConfirmText}>Guardar Nota</Text>}
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
// SUBMISSION CARD
// ============================================

function SubmissionCard({
    sub,
    maxScore,
    onPress,
}: {
    sub: TaskSubmission;
    maxScore: number;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const statusColor = sub.status === 'graded' ? '#22C55E' : '#F59E0B';

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={[styles.subCard, { transform: [{ scale }] }]}>
                <View style={styles.subAvatarPlaceholder}>
                    <Text style={styles.subAvatarText}>
                        {(sub as any).user?.username?.[0]?.toUpperCase() || '?'}
                    </Text>
                </View>
                <View style={styles.subInfo}>
                    <Text style={styles.subName}>{(sub as any).user?.full_name || (sub as any).user?.username}</Text>
                    <Text style={styles.subDate}>
                        {new Date(sub.submitted_at).toLocaleDateString('pt-PT')}
                        {sub.is_late && ' (atrasado)'}
                    </Text>
                </View>
                <View style={[styles.subStatus, { backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.subStatusText, { color: statusColor }]}>
                        {sub.score !== null ? `${sub.score}/${maxScore}` : 'Avaliar'}
                    </Text>
                </View>
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
        marginHorizontal: SPACING.md,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    analyticsBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Task Card
    taskCard: {
        backgroundColor: COLORS.surfaceElevated,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.full,
    },
    typeBadgeText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#6366F1',
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.full,
    },
    xpBadgeText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFD700',
    },
    taskTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    taskDescription: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        lineHeight: 22,
        marginBottom: SPACING.md,
    },
    dueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surfaceMuted,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.md,
    },
    dueRowOverdue: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    dueText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
    dueTextOverdue: {
        color: '#EF4444',
    },
    configList: {
        gap: SPACING.sm,
    },
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    configText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // Section
    section: {
        marginTop: SPACING.xl,
        paddingHorizontal: SPACING.lg,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },

    // Status Card
    statusCard: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderLeftWidth: 4,
        marginBottom: SPACING.md,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusText: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    scoreText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#22C55E',
    },
    fileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
    },
    fileLinkText: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.sm,
        color: '#6366F1',
    },
    feedbackBox: {
        marginTop: SPACING.md,
        padding: SPACING.md,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: RADIUS.lg,
    },
    feedbackLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: '#22C55E',
        fontWeight: TYPOGRAPHY.weight.semibold,
        marginBottom: SPACING.xs,
    },
    feedbackText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.primary,
    },

    // Submit Form
    submitForm: {
        gap: SPACING.lg,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surfaceElevated,
        padding: SPACING.md,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    uploadGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadText: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },
    inputGroup: {
        gap: SPACING.sm,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
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
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: '#6366F1',
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.xl,
    },
    submitButtonText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    lateWarning: {
        textAlign: 'center',
        fontSize: TYPOGRAPHY.size.sm,
        color: '#F59E0B',
    },

    // Closed Card
    closedCard: {
        alignItems: 'center',
        padding: SPACING['2xl'],
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        gap: SPACING.md,
    },
    closedText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
    },

    // Empty Card
    emptyCard: {
        alignItems: 'center',
        padding: SPACING['2xl'],
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        gap: SPACING.md,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
    },

    // Submission Card
    subCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    subAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subAvatarText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#6366F1',
    },
    subInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    subName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    subDate: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    subStatus: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
    },
    subStatusText: {
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
    gradingInfo: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
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
    gradingFile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.lg,
    },
    gradingFileName: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: '#6366F1',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginTop: SPACING.lg,
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
