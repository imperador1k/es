import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { Badge, toggleBadgeEquip } from '@/services/badgeService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

// ============================================
// TYPES
// ============================================

export interface DisplayBadge extends Badge {
    unlocked: boolean;
    unlocked_at?: string;
    is_equipped?: boolean;
}

// RARITY CONFIG (replicated for self-containment or could be imported if shared)
const RARITY_CONFIG = {
    common: {
        gradient: ['#6B7280', '#4B5563'] as const,
        glow: 'rgba(107, 114, 128, 0.4)',
        label: 'Comum',
        emoji: '⚪',
        stars: 1,
    },
    rare: {
        gradient: ['#3B82F6', '#2563EB'] as const,
        glow: 'rgba(59, 130, 246, 0.5)',
        label: 'Raro',
        emoji: '🔵',
        stars: 2,
    },
    epic: {
        gradient: ['#A855F7', '#7C3AED'] as const,
        glow: 'rgba(168, 85, 247, 0.6)',
        label: 'Épico',
        emoji: '🟣',
        stars: 3,
    },
    legendary: {
        gradient: ['#F59E0B', '#D97706'] as const,
        glow: 'rgba(245, 158, 11, 0.7)',
        label: 'Lendário',
        emoji: '🌟',
        stars: 4,
    },
};

// ============================================
// COMPONENT
// ============================================

interface BadgeDetailProps {
    badge: DisplayBadge;
    onClose: () => void;
    onUpdate?: () => void;
    showEquipAction?: boolean;
}

export function BadgeDetail({ badge, onClose, onUpdate, showEquipAction = true }: BadgeDetailProps) {
    const rarity = RARITY_CONFIG[badge.rarity];
    const { showAlert } = useAlert();
    const [equipping, setEquipping] = useState(false);

    const handleEquipToggle = async () => {
        if (!onUpdate) return;
        setEquipping(true);
        const result = await toggleBadgeEquip(badge.id);
        setEquipping(false);

        if (result.success) {
            onUpdate(); // Reload badges to update UI
        } else {
            showAlert({
                title: 'Erro',
                message: result.error || 'Não foi possível equipar a medalha.',
            });
        }
    };

    return (
        <View style={styles.detailContainer}>
            {/* Epic Icon */}
            <View style={styles.detailIconWrap}>
                {badge.unlocked ? (
                    <LinearGradient colors={rarity.gradient} style={styles.detailIconGradient}>
                        <Text style={styles.detailEmoji}>{badge.icon}</Text>
                    </LinearGradient>
                ) : (
                    <View style={styles.detailIconLocked}>
                        <Text style={[styles.detailEmoji, { opacity: 0.3 }]}>{badge.icon}</Text>
                    </View>
                )}
            </View>

            {/* Title */}
            <Text style={styles.detailTitle}>{badge.name}</Text>

            {/* Rarity Badge */}
            <LinearGradient colors={rarity.gradient} style={styles.rarityBadge}>
                <Text style={styles.rarityEmoji}>{rarity.emoji}</Text>
                <Text style={styles.rarityLabel}>{rarity.label}</Text>
                <View style={styles.rarityStars}>
                    {Array.from({ length: rarity.stars }).map((_, i) => (
                        <Ionicons key={i} name="star" size={12} color="#FFF" />
                    ))}
                </View>
            </LinearGradient>

            {/* Description */}
            <Text style={styles.detailDescription}>{badge.description}</Text>

            {/* XP Reward */}
            {badge.xp_reward > 0 && (
                <View style={styles.xpReward}>
                    <Ionicons name="flash" size={20} color="#FFD700" />
                    <Text style={styles.xpRewardText}>+{badge.xp_reward} XP</Text>
                </View>
            )}

            {/* Status */}
            <View style={[styles.statusCard, badge.unlocked ? styles.statusUnlocked : styles.statusLocked]}>
                <Ionicons name={badge.unlocked ? 'checkmark-circle' : 'lock-closed'} size={24} color={badge.unlocked ? '#22C55E' : COLORS.text.tertiary} />
                <View style={styles.statusContent}>
                    <Text style={[styles.statusTitle, badge.unlocked && { color: '#22C55E' }]}>
                        {badge.unlocked ? 'Desbloqueado!' : 'Bloqueado'}
                    </Text>
                    <Text style={styles.statusSubtitle}>
                        {badge.unlocked
                            ? new Date(badge.unlocked_at!).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Continua a progredir para desbloquear'}
                    </Text>
                </View>
            </View>

            {/* Equip Action */}
            {showEquipAction && badge.unlocked && (
                <Pressable
                    style={[styles.actionButton, badge.is_equipped ? styles.actionButtonUnequip : styles.actionButtonEquip]}
                    onPress={handleEquipToggle}
                    disabled={equipping}
                >
                    {equipping ? (
                        <ActivityIndicator color={badge.is_equipped ? COLORS.error : '#FFF'} />
                    ) : (
                        <>
                            <Ionicons name={badge.is_equipped ? 'close-circle' : 'shield-checkmark'} size={20} color={badge.is_equipped ? COLORS.error : '#FFF'} />
                            <Text style={[styles.actionButtonText, badge.is_equipped && { color: COLORS.error }]}>
                                {badge.is_equipped ? 'Desequipar' : 'Equipar'}
                            </Text>
                        </>
                    )}
                </Pressable>
            )}

            {/* Close Button */}
            <Pressable onPress={onClose}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>Fechar</Text>
                </LinearGradient>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    detailContainer: { alignItems: 'center', padding: SPACING.xl },
    detailIconWrap: { marginBottom: SPACING.lg },
    detailIconGradient: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
    detailIconLocked: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceMuted },
    detailEmoji: { fontSize: 56 },
    detailTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary, textAlign: 'center' },
    rarityBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, marginTop: SPACING.md },
    rarityEmoji: { fontSize: 14 },
    rarityLabel: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    rarityStars: { flexDirection: 'row', gap: 2 },
    detailDescription: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, textAlign: 'center', marginTop: SPACING.lg, lineHeight: 24, paddingHorizontal: SPACING.md },
    xpReward: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: 'rgba(255, 215, 0, 0.15)', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, marginTop: SPACING.lg },
    xpRewardText: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFD700' },
    statusCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, borderRadius: RADIUS.xl, marginTop: SPACING.lg, width: '100%' },
    statusUnlocked: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
    statusLocked: { backgroundColor: COLORS.surfaceMuted },
    statusContent: { flex: 1 },
    statusTitle: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    statusSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    closeButton: { paddingHorizontal: SPACING['3xl'], paddingVertical: SPACING.md, borderRadius: RADIUS.xl, marginTop: SPACING.md },
    closeButtonText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },

    // Actions
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%', padding: SPACING.md, borderRadius: RADIUS.xl, marginTop: SPACING.md, justifyContent: 'center', borderWidth: 1 },
    actionButtonEquip: { backgroundColor: COLORS.accent.primary, borderColor: COLORS.accent.primary },
    actionButtonUnequip: { backgroundColor: 'transparent', borderColor: COLORS.error },
    actionButtonText: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
});
