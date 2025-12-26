/**
 * Task Detail Screen
 * Ecrã adaptativo para tarefas pessoais e de equipa
 * Personal: Checklist simples | Team: Sistema de entregas
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface TaskDetail {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    is_completed: boolean;
    xp_reward: number;
    type: string;
    config: {
        requires_file_upload?: boolean;
        allowed_file_types?: string[];
        max_score?: number;
        allow_late_submissions?: boolean;
    } | null;
    team_id: string | null;
    team?: {
        id: string;
        name: string;
        color: string;
    };
    created_at: string;
}

interface Submission {
    id: string;
    status: 'draft' | 'submitted' | 'graded' | 'returned';
    content: string | null;
    file_url: string | null;
    file_name: string | null;
    link_url: string | null;
    score: number | null;
    feedback: string | null;
    submitted_at: string;
    graded_at: string | null;
}

// ============================================
// COMPONENT
// ============================================

export default function TaskDetailScreen() {
    const { id: taskId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();

    // State
    const [task, setTask] = useState<TaskDetail | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [selectedFile, setSelectedFile] = useState<{
        uri: string;
        name: string;
        type: string;
    } | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [comment, setComment] = useState('');

    // Fetch data
    useEffect(() => {
        if (taskId && user?.id) {
            fetchTask();
        }
    }, [taskId, user?.id]);

    const fetchTask = async () => {
        if (!taskId || !user?.id) return;

        try {
            setLoading(true);

            // Fetch task
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select(`
                    *,
                    team:teams(id, name, color)
                `)
                .eq('id', taskId)
                .single();

            if (taskError) throw taskError;
            setTask(taskData);

            // If team task, fetch submission
            if (taskData.team_id) {
                const { data: subData } = await supabase
                    .from('task_submissions')
                    .select('*')
                    .eq('task_id', taskId)
                    .eq('user_id', user.id)
                    .single();

                if (subData) {
                    setSubmission(subData);
                    setComment(subData.content || '');
                    setLinkUrl(subData.link_url || '');
                }
            }
        } catch (err) {
            console.error('Error fetching task:', err);
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // HANDLERS
    // ============================================

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: task?.config?.allowed_file_types?.map(t => {
                    const mimeMap: Record<string, string> = {
                        pdf: 'application/pdf',
                        jpg: 'image/jpeg',
                        png: 'image/png',
                        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    };
                    return mimeMap[t] || '*/*';
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

    const uploadFile = async (): Promise<string | null> => {
        if (!selectedFile || !task || !user?.id) return null;

        try {
            const fileName = `${task.team_id}/${task.id}/${user.id}/${Date.now()}_${selectedFile.name}`;

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
                encoding: 'base64',
            });

            // Upload to Supabase Storage
            const { error } = await supabase.storage
                .from('task-submissions')
                .upload(fileName, decode(base64), {
                    contentType: selectedFile.type,
                    upsert: true,
                });

            if (error) throw error;

            // Get public URL
            const { data } = supabase.storage
                .from('task-submissions')
                .getPublicUrl(fileName);

            return data.publicUrl;
        } catch (err) {
            console.error('Upload error:', err);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!task || !user?.id) return;

        // Validate
        if (task.config?.requires_file_upload && !selectedFile && !submission?.file_url) {
            Alert.alert('Atenção', 'É obrigatório anexar um ficheiro.');
            return;
        }

        setSubmitting(true);
        try {
            let fileUrl = submission?.file_url || null;
            let fileName = submission?.file_name || null;

            // Upload new file if selected
            if (selectedFile) {
                const uploadedUrl = await uploadFile();
                if (uploadedUrl) {
                    fileUrl = uploadedUrl;
                    fileName = selectedFile.name;
                }
            }

            // Use secure RPC for submission (validates assignment, deadlines server-side)
            const { data, error } = await supabase.rpc('submit_task', {
                p_task_id: task.id,
                p_content: comment || null,
                p_file_url: fileUrl,
                p_file_name: fileName,
                p_file_type: selectedFile?.type || null,
                p_file_size: null, // Size not available from picker
            });

            if (error) throw error;

            const result = data as { success: boolean; is_late: boolean; message: string };
            const lateMsg = result.is_late ? ' (Entrega atrasada)' : '';

            Alert.alert('✅ Entregue!', `O teu trabalho foi submetido com sucesso.${lateMsg}`, [
                { text: 'OK', onPress: () => fetchTask() },
            ]);
            setSelectedFile(null);
        } catch (err: any) {
            console.error('Submit error:', err);
            Alert.alert('Erro', err?.message || 'Não foi possível submeter.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCompletePersonal = async () => {
        if (!task || !user?.id) return;

        Alert.alert(
            'Marcar como Concluída?',
            'Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Concluir',
                    onPress: async () => {
                        try {
                            // Use secure RPC (validates ownership, awards XP server-side)
                            const { data, error } = await supabase.rpc('complete_personal_task', {
                                p_task_id: task.id,
                            });

                            if (error) throw error;

                            const result = data as { success: boolean; xp_awarded: number; message: string };

                            if (!result.success) {
                                Alert.alert('Aviso', result.message);
                                return;
                            }

                            Alert.alert('🎉 Tarefa Concluída!', `Ganhaste ${result.xp_awarded} XP!`, [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (err: any) {
                            console.error('Complete error:', err);
                            Alert.alert('Erro', err?.message || 'Não foi possível concluir.');
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // HELPERS
    // ============================================

    const isTeamTask = task?.team_id !== null;
    const isOverdue = task?.due_date ? new Date() > new Date(task.due_date) : false;
    const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded';
    const isGraded = submission?.status === 'graded';

    const getStatusInfo = () => {
        if (!isTeamTask) {
            return task?.is_completed
                ? { label: 'Concluída', color: colors.success.primary, icon: 'checkmark-circle' }
                : { label: 'Pendente', color: colors.text.tertiary, icon: 'ellipse-outline' };
        }

        switch (submission?.status) {
            case 'submitted':
                return { label: 'Entregue', color: colors.warning.primary, icon: 'hourglass' };
            case 'graded':
                return { label: 'Avaliado', color: colors.success.primary, icon: 'checkmark-done' };
            case 'returned':
                return { label: 'Devolvido', color: colors.danger.primary, icon: 'refresh' };
            default:
                return isOverdue
                    ? { label: 'Atrasado', color: colors.danger.primary, icon: 'alert-circle' }
                    : { label: 'Por Entregar', color: colors.accent.primary, icon: 'document-text' };
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

    const statusInfo = getStatusInfo();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </Pressable>
                <View style={[styles.statusPill, { backgroundColor: statusInfo.color + '20' }]}>
                    <Ionicons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
                    <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Task Info */}
                <View style={styles.taskInfo}>
                    {/* Team Badge */}
                    {isTeamTask && task.team && (
                        <View style={[styles.teamBadge, { backgroundColor: task.team.color || colors.accent.primary }]}>
                            <Ionicons name="people" size={14} color="#FFF" />
                            <Text style={styles.teamBadgeText}>{task.team.name}</Text>
                        </View>
                    )}

                    {/* Title */}
                    <Text style={styles.taskTitle}>{task.title}</Text>

                    {/* Meta Row */}
                    <View style={styles.metaRow}>
                        {/* Due Date */}
                        <View style={[styles.metaItem, isOverdue && styles.metaItemOverdue]}>
                            <Ionicons
                                name="calendar"
                                size={18}
                                color={isOverdue ? colors.danger.primary : colors.text.secondary}
                            />
                            <Text style={[
                                styles.metaText,
                                isOverdue && styles.metaTextOverdue,
                            ]}>
                                {task.due_date
                                    ? new Date(task.due_date).toLocaleDateString('pt-PT', {
                                        day: '2-digit',
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : 'Sem prazo'}
                            </Text>
                        </View>

                        {/* XP */}
                        <View style={styles.xpBadge}>
                            <Ionicons name="flash" size={16} color={colors.warning.primary} />
                            <Text style={styles.xpText}>{task.xp_reward} XP</Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {task.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📋 Descrição</Text>
                        <View style={styles.descriptionCard}>
                            <Text style={styles.descriptionText}>{task.description}</Text>
                        </View>
                    </View>
                )}

                {/* TEAM TASK: Submission Section */}
                {isTeamTask && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📤 A Minha Entrega</Text>

                        {/* Already Graded */}
                        {isGraded && (
                            <View style={styles.gradedCard}>
                                <View style={styles.gradedHeader}>
                                    <Ionicons name="checkmark-done-circle" size={32} color={colors.success.primary} />
                                    <View style={styles.gradedInfo}>
                                        <Text style={styles.gradedLabel}>Nota Atribuída</Text>
                                        <Text style={styles.gradedScore}>
                                            {submission?.score}/{task.config?.max_score || 20}
                                        </Text>
                                    </View>
                                </View>
                                {submission?.feedback && (
                                    <View style={styles.feedbackBox}>
                                        <Text style={styles.feedbackLabel}>Feedback do Professor:</Text>
                                        <Text style={styles.feedbackText}>{submission.feedback}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Already Submitted - Show what was sent */}
                        {isSubmitted && !isGraded && (
                            <View style={styles.submittedCard}>
                                <View style={styles.submittedHeader}>
                                    <Ionicons name="hourglass" size={24} color={colors.warning.primary} />
                                    <Text style={styles.submittedText}>
                                        Aguarda avaliação do professor
                                    </Text>
                                </View>
                                {submission?.file_name && (
                                    <Pressable
                                        style={styles.fileLink}
                                        onPress={() => Linking.openURL(submission.file_url!)}
                                    >
                                        <Ionicons name="document" size={20} color={colors.accent.primary} />
                                        <Text style={styles.fileLinkText}>{submission.file_name}</Text>
                                        <Ionicons name="open-outline" size={16} color={colors.text.tertiary} />
                                    </Pressable>
                                )}
                            </View>
                        )}

                        {/* Submission Form */}
                        {!isGraded && (
                            <View style={styles.submitForm}>
                                {/* File Upload */}
                                <Pressable style={styles.uploadButton} onPress={handlePickFile}>
                                    <View style={styles.uploadIconBox}>
                                        <Ionicons
                                            name={selectedFile ? 'document' : 'cloud-upload-outline'}
                                            size={28}
                                            color={selectedFile ? colors.success.primary : colors.accent.primary}
                                        />
                                    </View>
                                    <View style={styles.uploadContent}>
                                        <Text style={styles.uploadTitle}>
                                            {selectedFile ? selectedFile.name : 'Adicionar Ficheiro'}
                                        </Text>
                                        <Text style={styles.uploadSubtitle}>
                                            {selectedFile
                                                ? 'Toca para alterar'
                                                : task.config?.allowed_file_types?.join(', ').toUpperCase() || 'Qualquer tipo'}
                                        </Text>
                                    </View>
                                    {selectedFile && (
                                        <Pressable onPress={() => setSelectedFile(null)}>
                                            <Ionicons name="close-circle" size={24} color={colors.text.tertiary} />
                                        </Pressable>
                                    )}
                                </Pressable>

                                {task.config?.requires_file_upload && (
                                    <Text style={styles.requiredNote}>* Ficheiro obrigatório</Text>
                                )}

                                {/* Link */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Link (opcional)</Text>
                                    <View style={styles.inputWithIcon}>
                                        <Ionicons name="link" size={20} color={colors.text.tertiary} />
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
                                </View>

                                {/* Comment */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Comentário (opcional)</Text>
                                    <TextInput
                                        style={[styles.textInput, styles.textArea]}
                                        value={comment}
                                        onChangeText={setComment}
                                        placeholder="Notas ou observações..."
                                        placeholderTextColor={colors.text.tertiary}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* PERSONAL TASK: Simple checklist */}
                {!isTeamTask && !task.is_completed && (
                    <View style={styles.section}>
                        <View style={styles.personalCard}>
                            <Ionicons name="checkbox-outline" size={48} color={colors.accent.primary} />
                            <Text style={styles.personalText}>
                                Esta é uma tarefa pessoal.
                                {'\n'}Marca como concluída quando terminares.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Completed Personal Task */}
                {!isTeamTask && task.is_completed && (
                    <View style={styles.section}>
                        <View style={styles.completedCard}>
                            <Ionicons name="checkmark-circle" size={48} color={colors.success.primary} />
                            <Text style={styles.completedText}>
                                Tarefa concluída!
                                {'\n'}Ganhaste {task.xp_reward} XP 🎉
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Footer */}
            {!isGraded && !task.is_completed && (
                <View style={styles.footer}>
                    {isTeamTask ? (
                        <Pressable
                            style={[styles.submitButton, submitting && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color="#FFF" />
                                    <Text style={styles.submitButtonText}>
                                        {isSubmitted ? 'Atualizar Entrega' : 'Entregar Trabalho'}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    ) : (
                        <Pressable style={styles.completeButton} onPress={handleCompletePersonal}>
                            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                            <Text style={styles.completeButtonText}>Marcar como Concluída</Text>
                        </Pressable>
                    )}
                </View>
            )}
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
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    statusPillText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },

    // Task Info
    taskInfo: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    teamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    teamBadgeText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    taskTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    metaItemOverdue: {
        // No additional styles needed
    },
    metaText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    metaTextOverdue: {
        color: colors.danger.primary,
        fontWeight: typography.weight.medium,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.warning.light,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    xpText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.warning.primary,
    },

    // Section
    section: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Description
    descriptionCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.sm,
    },
    descriptionText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        lineHeight: 24,
    },

    // Graded Card
    gradedCard: {
        backgroundColor: colors.success.light,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 2,
        borderColor: colors.success.primary,
    },
    gradedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    gradedInfo: {
        flex: 1,
    },
    gradedLabel: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    gradedScore: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.success.primary,
    },
    feedbackBox: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.success.primary + '40',
    },
    feedbackLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    feedbackText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        fontStyle: 'italic',
    },

    // Submitted Card
    submittedCard: {
        backgroundColor: colors.warning.light,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    submittedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    submittedText: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    fileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    fileLinkText: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.accent.primary,
    },

    // Submit Form
    submitForm: {
        gap: spacing.md,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        borderWidth: 2,
        borderColor: colors.divider,
        borderStyle: 'dashed',
    },
    uploadIconBox: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent.light,
        borderRadius: borderRadius.lg,
    },
    uploadContent: {
        flex: 1,
    },
    uploadTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    uploadSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    requiredNote: {
        fontSize: typography.size.sm,
        color: colors.danger.primary,
        marginTop: -spacing.sm,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
    },
    input: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
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
        minHeight: 100,
    },

    // Personal Card
    personalCard: {
        alignItems: 'center',
        backgroundColor: colors.accent.light,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        gap: spacing.md,
    },
    personalText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Completed Card
    completedCard: {
        alignItems: 'center',
        backgroundColor: colors.success.light,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        gap: spacing.md,
    },
    completedText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.lg,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    submitButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.success.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    completeButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
