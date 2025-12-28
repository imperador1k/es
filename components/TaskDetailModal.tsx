/**
 * TaskDetailModal Component v2
 * Shows task details and allows completing/submitting
 * Uses task_submissions for team tasks (proper grading system)
 * Uses personal_todos toggle for personal tasks
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

// ============================================
// TYPES
// ============================================

interface TaskDetailModalProps {
    visible: boolean;
    onClose: () => void;
    onUpdate: () => void;
    task: {
        id: string;
        type: 'task' | 'todo';
        title: string;
        description: string | null;
        due_date: string | null;
        is_completed: boolean;
        priority?: 'low' | 'medium' | 'high';
        team_name?: string;
        team_color?: string;
        team_id?: string;
    } | null;
}

// ============================================
// COMPONENT
// ============================================

export function TaskDetailModal({ visible, onClose, onUpdate, task }: TaskDetailModalProps) {
    const { user } = useAuthContext();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [comment, setComment] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

    if (!task) return null;

    const isTeamTask = task.type === 'task';
    const isPending = !task.is_completed;

    // Format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Sem data';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Priority colors
    const priorityConfig = {
        low: { color: '#10B981', label: 'Baixa' },
        medium: { color: '#F59E0B', label: 'Média' },
        high: { color: '#EF4444', label: 'Alta' },
    };

    // Check if overdue
    const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;

    // ============================================
    // PERSONAL TODO: Toggle completion
    // ============================================

    const handleToggleTodo = async () => {
        if (!user?.id || task.type !== 'todo') return;

        setLoading(true);
        try {
            const { error } = await supabase.rpc('toggle_todo_completion', {
                p_todo_id: task.id,
            });

            if (error) throw error;

            onUpdate();
            onClose();
        } catch (err: any) {
            Alert.alert('Erro', err.message || 'Não foi possível atualizar');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // TEAM TASK: Pick file
    // ============================================

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets[0]) return;

            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.name,
                mimeType: asset.mimeType || 'application/octet-stream',
            });
        } catch (err) {
            console.error('Pick file error:', err);
        }
    };

    // ============================================
    // TEAM TASK: Submit (file + link + comment)
    // ============================================

    const handleSubmit = async () => {
        if (!user?.id || task.type !== 'task') return;

        // At least file, link, or just mark as done
        setLoading(true);
        try {
            let fileUrl: string | null = null;
            let fileName: string | null = null;
            let fileType: string | null = null;

            // Upload file if selected
            if (selectedFile) {
                setUploading(true);

                const base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, {
                    encoding: 'base64',
                });

                const ext = selectedFile.name.split('.').pop() || 'file';
                const path = `${task.id}/${user.id}/${Date.now()}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from('task-submissions')
                    .upload(path, decode(base64Data), {
                        contentType: selectedFile.mimeType,
                    });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('task-submissions')
                    .getPublicUrl(path);

                fileUrl = urlData.publicUrl;
                fileName = selectedFile.name;
                fileType = selectedFile.mimeType;
                setUploading(false);
            }

            // Insert/update submission
            const { error: submitError } = await supabase
                .from('task_submissions')
                .upsert({
                    task_id: task.id,
                    user_id: user.id,
                    file_url: fileUrl,
                    file_name: fileName,
                    file_type: fileType,
                    link_url: linkUrl.trim() || null,
                    content: comment.trim() || null,
                    status: 'submitted',
                    submitted_at: new Date().toISOString(),
                    is_late: isOverdue,
                }, {
                    onConflict: 'task_id,user_id',
                });

            if (submitError) throw submitError;

            Alert.alert('Sucesso', 'Tarefa entregue com sucesso! ✅');
            setSelectedFile(null);
            setLinkUrl('');
            setComment('');
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Submit error:', err);
            Alert.alert('Erro', err.message || 'Erro ao submeter');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    // ============================================
    // TEAM TASK: Quick complete (no file)
    // ============================================

    const handleQuickComplete = async () => {
        if (!user?.id || task.type !== 'task') return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('task_submissions')
                .upsert({
                    task_id: task.id,
                    user_id: user.id,
                    status: 'submitted',
                    content: comment.trim() || 'Marcado como concluído',
                    submitted_at: new Date().toISOString(),
                    is_late: isOverdue,
                }, {
                    onConflict: 'task_id,user_id',
                });

            if (error) throw error;

            Alert.alert('Sucesso', 'Tarefa marcada como concluída!');
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Complete error:', err);
            Alert.alert('Erro', err.message || 'Erro ao completar');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text.primary} />
                        </Pressable>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerType}>
                                {isTeamTask ? '📋 Tarefa de Equipa' : '✓ Tarefa Pessoal'}
                            </Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Title */}
                        <Text style={styles.title}>{task.title}</Text>

                        {/* Status Badges */}
                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: task.is_completed ? '#10B98120' : isOverdue ? '#EF444420' : '#F59E0B20' }
                            ]}>
                                <Ionicons
                                    name={task.is_completed ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time'}
                                    size={16}
                                    color={task.is_completed ? '#10B981' : isOverdue ? '#EF4444' : '#F59E0B'}
                                />
                                <Text style={[
                                    styles.statusText,
                                    { color: task.is_completed ? '#10B981' : isOverdue ? '#EF4444' : '#F59E0B' }
                                ]}>
                                    {task.is_completed ? 'Concluída' : isOverdue ? 'Atrasada' : 'Pendente'}
                                </Text>
                            </View>

                            {task.priority && (
                                <View style={[styles.priorityBadge, { backgroundColor: priorityConfig[task.priority].color + '20' }]}>
                                    <View style={[styles.priorityDot, { backgroundColor: priorityConfig[task.priority].color }]} />
                                    <Text style={[styles.priorityText, { color: priorityConfig[task.priority].color }]}>
                                        {priorityConfig[task.priority].label}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Team Badge */}
                        {task.team_name && (
                            <View style={styles.infoRow}>
                                <Ionicons name="people" size={18} color={task.team_color || colors.text.tertiary} />
                                <Text style={[styles.infoText, { color: task.team_color || colors.text.secondary }]}>
                                    {task.team_name}
                                </Text>
                            </View>
                        )}

                        {/* Due Date */}
                        <View style={styles.infoRow}>
                            <Ionicons name="calendar" size={18} color={isOverdue ? '#EF4444' : colors.text.tertiary} />
                            <Text style={[styles.infoText, isOverdue && { color: '#EF4444', fontWeight: '600' }]}>
                                {formatDate(task.due_date)}
                            </Text>
                        </View>

                        {/* Description */}
                        {task.description && (
                            <View style={styles.descriptionSection}>
                                <Text style={styles.sectionLabel}>Descrição</Text>
                                <Text style={styles.description}>{task.description}</Text>
                            </View>
                        )}

                        {/* Submission Form (for team tasks) */}
                        {isTeamTask && isPending && (
                            <View style={styles.submissionForm}>
                                <Text style={styles.sectionLabel}>Entrega</Text>

                                {/* File picker */}
                                <Pressable style={styles.fileButton} onPress={handlePickFile}>
                                    <Ionicons
                                        name={selectedFile ? 'document-attach' : 'cloud-upload-outline'}
                                        size={24}
                                        color={selectedFile ? '#10B981' : colors.accent.primary}
                                    />
                                    <Text style={[styles.fileButtonText, selectedFile && { color: '#10B981' }]}>
                                        {selectedFile ? selectedFile.name : 'Anexar ficheiro (opcional)'}
                                    </Text>
                                    {selectedFile && (
                                        <Pressable onPress={() => setSelectedFile(null)}>
                                            <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                                        </Pressable>
                                    )}
                                </Pressable>

                                {/* Link input */}
                                <View style={styles.linkInputContainer}>
                                    <Ionicons name="link-outline" size={20} color={colors.text.tertiary} />
                                    <TextInput
                                        style={styles.linkInput}
                                        placeholder="Adicionar link (opcional)"
                                        placeholderTextColor={colors.text.tertiary}
                                        value={linkUrl}
                                        onChangeText={setLinkUrl}
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                </View>

                                {/* Comment */}
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Comentário ou nota (opcional)"
                                    placeholderTextColor={colors.text.tertiary}
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                    numberOfLines={3}
                                />

                                {/* Late warning */}
                                {isOverdue && (
                                    <View style={styles.lateWarning}>
                                        <Ionicons name="warning" size={16} color="#EF4444" />
                                        <Text style={styles.lateWarningText}>
                                            Esta entrega será marcada como atrasada
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Spacer */}
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Action Buttons */}
                    {isPending && (
                        <View style={styles.actions}>
                            {isTeamTask ? (
                                <>
                                    {/* Submit with file/link */}
                                    {(selectedFile || linkUrl.trim()) ? (
                                        <Pressable
                                            style={styles.submitButton}
                                            onPress={handleSubmit}
                                            disabled={loading || uploading}
                                        >
                                            {(loading || uploading) ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <>
                                                    <Ionicons name="paper-plane" size={20} color="#FFF" />
                                                    <Text style={styles.submitButtonText}>Entregar</Text>
                                                </>
                                            )}
                                        </Pressable>
                                    ) : (
                                        /* Quick complete */
                                        <Pressable
                                            style={styles.completeButton}
                                            onPress={handleQuickComplete}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <>
                                                    <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                                    <Text style={styles.completeButtonText}>Marcar como Feita</Text>
                                                </>
                                            )}
                                        </Pressable>
                                    )}
                                </>
                            ) : (
                                /* Personal Todo: Toggle */
                                <Pressable
                                    style={styles.completeButton}
                                    onPress={handleToggleTodo}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                            <Text style={styles.completeButtonText}>Concluir Tarefa</Text>
                                        </>
                                    )}
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* Already completed message */}
                    {!isPending && (
                        <View style={styles.completedMessage}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            <Text style={styles.completedText}>Esta tarefa já foi concluída!</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerType: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        fontWeight: typography.weight.medium,
    },
    content: {
        padding: spacing.lg,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    statusRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    statusText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    infoText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    descriptionSection: {
        marginTop: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
    },
    sectionLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.tertiary,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        lineHeight: 24,
    },
    submissionForm: {
        marginTop: spacing.lg,
    },
    fileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    fileButtonText: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    linkInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    linkInput: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
        paddingVertical: spacing.md,
    },
    commentInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    lateWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        backgroundColor: '#EF444410',
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
    },
    lateWarningText: {
        fontSize: typography.size.sm,
        color: '#EF4444',
    },
    actions: {
        padding: spacing.lg,
        paddingTop: 0,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        ...shadows.md,
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
        padding: spacing.md,
        backgroundColor: '#10B981',
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    completeButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    completedMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
        backgroundColor: '#10B98110',
        margin: spacing.lg,
        marginTop: 0,
        borderRadius: borderRadius.lg,
    },
    completedText: {
        fontSize: typography.size.base,
        color: '#10B981',
        fontWeight: typography.weight.medium,
    },
});
