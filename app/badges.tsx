/**
 * Badges Screen - ABSURDAMENTE PREMIUM
 * Design épico com efeitos 3D, glows, auras por raridade e animações
 */

import { BadgeDetail, DisplayBadge } from '@/components/BadgeDetail';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Badge, checkAndAwardBadges, getAllBadges, getUserBadges, UserBadge } from '@/services/badgeService';
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
    const { isDesktop, width: screenWidth } = useBreakpoints();

    // MOBILE-FIRST: Always 3 columns on mobile, more on desktop
    const MOBILE_COLUMNS = 3;
    const DESKTOP_COLUMNS = isDesktop ? 5 : 3;
    const numColumns = isDesktop ? DESKTOP_COLUMNS : MOBILE_COLUMNS;

    // Calculate card size based on screen width and columns
    const horizontalPadding = SPACING.md * 2; // paddingHorizontal on grid
    const gapWidth = SPACING.sm * (numColumns - 1); // gaps between cards
    const availableWidth = screenWidth - horizontalPadding - gapWidth;
    const CARD_SIZE = Math.floor(availableWidth / numColumns);

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

                {/* Compact Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>🏆 Conquistas</Text>
                        <Text style={styles.headerSubtitle}>
                            {unlockedCount}/{totalCount} desbloqueadas
                        </Text>
                    </View>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>{Math.round(progressPercent)}%</Text>
                    </View>
                </View>

                {/* Compact Progress Bar */}
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
                </View>

                {/* Compact Rarity Legend */}
                <View style={styles.legendContainer}>
                    {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => (
                        <View key={rarity} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: RARITY_CONFIG[rarity].gradient[0] }]} />
                            <Text style={styles.legendText}>{RARITY_CONFIG[rarity].label}</Text>
                        </View>
                    ))}
                </View>

                {/* Badges Grid - Always multi-column */}
                <FlatList
                    key={`badges-${numColumns}`}
                    data={sortedBadges}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <BadgeCard badge={item} onPress={() => setSelectedBadge(item)} cardSize={CARD_SIZE} />}
                    numColumns={numColumns}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
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
// BADGE CARD COMPONENT - Optimized for Mobile
// ============================================

function BadgeCard({ badge, onPress, cardSize }: { badge: DisplayBadge; onPress: () => void; cardSize: number }) {
    const scale = useRef(new Animated.Value(1)).current;
    const rarity = RARITY_CONFIG[badge.rarity];

    // Smaller icon for compact cards
    const iconSize = Math.max(cardSize * 0.55, 40);
    const emojiSize = Math.max(cardSize * 0.3, 20);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
            style={{ width: cardSize, marginBottom: SPACING.sm }}
        >
            <Animated.View
                style={[
                    styles.badgeCard,
                    { transform: [{ scale }] },
                    badge.unlocked && { shadowColor: rarity.gradient[0], shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
                ]}
            >
                {/* Glow Effect */}
                {badge.unlocked && <View style={[styles.badgeGlow, { backgroundColor: rarity.glow }]} />}

                {/* Icon Container */}
                <View style={[styles.badgeIconWrap, !badge.unlocked && styles.badgeIconLocked]}>
                    {badge.unlocked ? (
                        <LinearGradient
                            colors={rarity.gradient}
                            style={[styles.badgeIconGradient, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}
                        >
                            {badge.is_equipped && (
                                <View style={styles.equippedBadgeOverlay}>
                                    <Ionicons name="checkmark-circle" size={12} color="#FFF" />
                                </View>
                            )}
                            <Text style={{ fontSize: emojiSize }}>{badge.icon}</Text>
                        </LinearGradient>
                    ) : (
                        <View style={[styles.badgeIconGradientLocked, { width: iconSize, height: iconSize, borderRadius: iconSize / 2 }]}>
                            <Text style={[{ fontSize: emojiSize, opacity: 0.3 }]}>{badge.icon}</Text>
                            <View style={styles.lockOverlay}>
                                <Ionicons name="lock-closed" size={12} color="#FFF" />
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
                        <Ionicons key={i} name="star" size={8} color={badge.unlocked ? rarity.gradient[0] : COLORS.text.tertiary} />
                    ))}
                </View>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// STYLES - Mobile-First Design
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },

    // Compact Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerContent: { flex: 1, marginLeft: SPACING.sm },
    headerTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    headerSubtitle: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.secondary },
    headerBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full
    },
    headerBadgeText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#6366F1' },

    // Compact Progress
    progressContainer: { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
    progressBar: { height: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
    progressGradient: { flex: 1 },

    // Compact Legend
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.xs,
        marginBottom: SPACING.xs
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 10, color: COLORS.text.tertiary },

    // Grid - Mobile First
    gridContent: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
    gridRow: { justifyContent: 'flex-start', gap: SPACING.sm },

    // Compact Badge Card
    badgeCard: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.xs,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 90,
    },
    badgeGlow: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 50 },
    badgeIconWrap: { marginBottom: 4 },
    equippedBadgeOverlay: { position: 'absolute', top: -2, right: -2, zIndex: 10, backgroundColor: COLORS.success, borderRadius: 6, padding: 2 },
    badgeIconLocked: { opacity: 0.5 },
    badgeIconGradient: { alignItems: 'center', justifyContent: 'center' },
    badgeIconGradientLocked: { backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    lockOverlay: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    badgeName: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.primary, textAlign: 'center', marginTop: 2, paddingHorizontal: 2 },
    badgeNameLocked: { color: COLORS.text.tertiary },
    starsRow: { flexDirection: 'row', gap: 1, marginTop: 2 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
    modalContent: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], width: '100%', maxWidth: 320, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
});
