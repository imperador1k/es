/**
 * TaskDetailModal - TripGlide Premium Design
 * Beautiful, modern, premium task details
 */

import { supabase } from '@/lib/supabase';
import { useAlert } from '@/providers/AlertProvider'; // Added
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const insets = useSafeAreaInsets();
    const { user } = useAuthContext();
    const { showAlert } = useAlert(); // Added
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
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Priority config
    const priorityConfig = {
        low: { color: '#10B981', gradient: ['#10B981', '#34D399'] as [string, string], label: 'Baixa', icon: 'arrow-down' },
        medium: { color: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] as [string, string], label: 'Média', icon: 'remove' },
        high: { color: '#EF4444', gradient: ['#EF4444', '#F87171'] as [string, string], label: 'Alta', icon: 'arrow-up' },
    };

    const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;

    // ============================================
    // HANDLERS
    // ============================================

    const handleToggleTodo = async () => {
        if (!user?.id || task.type !== 'todo') return;
        setLoading(true);
        try {
            const { error } = await supabase.rpc('toggle_todo_completion', { p_todo_id: task.id });
            if (error) throw error;
            onUpdate();
            onClose();
        } catch (err: any) {
            showAlert({ title: 'Erro', message: err.message || 'Não foi possível atualizar' });
        } finally {
            setLoading(false);
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (result.canceled || !result.assets[0]) return;
            const asset = result.assets[0];
            setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream' });
        } catch (err) {
            console.error('Pick file error:', err);
        }
    };

    const handleSubmit = async () => {
        if (!user?.id || task.type !== 'task') return;
        setLoading(true);
        try {
            let fileUrl: string | null = null;
            let fileName: string | null = null;
            let fileType: string | null = null;

            if (selectedFile) {
                setUploading(true);
                const base64Data = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: 'base64' });
                const ext = selectedFile.name.split('.').pop() || 'file';
                const path = `${task.id}/${user.id}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('task-submissions').upload(path, decode(base64Data), { contentType: selectedFile.mimeType });
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage.from('task-submissions').getPublicUrl(path);
                fileUrl = urlData.publicUrl;
                fileName = selectedFile.name;
                fileType = selectedFile.mimeType;
                setUploading(false);
            }

            const { error: submitError } = await supabase.from('task_submissions').upsert({
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
            }, { onConflict: 'task_id,user_id' });

            if (submitError) throw submitError;
            showAlert({ title: 'Sucesso', message: 'Tarefa entregue! ✅' });
            setSelectedFile(null);
            setLinkUrl('');
            setComment('');
            onUpdate();
            onClose();
        } catch (err: any) {
            showAlert({ title: 'Erro', message: err.message || 'Erro ao submeter' });
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const handleQuickComplete = async () => {
        if (!user?.id || task.type !== 'task') return;
        setLoading(true);
        try {
            const { error } = await supabase.from('task_submissions').upsert({
                task_id: task.id,
                user_id: user.id,
                status: 'submitted',
                content: comment.trim() || 'Marcado como concluído',
                submitted_at: new Date().toISOString(),
                is_late: isOverdue,
            }, { onConflict: 'task_id,user_id' });
            if (error) throw error;
            showAlert({ title: 'Sucesso', message: 'Tarefa concluída!' });
            onUpdate();
            onClose();
        } catch (err: any) {
            showAlert({ title: 'Erro', message: err.message || 'Erro ao completar' });
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
                    {/* Handle */}
                    <View style={styles.handleArea}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header with gradient */}
                    <View style={styles.header}>
                        <View style={styles.headerTop}>
                            <View style={[styles.typeBadge, { backgroundColor: isTeamTask ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)' }]}>
                                <Ionicons
                                    name={isTeamTask ? 'people' : 'person'}
                                    size={14}
                                    color={isTeamTask ? '#818CF8' : '#10B981'}
                                />
                                <Text style={[styles.typeBadgeText, { color: isTeamTask ? '#818CF8' : '#10B981' }]}>
                                    {isTeamTask ? 'Equipa' : 'Pessoal'}
                                </Text>
                            </View>

                            <Pressable onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
                            </Pressable>
                        </View>

                        <Text style={styles.title}>{task.title}</Text>

                        {/* Status Row */}
                        <View style={styles.statusRow}>
                            {/* Status Badge */}
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: task.is_completed ? 'rgba(16,185,129,0.15)' : isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: task.is_completed ? '#10B981' : isOverdue ? '#EF4444' : '#F59E0B' }
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    { color: task.is_completed ? '#10B981' : isOverdue ? '#EF4444' : '#F59E0B' }
                                ]}>
                                    {task.is_completed ? 'Concluída' : isOverdue ? 'Atrasada' : 'Pendente'}
                                </Text>
                            </View>

                            {/* Priority Badge */}
                            {task.priority && (
                                <View style={[styles.priorityBadge, { backgroundColor: priorityConfig[task.priority].color + '20' }]}>
                                    <Ionicons name={priorityConfig[task.priority].icon as any} size={12} color={priorityConfig[task.priority].color} />
                                    <Text style={[styles.priorityText, { color: priorityConfig[task.priority].color }]}>
                                        {priorityConfig[task.priority].label}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Info Cards */}
                        <View style={styles.infoCards}>
                            {/* Team */}
                            {task.team_name && (
                                <View style={styles.infoCard}>
                                    <View style={[styles.infoCardIcon, { backgroundColor: (task.team_color || '#6366F1') + '20' }]}>
                                        <Ionicons name="people" size={18} color={task.team_color || '#6366F1'} />
                                    </View>
                                    <View>
                                        <Text style={styles.infoCardLabel}>Equipa</Text>
                                        <Text style={styles.infoCardValue}>{task.team_name}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Due Date */}
                            <View style={styles.infoCard}>
                                <View style={[styles.infoCardIcon, { backgroundColor: isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)' }]}>
                                    <Ionicons name="calendar" size={18} color={isOverdue ? '#EF4444' : '#3B82F6'} />
                                </View>
                                <View>
                                    <Text style={styles.infoCardLabel}>Prazo</Text>
                                    <Text style={[styles.infoCardValue, isOverdue && { color: '#EF4444' }]}>
                                        {formatDate(task.due_date)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Description */}
                        {task.description && (
                            <View style={styles.descriptionCard}>
                                <Text style={styles.sectionTitle}>Descrição</Text>
                                <Text style={styles.descriptionText}>{task.description}</Text>
                            </View>
                        )}

                        {/* Submission Form for Team Tasks */}
                        {isTeamTask && isPending && (
                            <View style={styles.submissionSection}>
                                <Text style={styles.sectionTitle}>Entrega</Text>

                                {/* File Upload */}
                                <Pressable style={styles.uploadButton} onPress={handlePickFile}>
                                    <LinearGradient
                                        colors={selectedFile ? ['#10B981', '#34D399'] : ['rgba(99,102,241,0.1)', 'rgba(139,92,246,0.1)']}
                                        style={styles.uploadButtonGradient}
                                    >
                                        <Ionicons
                                            name={selectedFile ? 'checkmark-circle' : 'cloud-upload'}
                                            size={24}
                                            color={selectedFile ? '#FFF' : '#818CF8'}
                                        />
                                        <View style={styles.uploadTextContainer}>
                                            <Text style={[styles.uploadButtonText, selectedFile && { color: '#FFF' }]}>
                                                {selectedFile ? selectedFile.name : 'Carregar ficheiro'}
                                            </Text>
                                            <Text style={[styles.uploadButtonHint, selectedFile && { color: 'rgba(255,255,255,0.7)' }]}>
                                                {selectedFile ? 'Toca para mudar' : 'PDF, DOC, imagens...'}
                                            </Text>
                                        </View>
                                        {selectedFile && (
                                            <Pressable onPress={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                                                <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.7)" />
                                            </Pressable>
                                        )}
                                    </LinearGradient>
                                </Pressable>

                                {/* Link Input */}
                                <View style={styles.inputCard}>
                                    <Ionicons name="link" size={20} color="rgba(255,255,255,0.4)" />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Adicionar link (opcional)"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={linkUrl}
                                        onChangeText={setLinkUrl}
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                </View>

                                {/* Comment */}
                                <View style={[styles.inputCard, { alignItems: 'flex-start' }]}>
                                    <Ionicons name="chatbubble" size={20} color="rgba(255,255,255,0.4)" style={{ marginTop: 2 }} />
                                    <TextInput
                                        style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                                        placeholder="Comentário (opcional)"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={comment}
                                        onChangeText={setComment}
                                        multiline
                                    />
                                </View>

                                {/* Late Warning */}
                                {isOverdue && (
                                    <View style={styles.warningCard}>
                                        <Ionicons name="warning" size={18} color="#EF4444" />
                                        <Text style={styles.warningText}>Esta entrega será marcada como atrasada</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={{ height: 120 }} />
                    </ScrollView>

                    {/* Action Button */}
                    {isPending && (
                        <View style={styles.actionContainer}>
                            {isTeamTask ? (
                                <Pressable
                                    style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                                    onPress={selectedFile || linkUrl.trim() ? handleSubmit : handleQuickComplete}
                                    disabled={loading || uploading}
                                >
                                    <LinearGradient
                                        colors={selectedFile || linkUrl.trim() ? ['#6366F1', '#8B5CF6'] : ['#10B981', '#34D399']}
                                        style={styles.actionButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {(loading || uploading) ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons
                                                    name={selectedFile || linkUrl.trim() ? 'paper-plane' : 'checkmark-done'}
                                                    size={20}
                                                    color="#FFF"
                                                />
                                                <Text style={styles.actionButtonText}>
                                                    {selectedFile || linkUrl.trim() ? 'Entregar' : 'Marcar como Feita'}
                                                </Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                                    onPress={handleToggleTodo}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#34D399']}
                                        style={styles.actionButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                                <Text style={styles.actionButtonText}>Concluir Tarefa</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* Completed State */}
                    {!isPending && (
                        <View style={styles.completedContainer}>
                            <LinearGradient colors={['rgba(16,185,129,0.15)', 'rgba(52,211,153,0.05)']} style={styles.completedGradient}>
                                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                <Text style={styles.completedText}>Tarefa concluída!</Text>
                            </LinearGradient>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ============================================
// STYLES - TripGlide Premium
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#0C0C0E',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: SCREEN_HEIGHT * 0.92,
    },
    handleArea: {
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 8,
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 2,
    },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: -0.5,
        marginBottom: 14,
    },
    statusRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Content
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // Info Cards
    infoCards: {
        gap: 12,
        marginBottom: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    infoCardIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoCardLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 2,
    },
    infoCardValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },

    // Description
    descriptionCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    descriptionText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 22,
    },

    // Submission
    submissionSection: {
        marginBottom: 20,
    },
    uploadButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
    },
    uploadButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
    },
    uploadTextContainer: {
        flex: 1,
    },
    uploadButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#818CF8',
    },
    uploadButtonHint: {
        fontSize: 12,
        color: 'rgba(129,140,248,0.6)',
        marginTop: 2,
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 14,
        borderRadius: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: '#FFF',
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(239,68,68,0.1)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
    },
    warningText: {
        fontSize: 13,
        color: '#EF4444',
        flex: 1,
    },

    // Action
    actionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#0C0C0E',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    actionButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },

    // Completed
    completedContainer: {
        padding: 20,
    },
    completedGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 18,
        borderRadius: 16,
    },
    completedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10B981',
    },
});
