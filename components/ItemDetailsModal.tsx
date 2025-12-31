/**
 * Item Details Modal
 * Modal adaptativo baseado no tipo de item do calendário
 */

import { AgendaItem, formatTimeRange, getItemColor, getItemTypeIcon } from '@/hooks/useCalendarItems';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// ============================================
// TYPES
// ============================================

interface ItemDetailsModalProps {
    visible: boolean;
    item: AgendaItem | null;
    onClose: () => void;
    onUpdate: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function ItemDetailsModal({
    visible,
    item,
    onClose,
    onUpdate,
}: ItemDetailsModalProps) {
    const { user } = useAuthContext();
    const [loading, setLoading] = useState(false);

    if (!item) return null;

    const itemColor = item.color || getItemColor(item.item_type, item.category);
    const iconName = getItemTypeIcon(item.item_type, item.category) as keyof typeof Ionicons.glyphMap;
    const timeRange = formatTimeRange(item.start_at, item.end_at);

    // ============================================
    // ACTIONS
    // ============================================

    const handleCompleteTask = async () => {
        if (!user?.id) return;
        setLoading(true);

        try {
            // Determine which table to update based on item source
            const isPersonalTodo = item.item_type === 'todo';
            const table = isPersonalTodo ? 'personal_todos' : 'tasks';

            // Extract real ID (remove virtual prefix if present)
            const realId = item.id.includes('-') ? item.id.split('-').pop() : item.id;

            const { error } = await supabase
                .from(table)
                .update({ is_completed: !item.is_completed })
                .eq('id', realId);

            if (error) throw error;

            Alert.alert(
                item.is_completed ? '✅ Reaberta!' : '🎉 Concluída!',
                item.is_completed ? 'Tarefa reaberta com sucesso.' : 'Parabéns! Tarefa concluída.',
                [{ text: 'OK' }]
            );

            onUpdate();
            onClose();
        } catch (err) {
            console.error('❌ Error updating task:', err);
            Alert.alert('Erro', 'Não foi possível atualizar a tarefa.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!user?.id) return;

        Alert.alert(
            'Apagar Evento',
            'Tens a certeza que queres apagar este evento?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const realId = item.id.includes('-') ? item.id.split('-').pop() : item.id;

                            const { error } = await supabase
                                .from('events')
                                .delete()
                                .eq('id', realId);

                            if (error) throw error;

                            Alert.alert('✅ Apagado!', 'Evento removido com sucesso.');
                            onUpdate();
                            onClose();
                        } catch (err) {
                            console.error('❌ Error deleting event:', err);
                            Alert.alert('Erro', 'Não foi possível apagar o evento.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // RENDER CONTENT BY TYPE
    // ============================================

    const renderContent = () => {
        switch (item.item_type) {
            case 'task':
            case 'todo':
                return (
                    <>
                        {/* Description */}
                        {item.description && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Descrição</Text>
                                <Text style={styles.description}>{item.description}</Text>
                            </View>
                        )}

                        {/* Due Date */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Prazo</Text>
                            <View style={styles.infoRow}>
                                <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
                                <Text style={styles.infoText}>
                                    {new Date(item.start_at).toLocaleDateString('pt-PT', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                        </View>

                        {/* Status */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Estado</Text>
                            <View style={[styles.statusBadge, item.is_completed && styles.statusCompleted]}>
                                <Ionicons
                                    name={item.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={16}
                                    color={item.is_completed ? '#FFF' : colors.text.secondary}
                                />
                                <Text style={[styles.statusText, item.is_completed && styles.statusTextCompleted]}>
                                    {item.is_completed ? 'Concluída' : 'Pendente'}
                                </Text>
                            </View>
                        </View>

                        {/* Action Button */}
                        <Pressable
                            style={[
                                styles.actionButton,
                                { backgroundColor: item.is_completed ? colors.warning.primary : colors.success.primary },
                            ]}
                            onPress={handleCompleteTask}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={item.is_completed ? 'refresh-outline' : 'checkmark-circle-outline'}
                                        size={22}
                                        color="#FFF"
                                    />
                                    <Text style={styles.actionButtonText}>
                                        {item.is_completed ? 'Reabrir Tarefa' : 'Marcar como Concluída'}
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </>
                );

            case 'event':
                return (
                    <>
                        {/* Time */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Horário</Text>
                            <View style={styles.infoRow}>
                                <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                                <Text style={styles.infoText}>{timeRange}</Text>
                            </View>
                        </View>

                        {/* Location */}
                        {item.room && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Local</Text>
                                <View style={styles.infoRow}>
                                    <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
                                    <Text style={styles.infoText}>{item.room}</Text>
                                </View>
                            </View>
                        )}

                        {/* Description */}
                        {item.description && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Descrição</Text>
                                <Text style={styles.description}>{item.description}</Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actionRow}>
                            <Pressable
                                style={[styles.actionButtonSmall, styles.deleteButton]}
                                onPress={handleDeleteEvent}
                                disabled={loading}
                            >
                                <Ionicons name="trash-outline" size={18} color="#FFF" />
                                <Text style={styles.actionButtonSmallText}>Apagar</Text>
                            </Pressable>
                        </View>
                    </>
                );

            case 'class':
                return (
                    <>
                        {/* Time */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Horário</Text>
                            <View style={styles.infoRow}>
                                <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                                <Text style={styles.infoText}>{timeRange}</Text>
                            </View>
                        </View>

                        {/* Room */}
                        {item.room && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Sala</Text>
                                <View style={styles.infoRow}>
                                    <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
                                    <Text style={styles.infoText}>{item.room}</Text>
                                </View>
                            </View>
                        )}

                        {/* Subject */}
                        {item.subject_name && (
                            <View style={styles.section}>
                                <Text style={styles.sectionLabel}>Disciplina</Text>
                                <View style={styles.infoRow}>
                                    <Ionicons name="book-outline" size={16} color={colors.text.secondary} />
                                    <Text style={styles.infoText}>{item.subject_name}</Text>
                                </View>
                            </View>
                        )}

                        {/* Info Badge */}
                        <View style={styles.infoBadge}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.accent.primary} />
                            <Text style={styles.infoBadgeText}>
                                Esta é uma aula recorrente do teu horário escolar.
                            </Text>
                        </View>
                    </>
                );

            default:
                return null;
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
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={styles.container}>
                {/* Handle */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: `${itemColor}20` }]}>
                        <Ionicons name={iconName} size={24} color={itemColor} />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: itemColor }]}>
                            <Text style={styles.typeBadgeText}>{getItemTypeLabel(item.item_type)}</Text>
                        </View>
                    </View>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text.secondary} />
                    </Pressable>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {renderContent()}
                </View>
            </View>
        </Modal>
    );
}

// ============================================
// HELPERS
// ============================================

function getItemTypeLabel(itemType: string): string {
    switch (itemType) {
        case 'class': return 'Aula';
        case 'event': return 'Evento';
        case 'task': return 'Tarefa';
        case 'todo': return 'Lembrete';
        default: return 'Item';
    }
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        paddingBottom: spacing['3xl'],
        maxHeight: '80%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    typeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
    },
    typeBadgeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    closeButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Content
    content: {
        paddingHorizontal: spacing.xl,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
        marginBottom: spacing.xs,
    },
    description: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        lineHeight: 22,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    infoText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // Status
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    statusCompleted: {
        backgroundColor: colors.success.primary,
    },
    statusText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    statusTextCompleted: {
        color: '#FFF',
    },

    // Action Buttons
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        marginTop: spacing.lg,
    },
    actionButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    actionButtonSmall: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    deleteButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonSmallText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },

    // Info Badge
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.light,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginTop: spacing.md,
    },
    infoBadgeText: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },
});

export default ItemDetailsModal;
