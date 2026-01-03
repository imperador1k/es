/**
 * 📋 Item Details Modal - PREMIUM REDESIGN
 * Beautiful adaptive modal for calendar items
 */

import { AgendaItem, formatTimeRange, getItemColor } from '@/hooks/useCalendarItems';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider'; // Added
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    ScrollView,
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

// Type colors and gradients
const TYPE_CONFIG: Record<string, { gradient: [string, string]; icon: string; emoji: string }> = {
    class: { gradient: ['#6366F1', '#8B5CF6'], icon: 'school', emoji: '📚' },
    event: { gradient: ['#F59E0B', '#D97706'], icon: 'calendar', emoji: '📅' },
    task: { gradient: ['#10B981', '#059669'], icon: 'checkbox', emoji: '✅' },
    todo: { gradient: ['#EC4899', '#DB2777'], icon: 'list', emoji: '📝' },
};

// ============================================
// COMPONENT
// ============================================

export function ItemDetailsModal({ visible, item, onClose, onUpdate }: ItemDetailsModalProps) {
    const { user } = useAuthContext();
    const { showAlert } = useAlert(); // Added
    const [loading, setLoading] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    // Animate on open
    useState(() => {
        if (visible) {
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        }
    });

    if (!item) return null;

    const itemColor = item.color || getItemColor(item.item_type, item.category);
    const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.event;
    const timeRange = formatTimeRange(item.start_at, item.end_at);

    // ============================================
    // ACTIONS
    // ============================================

    const handleCompleteTask = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const isPersonalTodo = item.item_type === 'todo';
            const table = isPersonalTodo ? 'personal_todos' : 'tasks';
            const realId = item.id.includes('-') ? item.id.split('-').pop() : item.id;

            const { error } = await supabase.from(table).update({ is_completed: !item.is_completed }).eq('id', realId);
            if (error) throw error;

            showAlert({
                title: item.is_completed ? '✅ Reaberta!' : '🎉 Concluída!',
                message: item.is_completed ? 'Tarefa reaberta.' : 'Parabéns!'
            });
            onUpdate();
            onClose();
        } catch (err) {
            console.error('❌ Error:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível atualizar.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async () => {
        if (!user?.id) return;
        showAlert({
            title: 'Apagar Evento',
            message: 'Tens a certeza?',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const realId = item.id.includes('-') ? item.id.split('-').pop() : item.id;
                            const { error } = await supabase.from('events').delete().eq('id', realId);
                            if (error) throw error;
                            showAlert({ title: '✅ Apagado!', message: 'Evento removido.' });
                            onUpdate();
                            onClose();
                        } catch (err) {
                            showAlert({ title: 'Erro', message: 'Não foi possível apagar.' });
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        });
    };

    // ============================================
    // INFO CARD COMPONENT
    // ============================================

    const InfoCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) => (
        <View style={styles.infoCard}>
            <View style={[styles.infoIconWrap, { backgroundColor: `${color || '#6366F1'}20` }]}>
                <Ionicons name={icon as any} size={18} color={color || '#6366F1'} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    // ============================================
    // RENDER CONTENT BY TYPE
    // ============================================

    const renderContent = () => {
        switch (item.item_type) {
            case 'task':
            case 'todo':
                return (
                    <>
                        {item.description && (
                            <View style={styles.descriptionCard}>
                                <Text style={styles.descriptionText}>{item.description}</Text>
                            </View>
                        )}

                        <InfoCard
                            icon="calendar"
                            label="Prazo"
                            value={new Date(item.start_at).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            color="#6366F1"
                        />

                        {/* Status Badge */}
                        <View style={styles.statusSection}>
                            <Text style={styles.statusLabel}>Estado</Text>
                            <View style={[styles.statusBadge, item.is_completed && styles.statusCompleted]}>
                                <Ionicons name={item.is_completed ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={item.is_completed ? '#FFF' : COLORS.text.secondary} />
                                <Text style={[styles.statusText, item.is_completed && styles.statusTextCompleted]}>
                                    {item.is_completed ? 'Concluída' : 'Pendente'}
                                </Text>
                            </View>
                        </View>

                        {/* Action Button */}
                        <Pressable style={styles.primaryBtn} onPress={handleCompleteTask} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <LinearGradient colors={item.is_completed ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']} style={styles.primaryBtnGradient}>
                                    <Ionicons name={item.is_completed ? 'refresh' : 'checkmark-circle'} size={22} color="#FFF" />
                                    <Text style={styles.primaryBtnText}>{item.is_completed ? 'Reabrir Tarefa' : 'Marcar Concluída'}</Text>
                                </LinearGradient>
                            )}
                        </Pressable>
                    </>
                );

            case 'event':
                return (
                    <>
                        <InfoCard icon="time" label="Horário" value={timeRange} color="#F59E0B" />
                        {item.room && <InfoCard icon="location" label="Local" value={item.room} color="#EF4444" />}
                        {item.description && (
                            <View style={styles.descriptionCard}>
                                <Text style={styles.descriptionText}>{item.description}</Text>
                            </View>
                        )}

                        <Pressable style={styles.deleteBtn} onPress={handleDeleteEvent} disabled={loading}>
                            <Ionicons name="trash" size={18} color="#FFF" />
                            <Text style={styles.deleteBtnText}>Apagar Evento</Text>
                        </Pressable>
                    </>
                );

            case 'class':
                return (
                    <>
                        <InfoCard icon="time" label="Horário" value={timeRange} color="#6366F1" />
                        {item.room && <InfoCard icon="location" label="Sala" value={item.room} color="#10B981" />}
                        {item.subject_name && <InfoCard icon="book" label="Disciplina" value={item.subject_name} color="#8B5CF6" />}

                        <View style={styles.infoBadge}>
                            <Ionicons name="information-circle" size={18} color="#6366F1" />
                            <Text style={styles.infoBadgeText}>Aula recorrente do teu horário escolar.</Text>
                        </View>
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            </Pressable>

            <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
                {/* Handle */}
                <View style={styles.handle} />

                {/* Header with Gradient */}
                <LinearGradient colors={config.gradient} style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerEmoji}>{config.emoji}</Text>
                        <View style={styles.headerText}>
                            <Text style={styles.headerTitle} numberOfLines={2}>{item.title}</Text>
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>{getItemTypeLabel(item.item_type)}</Text>
                            </View>
                        </View>
                    </View>
                    <Pressable style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={22} color="#FFF" />
                    </Pressable>
                </LinearGradient>

                {/* Content */}
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {renderContent()}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </Animated.View>
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
// STYLES - Premium Design
// ============================================

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end' },
    container: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], maxHeight: '85%', ...SHADOWS.lg },
    handle: { width: 40, height: 4, backgroundColor: COLORS.surfaceElevated, borderRadius: 2, alignSelf: 'center', marginTop: SPACING.md },

    // Header
    header: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.lg, marginTop: SPACING.sm, borderRadius: RADIUS.xl, marginHorizontal: SPACING.md },
    headerContent: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
    headerEmoji: { fontSize: 36 },
    headerText: { flex: 1 },
    headerTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF', marginBottom: SPACING.xs },
    typeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
    typeBadgeText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

    // Content
    content: { padding: SPACING.md },

    // Info Cards
    infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
    infoIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    infoContent: { flex: 1, marginLeft: SPACING.md },
    infoLabel: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
    infoValue: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },

    // Description
    descriptionCard: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
    descriptionText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, lineHeight: 22 },

    // Status
    statusSection: { marginBottom: SPACING.md },
    statusLabel: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginBottom: SPACING.xs },
    statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: SPACING.xs, backgroundColor: COLORS.surfaceElevated, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
    statusCompleted: { backgroundColor: '#10B981' },
    statusText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.secondary },
    statusTextCompleted: { color: '#FFF' },

    // Buttons
    primaryBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginTop: SPACING.md },
    primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
    primaryBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#EF4444', paddingVertical: SPACING.md, borderRadius: RADIUS.xl, marginTop: SPACING.md },
    deleteBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Info Badge
    infoBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#6366F120', padding: SPACING.md, borderRadius: RADIUS.lg, marginTop: SPACING.md },
    infoBadgeText: { flex: 1, fontSize: TYPOGRAPHY.size.sm, color: '#6366F1' },
});

export default ItemDetailsModal;
