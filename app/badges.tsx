/**
 * Badges Screen - ABSURDAMENTE PREMIUM
 * Design épico com efeitos 3D, glows, auras por raridade e animações
 */

import { useBreakpoints } from '@/hooks/useBreakpoints';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Badge, checkAndAwardBadges, getAllBadges, getUserBadges, toggleBadgeEquip, UserBadge } from '@/services/badgeService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface DisplayBadge extends Badge {
    unlocked: boolean;
    unlocked_at?: string;
    is_equipped?: boolean;
}

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - SPACING.lg * 2 - SPACING.md * 2) / 3;

// RARITY com cores ABSURDAS
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
// MAIN COMPONENT
// ============================================

export default function BadgesScreen() {
    const { user } = useAuthContext();
    const { showAlert } = useAlert();
    const { isDesktop, numColumns, width: screenWidth } = useBreakpoints();

    // Dynamic card size based on screen width and columns
    const CARD_SIZE = isDesktop
        ? (Math.min(screenWidth, 1200) - SPACING.lg * 2 - SPACING.md * (numColumns + 1)) / numColumns
        : (screenWidth - SPACING.lg * 2 - SPACING.md * 2) / 3;

    const [allBadges, setAllBadges] = useState<Badge[]>([]);
    const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const confettiRef = useRef<any>(null);
    const modalScale = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // ============================================
    // LOAD DATA
    // ============================================

    const loadBadges = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [badges, owned] = await Promise.all([getAllBadges(), getUserBadges(user.id)]);
            setAllBadges(badges);
            setUserBadges(owned);
        } catch (err) {
            console.error('Erro ao carregar badges:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        const checkBadges = async () => {
            if (!user?.id) return;
            await loadBadges();

            const result = await checkAndAwardBadges(user.id);
            if (result && result.badges_awarded.length > 0) {
                setShowConfetti(true);
                await loadBadges();

                setTimeout(() => {
                    const names = result.badges_awarded.map((b) => `${b.icon} ${b.name}`);
                    showAlert({
                        title: '🎉 NOVA CONQUISTA!',
                        message: `Desbloqueaste:\n\n${names.join('\n')}\n\n+${result.total_xp_gained} XP!`,
                        buttons: [{ text: 'ÉPICO!' }]
                    });
                }, 1500);
            }
        };
        checkBadges();
    }, [user?.id]);

    // ============================================
    // PROCESS DATA
    // ============================================

    const ownedIds = new Set(userBadges.map((ub) => ub.badge_id));

    const displayBadges: DisplayBadge[] = allBadges.map((badge) => ({
        ...badge,
        unlocked: ownedIds.has(badge.id),
        unlocked_at: userBadges.find((ub) => ub.badge_id === badge.id)?.unlocked_at,
        is_equipped: userBadges.find((ub) => ub.badge_id === badge.id)?.is_equipped,
    }));

    const sortedBadges = [...displayBadges].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });

    const unlockedCount = displayBadges.filter((b) => b.unlocked).length;
    const totalCount = displayBadges.length;
    const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    useEffect(() => {
        Animated.timing(progressAnim, { toValue: progressPercent, duration: 1500, useNativeDriver: false }).start();
    }, [progressPercent]);

    // ============================================
    // MODAL ANIMATION
    // ============================================

    useEffect(() => {
        if (selectedBadge) {
            Animated.spring(modalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
        } else {
            modalScale.setValue(0);
        }
    }, [selectedBadge]);

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar conquistas...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Confetti */}
                {showConfetti && (
                    <ConfettiCannon
                        ref={confettiRef}
                        count={300}
                        origin={{ x: width / 2, y: -20 }}
                        autoStart
                        fadeOut
                        onAnimationEnd={() => setShowConfetti(false)}
                    />
                )}

                {/* Epic Header */}
                <LinearGradient colors={['rgba(99, 102, 241, 0.15)', 'transparent']} style={styles.headerGradient}>
                    <View style={styles.header}>
                        <Pressable style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                        </Pressable>
                        <View style={styles.headerContent}>
                            <Text style={styles.headerTitle}>🏆 Conquistas</Text>
                            <Text style={styles.headerSubtitle}>
                                {unlockedCount} de {totalCount} desbloqueadas
                            </Text>
                        </View>
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeText}>{Math.round(progressPercent)}%</Text>
                        </View>
                    </View>

                    {/* Epic Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
                                ]}
                            >
                                <LinearGradient colors={['#6366F1', '#A855F7', '#EC4899']} style={styles.progressGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                            </Animated.View>
                        </View>
                        <View style={styles.progressStars}>
                            {[25, 50, 75, 100].map((milestone) => (
                                <View key={milestone} style={[styles.progressMilestone, progressPercent >= milestone && styles.progressMilestoneActive]}>
                                    <Ionicons name="star" size={14} color={progressPercent >= milestone ? '#FFD700' : COLORS.text.tertiary} />
                                </View>
                            ))}
                        </View>
                    </View>
                </LinearGradient>

                {/* Rarity Legend */}
                <View style={styles.legendContainer}>
                    {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => (
                        <View key={rarity} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: RARITY_CONFIG[rarity].gradient[0] }]} />
                            <Text style={styles.legendText}>{RARITY_CONFIG[rarity].label}</Text>
                        </View>
                    ))}
                </View>

                {/* Badges Grid */}
                <FlatList
                    key={isDesktop ? 'desktop' : 'mobile'}
                    data={sortedBadges}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <BadgeCard badge={item} onPress={() => setSelectedBadge(item)} cardSize={CARD_SIZE} />}
                    numColumns={numColumns}
                    columnWrapperStyle={[styles.gridRow, isDesktop && styles.gridRowDesktop]}
                    contentContainerStyle={[styles.gridContent, isDesktop && styles.gridContentDesktop]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBadges(); }} tintColor="#6366F1" />}
                />

                {/* Detail Modal */}
                <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
                    <Pressable style={styles.modalOverlay} onPress={() => setSelectedBadge(null)}>
                        <Animated.View style={[styles.modalContent, { transform: [{ scale: modalScale }] }]}>
                            {selectedBadge && (
                                <BadgeDetail
                                    badge={selectedBadge}
                                    onClose={() => setSelectedBadge(null)}
                                    onUpdate={() => { loadBadges(); setSelectedBadge(null); }}
                                />
                            )}
                        </Animated.View>
                    </Pressable>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// BADGE CARD COMPONENT
// ============================================

function BadgeCard({ badge, onPress, cardSize }: { badge: DisplayBadge; onPress: () => void; cardSize: number }) {
    const scale = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rarity = RARITY_CONFIG[badge.rarity];

    // Pulse animation for unlocked legendary/epic
    useEffect(() => {
        if (badge.unlocked && (badge.rarity === 'legendary' || badge.rarity === 'epic')) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [badge.unlocked, badge.rarity]);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View
                style={[
                    styles.badgeCard,
                    { width: cardSize, height: 'auto', minHeight: cardSize * 1.3 },
                    { transform: [{ scale: Animated.multiply(scale, pulseAnim) }] },
                    badge.unlocked && { shadowColor: rarity.gradient[0], shadowOpacity: 0.4, shadowRadius: 12 },
                ]}
            >
                {/* Glow Effect */}
                {badge.unlocked && <View style={[styles.badgeGlow, { backgroundColor: rarity.glow }]} />}

                {/* Icon Container */}
                <View style={[styles.badgeIconWrap, !badge.unlocked && styles.badgeIconLocked]}>
                    {badge.unlocked ? (
                        <LinearGradient
                            colors={rarity.gradient}
                            style={[
                                styles.badgeIconGradient,
                                { width: cardSize - 32, height: cardSize - 32, borderRadius: (cardSize - 32) / 2 }
                            ]}
                        >
                            {badge.is_equipped && (
                                <View style={styles.equippedBadgeOverlay}>
                                    <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                                </View>
                            )}
                            <Text style={[styles.badgeEmoji, { fontSize: cardSize * 0.35 }]}>{badge.icon}</Text>
                        </LinearGradient>
                    ) : (
                        <View style={[
                            styles.badgeIconGradientLocked,
                            { width: cardSize - 32, height: cardSize - 32, borderRadius: (cardSize - 32) / 2 }
                        ]}>
                            <Text style={[styles.badgeEmoji, styles.badgeEmojiLocked, { fontSize: cardSize * 0.35 }]}>{badge.icon}</Text>
                            <View style={styles.lockOverlay}>
                                <Ionicons name="lock-closed" size={16} color="#FFF" />
                            </View>
                        </View>
                    )}
                </View>

                {/* Name */}
                <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]} numberOfLines={2}>
                    {badge.name.replace(/^[^\s]+\s/, '')}
                </Text>

                {/* Rarity Stars */}
                <View style={styles.starsRow}>
                    {Array.from({ length: rarity.stars }).map((_, i) => (
                        <Ionicons key={i} name="star" size={10} color={badge.unlocked ? rarity.gradient[0] : COLORS.text.tertiary} />
                    ))}
                </View>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// BADGE DETAIL COMPONENT
// ============================================

function BadgeDetail({ badge, onClose, onUpdate }: { badge: DisplayBadge; onClose: () => void; onUpdate: () => void }) {
    const rarity = RARITY_CONFIG[badge.rarity];
    const { showAlert } = useAlert();
    const [equipping, setEquipping] = useState(false);

    const handleEquipToggle = async () => {
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
            {badge.unlocked && (
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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },

    // Header
    headerGradient: { paddingBottom: SPACING.lg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerContent: { flex: 1, marginLeft: SPACING.md },
    headerTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
    headerBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
    headerBadgeText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#6366F1' },

    // Progress
    progressContainer: { paddingHorizontal: SPACING.lg },
    progressBar: { height: 12, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
    progressGradient: { flex: 1 },
    progressStars: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm, paddingHorizontal: SPACING.sm },
    progressMilestone: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    progressMilestoneActive: { backgroundColor: 'rgba(255, 215, 0, 0.2)' },

    // Legend
    legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg, paddingVertical: SPACING.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },

    // Grid
    gridContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
    gridRow: { gap: SPACING.md, marginBottom: SPACING.md },

    // Badge Card
    // Badge Card
    badgeCard: {
        // Width set dynamically
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
    },
    badgeGlow: { position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, borderRadius: 100 },
    badgeIconWrap: { marginBottom: SPACING.xs },
    equippedBadgeOverlay: { position: 'absolute', top: 0, right: 0, zIndex: 10, backgroundColor: COLORS.success, borderRadius: 8 },
    badgeIconLocked: { opacity: 0.5 },
    badgeIconGradient: {
        // Size set dynamically
        alignItems: 'center',
        justifyContent: 'center'
    },
    badgeIconGradientLocked: {
        // Size set dynamically
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    badgeEmoji: { fontSize: 32 },
    badgeEmojiLocked: { opacity: 0.3 },
    lockOverlay: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    badgeName: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.primary, textAlign: 'center', marginTop: 4 },
    badgeNameLocked: { color: COLORS.text.tertiary },
    starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    modalContent: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['3xl'], width: '100%', maxWidth: 340, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    // Detail
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

    // ============================================
    // RESPONSIVE DESKTOP STYLES
    // ============================================
    gridContentDesktop: {
        paddingHorizontal: SPACING.xl,
    },
    gridRowDesktop: {
        gap: SPACING.xl,
        justifyContent: 'center',
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    // Override base styles for desktop if needed
});
