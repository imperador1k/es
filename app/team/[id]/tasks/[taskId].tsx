/**
 * Task Detail Screen
 * Visualização da tarefa e sistema de entrega
 * Professor vê entregas, Aluno pode submeter
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface TeamMember {
    user_id: string;
    role: string;
}

// ============================================
// COMPONENT
// ============================================

export default function TaskDetailScreen() {
    const { id: teamId, taskId } = useLocalSearchParams<{ id: string; taskId: string }>();
    const { user } = useAuthContext();

    // State
    const [task, setTask] = useState<Task | null>(null);
    const [submission, setSubmission] = useState<TaskSubmission | null>(null);
    const [allSubmissions, setAllSubmissions] = useState<TaskSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isTeacher, setIsTeacher] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Submission form
    const [linkUrl, setLinkUrl] = useState('');
    const [comment, setComment] = useState('');
    const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string } | null>(null);

    // Grading modal
    const [gradingModalVisible, setGradingModalVisible] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState<TaskSubmission | null>(null);
    const [gradeScore, setGradeScore] = useState('');
    const [gradeFeedback, setGradeFeedback] = useState('');
    const [grading, setGrading] = useState(false);

    // Load data
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
            // Load task
            const taskData = await getTask(taskId);
            setTask(taskData);

            // Load user's submission
            const userSubmission = await getUserSubmission(taskId, user.id);
            setSubmission(userSubmission);

            // Load all submissions for teacher
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

            // Reload submissions if teacher
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
                type: task?.config?.allowed_file_types?.map(t => {
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
            setSelectedFile({
                uri: file.uri,
                name: file.name,
                type: file.mimeType || 'application/octet-stream',
            });
        } catch (err) {
            console.error('Error picking file:', err);
            Alert.alert('Erro', 'Não foi possível selecionar o ficheiro.');
        }
    };

    const handleSubmit = async () => {
        if (!task || !user?.id || !teamId) return;

        // Validate
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

            // Upload file if selected
            if (selectedFile) {
                const uploadResult = await uploadSubmissionFile(
                    teamId,
                    task.id,
                    user.id,
                    selectedFile
                );

                if (uploadResult) {
                    fileUrl = uploadResult.url;
                    fileName = selectedFile.name;
                    fileType = selectedFile.type;
                    // fileSize = selectedFile.size; // Not available from DocumentPicker
                }
            }

            // Submit
            const result = await submitTask(
                task.id,
                user.id,
                {
                    content: comment,
                    file_url: fileUrl || undefined,
                    file_name: fileName || undefined,
                    file_type: fileType || undefined,
                    file_size: fileSize || undefined,
                    link_url: linkUrl || undefined,
                },
                task.due_date || undefined
            );

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
            const success = await gradeSubmission(
                gradingSubmission.id,
                user.id,
                score,
                gradeFeedback
            );

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
    // RENDER HELPERS
    // ============================================

    const isOverdue = task?.due_date ? new Date() > new Date(task.due_date) : false;
    const canSubmit = !isOverdue || task?.config?.allow_late_submissions;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return colors.warning.primary;
            case 'graded': return colors.success.primary;
            case 'returned': return colors.danger.primary;
            default: return colors.text.tertiary;
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
    // RENDER
    // ============================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!task) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color={colors.text.tertiary} />
                    <Text style={styles.errorText}>Tarefa não encontrada</Text>
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
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {task.title}
                </Text>
                {isTeacher ? (
                    <Pressable
                        onPress={() => router.push(`/team/${teamId}/tasks/${taskId}/analytics` as any)}
                        style={styles.analyticsButton}
                    >
                        <Ionicons name="bar-chart" size={20} color={colors.accent.primary} />
                    </Pressable>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Task Info Card */}
                <View style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                        <View style={[styles.typeBadge, { backgroundColor: colors.accent.light }]}>
                            <Ionicons name="document-text" size={16} color={colors.accent.primary} />
                            <Text style={styles.typeBadgeText}>Tarefa</Text>
                        </View>
                        <View style={styles.xpBadge}>
                            <Ionicons name="flash" size={14} color={colors.warning.primary} />
                            <Text style={styles.xpBadgeText}>{task.xp_reward} XP</Text>
                        </View>
                    </View>

                    <Text style={styles.taskTitle}>{task.title}</Text>

                    {task.description && (
                        <Text style={styles.taskDescription}>{task.description}</Text>
                    )}

                    {/* Due Date */}
                    {task.due_date && (
                        <View style={[styles.dueDateRow, isOverdue && styles.dueDateOverdue]}>
                            <Ionicons
                                name="calendar"
                                size={18}
                                color={isOverdue ? colors.danger.primary : colors.text.secondary}
                            />
                            <Text style={[
                                styles.dueDateText,
                                isOverdue && styles.dueDateTextOverdue,
                            ]}>
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
                    <View style={styles.configInfo}>
                        {task.config?.requires_file_upload && (
                            <View style={styles.configItem}>
                                <Ionicons name="attach" size={16} color={colors.text.tertiary} />
                                <Text style={styles.configItemText}>
                                    Ficheiro obrigatório ({task.config.allowed_file_types?.join(', ')})
                                </Text>
                            </View>
                        )}
                        <View style={styles.configItem}>
                            <Ionicons name="star" size={16} color={colors.text.tertiary} />
                            <Text style={styles.configItemText}>
                                Nota máxima: {task.config?.max_score || 20}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Student View: Submission Form */}
                {!isTeacher && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📤 A Tua Entrega</Text>

                        {/* Current Submission Status */}
                        {submission && (
                            <View style={[styles.statusCard, { borderColor: getStatusColor(submission.status) }]}>
                                <View style={styles.statusHeader}>
                                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(submission.status) }]} />
                                    <Text style={styles.statusText}>{getStatusLabel(submission.status)}</Text>
                                    {submission.score !== null && (
                                        <Text style={styles.scoreText}>
                                            {submission.score}/{task.config?.max_score || 20}
                                        </Text>
                                    )}
                                </View>
                                {submission.file_name && (
                                    <Pressable
                                        style={styles.fileLink}
                                        onPress={() => Linking.openURL(submission.file_url!)}
                                    >
                                        <Ionicons name="document" size={18} color={colors.accent.primary} />
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

                        {/* Submission Form */}
                        {canSubmit && (!submission || submission.status !== 'graded') && (
                            <View style={styles.submitForm}>
                                {/* File Upload */}
                                <Pressable style={styles.uploadButton} onPress={handlePickFile}>
                                    <Ionicons
                                        name={selectedFile ? 'document' : 'cloud-upload-outline'}
                                        size={24}
                                        color={colors.accent.primary}
                                    />
                                    <Text style={styles.uploadButtonText}>
                                        {selectedFile ? selectedFile.name : 'Anexar Ficheiro'}
                                    </Text>
                                </Pressable>

                                {/* Link */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Link (opcional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={linkUrl}
                                        onChangeText={setLinkUrl}
                                        placeholder="https://..."
                                        placeholderTextColor={colors.text.tertiary}
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                </View>

                                {/* Comment */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Comentário (opcional)</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={comment}
                                        onChangeText={setComment}
                                        placeholder="Notas ou observações..."
                                        placeholderTextColor={colors.text.tertiary}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>

                                {/* Submit Button */}
                                <Pressable
                                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#FFF" />
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
                                    <Text style={styles.lateWarning}>
                                        ⚠️ Entrega em atraso
                                    </Text>
                                )}
                            </View>
                        )}

                        {!canSubmit && !submission && (
                            <View style={styles.closedCard}>
                                <Ionicons name="lock-closed" size={32} color={colors.text.tertiary} />
                                <Text style={styles.closedText}>
                                    O prazo de entrega terminou
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Teacher View: All Submissions */}
                {isTeacher && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            📋 Entregas ({allSubmissions.length})
                        </Text>

                        {allSubmissions.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="file-tray-outline" size={48} color={colors.text.tertiary} />
                                <Text style={styles.emptyText}>Nenhuma entrega ainda</Text>
                            </View>
                        ) : (
                            <View style={styles.submissionsList}>
                                {allSubmissions.map(sub => (
                                    <Pressable
                                        key={sub.id}
                                        style={styles.submissionCard}
                                        onPress={() => handleOpenGrading(sub)}
                                    >
                                        <View style={styles.submissionHeader}>
                                            <View style={styles.submissionUser}>
                                                <View style={styles.userAvatarSmall}>
                                                    <Text style={styles.userAvatarText}>
                                                        {(sub as any).user?.username?.[0]?.toUpperCase() || '?'}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.userName}>
                                                        {(sub as any).user?.full_name || (sub as any).user?.username}
                                                    </Text>
                                                    <Text style={styles.submittedAt}>
                                                        {new Date(sub.submitted_at).toLocaleDateString('pt-PT')}
                                                        {sub.is_late && ' (atrasado)'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[
                                                styles.submissionStatus,
                                                { backgroundColor: getStatusColor(sub.status) + '20' },
                                            ]}>
                                                <Text style={[
                                                    styles.submissionStatusText,
                                                    { color: getStatusColor(sub.status) },
                                                ]}>
                                                    {sub.score !== null
                                                        ? `${sub.score}/${task.config?.max_score || 20}`
                                                        : getStatusLabel(sub.status)}
                                                </Text>
                                            </View>
                                        </View>
                                        {sub.file_name && (
                                            <View style={styles.submissionFile}>
                                                <Ionicons name="attach" size={14} color={colors.text.tertiary} />
                                                <Text style={styles.submissionFileName}>{sub.file_name}</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                )}
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
                        <Text style={styles.modalTitle}>Avaliar</Text>
                        <Pressable onPress={handleGrade} disabled={grading}>
                            {grading ? (
                                <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                                <Text style={styles.modalSave}>Guardar</Text>
                            )}
                        </Pressable>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {gradingSubmission && (
                            <>
                                {/* Student Info */}
                                <View style={styles.gradingStudentInfo}>
                                    <Text style={styles.gradingStudentName}>
                                        {(gradingSubmission as any).user?.full_name}
                                    </Text>
                                    <Text style={styles.gradingSubmittedAt}>
                                        Entregue: {new Date(gradingSubmission.submitted_at).toLocaleString('pt-PT')}
                                    </Text>
                                </View>

                                {/* File Link */}
                                {gradingSubmission.file_url && (
                                    <Pressable
                                        style={styles.gradingFileLink}
                                        onPress={() => Linking.openURL(gradingSubmission.file_url!)}
                                    >
                                        <Ionicons name="document" size={24} color={colors.accent.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.gradingFileName}>
                                                {gradingSubmission.file_name}
                                            </Text>
                                            <Text style={styles.gradingFileAction}>
                                                Toca para abrir
                                            </Text>
                                        </View>
                                        <Ionicons name="open-outline" size={20} color={colors.text.tertiary} />
                                    </Pressable>
                                )}

                                {/* Link */}
                                {gradingSubmission.link_url && (
                                    <Pressable
                                        style={styles.gradingFileLink}
                                        onPress={() => Linking.openURL(gradingSubmission.link_url!)}
                                    >
                                        <Ionicons name="link" size={24} color={colors.accent.primary} />
                                        <Text style={styles.gradingLinkUrl}>
                                            {gradingSubmission.link_url}
                                        </Text>
                                    </Pressable>
                                )}

                                {/* Student Comment */}
                                {gradingSubmission.content && (
                                    <View style={styles.gradingComment}>
                                        <Text style={styles.gradingCommentLabel}>Comentário do aluno:</Text>
                                        <Text style={styles.gradingCommentText}>
                                            {gradingSubmission.content}
                                        </Text>
                                    </View>
                                )}

                                {/* Score */}
                                <View style={styles.gradeInputGroup}>
                                    <Text style={styles.gradeLabel}>
                                        Nota (0-{task?.config?.max_score || 20})
                                    </Text>
                                    <TextInput
                                        style={styles.gradeInput}
                                        value={gradeScore}
                                        onChangeText={setGradeScore}
                                        keyboardType="number-pad"
                                        placeholder="0"
                                        placeholderTextColor={colors.text.tertiary}
                                    />
                                </View>

                                {/* Feedback */}
                                <View style={styles.gradeInputGroup}>
                                    <Text style={styles.gradeLabel}>Feedback</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={gradeFeedback}
                                        onChangeText={setGradeFeedback}
                                        placeholder="Comentários sobre o trabalho..."
                                        placeholderTextColor={colors.text.tertiary}
                                        multiline
                                        numberOfLines={4}
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
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    errorText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        textAlign: 'center',
    },
    analyticsButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent.light,
        borderRadius: borderRadius.md,
    },

    // Content
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },

    // Task Card
    taskCard: {
        backgroundColor: colors.surface,
        margin: spacing.lg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.md,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    typeBadgeText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    xpBadgeText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.warning.primary,
    },
    taskTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    taskDescription: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        lineHeight: 22,
        marginBottom: spacing.md,
    },
    dueDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.background,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    dueDateOverdue: {
        backgroundColor: colors.danger.light,
    },
    dueDateText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    dueDateTextOverdue: {
        color: colors.danger.primary,
        fontWeight: typography.weight.medium,
    },
    configInfo: {
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        paddingTop: spacing.md,
        gap: spacing.xs,
    },
    configItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    configItemText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Section
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Status Card
    statusCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderLeftWidth: 4,
        marginBottom: spacing.md,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusText: {
        flex: 1,
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    scoreText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.success.primary,
    },
    fileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    fileLinkText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },
    feedbackBox: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    feedbackLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
        marginBottom: spacing.xs,
    },
    feedbackText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // Submit Form
    submitForm: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.xl,
        marginBottom: spacing.md,
    },
    uploadButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.success.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    lateWarning: {
        textAlign: 'center',
        fontSize: typography.size.sm,
        color: colors.warning.primary,
        marginTop: spacing.sm,
    },

    // Closed Card
    closedCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
    },
    closedText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },

    // Empty Card
    emptyCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
    },
    emptyText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },

    // Submissions List
    submissionsList: {
        gap: spacing.sm,
    },
    submissionCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    submissionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    submissionUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    userAvatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatarText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    userName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    submittedAt: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    submissionStatus: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    submissionStatusText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    submissionFile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    submissionFileName: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
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
        fontWeight: typography.weight.semibold,
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
    gradingStudentInfo: {
        marginBottom: spacing.lg,
    },
    gradingStudentName: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    gradingSubmittedAt: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    gradingFileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    gradingFileName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    gradingFileAction: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },
    gradingLinkUrl: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },
    gradingComment: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    gradingCommentLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
        marginBottom: spacing.xs,
    },
    gradingCommentText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    gradeInputGroup: {
        marginBottom: spacing.lg,
    },
    gradeLabel: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    gradeInput: {
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
    },
});
