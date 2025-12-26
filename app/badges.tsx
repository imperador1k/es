/**
 * Badges Screen - Galeria de Conquistas
 * Grid 3 colunas, confetti ao desbloquear, modal de detalhes
 */

import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Badge, checkAndAwardBadges, getAllBadges, getUserBadges, RARITY_COLORS, RARITY_LABELS, UserBadge } from '@/services/badgeService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface DisplayBadge extends Badge {
    unlocked: boolean;
    unlocked_at?: string;
}

// ============================================
// CONSTANTS
// ============================================

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - spacing.md * 4) / 3;

// ============================================
// MAIN COMPONENT
// ============================================

export default function BadgesScreen() {
    const { user } = useAuthContext();

    const [allBadges, setAllBadges] = useState<Badge[]>([]);
    const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [newBadges, setNewBadges] = useState<string[]>([]);

    const confettiRef = useRef<any>(null);
    const scaleAnim = useRef(new Animated.Value(0)).current;

    // ============================================
    // LOAD DATA
    // ============================================

    const loadBadges = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [badges, owned] = await Promise.all([
                getAllBadges(),
                getUserBadges(user.id),
            ]);

            setAllBadges(badges);
            setUserBadges(owned);
        } catch (err) {
            console.error('Erro ao carregar badges:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    // Verificar badges ao montar
    useEffect(() => {
        const checkBadges = async () => {
            if (!user?.id) return;

            await loadBadges();

            // Verificar novos badges
            const result = await checkAndAwardBadges(user.id);

            if (result && result.badges_awarded.length > 0) {
                // Novos badges desbloqueados!
                const newBadgeNames = result.badges_awarded.map(b => `${b.icon} ${b.name}`);
                setNewBadges(newBadgeNames);
                setShowConfetti(true);

                // Recarregar para mostrar os novos
                await loadBadges();

                // Mostrar alerta
                setTimeout(() => {
                    Alert.alert(
                        '🎉 NOVA CONQUISTA!',
                        `Desbloqueaste:\n\n${newBadgeNames.join('\n')}\n\n+${result.total_xp_gained} XP bónus!`,
                        [{ text: 'Incrível!' }]
                    );
                }, 1500);
            }
        };

        checkBadges();
    }, [user?.id]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadBadges();
    };

    // ============================================
    // PROCESS DATA
    // ============================================

    const ownedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

    const displayBadges: DisplayBadge[] = allBadges.map(badge => ({
        ...badge,
        unlocked: ownedBadgeIds.has(badge.id),
        unlocked_at: userBadges.find(ub => ub.badge_id === badge.id)?.unlocked_at,
    }));

    // Ordenar: desbloqueados primeiro
    const sortedBadges = [...displayBadges].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return 0;
    });

    const unlockedCount = displayBadges.filter(b => b.unlocked).length;
    const totalCount = displayBadges.length;
    const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

    // ============================================
    // MODAL ANIMATION
    // ============================================

    useEffect(() => {
        if (selectedBadge) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [selectedBadge]);

    // ============================================
    // RENDER BADGE CARD
    // ============================================

    const renderBadge = ({ item }: { item: DisplayBadge }) => {
        const rarityStyle = RARITY_COLORS[item.rarity];

        return (
            <Pressable
                style={[
                    styles.badgeCard,
                    item.unlocked && { borderColor: rarityStyle.border },
                ]}
                onPress={() => setSelectedBadge(item)}
            >
                {/* Icon Container */}
                <View style={[
                    styles.badgeIconContainer,
                    item.unlocked
                        ? { backgroundColor: rarityStyle.bg }
                        : { backgroundColor: colors.surfaceSubtle },
                ]}>
                    <Text style={[
                        styles.badgeIcon,
                        !item.unlocked && styles.badgeIconLocked,
                    ]}>
                        {item.icon}
                    </Text>

                    {/* Lock overlay for locked badges */}
                    {!item.unlocked && (
                        <View style={styles.lockBadge}>
                            <Ionicons name="lock-closed" size={10} color="#FFF" />
                        </View>
                    )}

                    {/* Shine effect for unlocked */}
                    {item.unlocked && (
                        <View style={styles.shineBadge} />
                    )}
                </View>

                {/* Name */}
                <Text
                    style={[
                        styles.badgeName,
                        !item.unlocked && styles.badgeNameLocked,
                    ]}
                    numberOfLines={2}
                >
                    {item.name.replace(/^[^\s]+\s/, '')}
                </Text>
            </Pressable>
        );
    };

    // ============================================
    // DETAIL MODAL
    // ============================================

    const renderDetailModal = () => {
        if (!selectedBadge) return null;

        const rarityStyle = RARITY_COLORS[selectedBadge.rarity];

        return (
            <Modal
                visible={!!selectedBadge}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedBadge(null)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setSelectedBadge(null)}
                >
                    <Animated.View
                        style={[
                            styles.modalContent,
                            { transform: [{ scale: scaleAnim }] },
                        ]}
                    >
                        {/* Badge Icon */}
                        <View style={[
                            styles.modalIconContainer,
                            {
                                backgroundColor: selectedBadge.unlocked
                                    ? rarityStyle.bg
                                    : colors.surfaceSubtle,
                                borderColor: selectedBadge.unlocked
                                    ? rarityStyle.border
                                    : colors.divider,
                            },
                        ]}>
                            <Text style={[
                                styles.modalIcon,
                                !selectedBadge.unlocked && styles.badgeIconLocked,
                            ]}>
                                {selectedBadge.icon}
                            </Text>
                        </View>

                        {/* Name & Rarity */}
                        <Text style={styles.modalTitle}>{selectedBadge.name}</Text>
                        <View style={[styles.rarityBadge, { backgroundColor: rarityStyle.bg }]}>
                            <Text style={[styles.rarityText, { color: rarityStyle.text }]}>
                                {RARITY_LABELS[selectedBadge.rarity]}
                            </Text>
                        </View>

                        {/* Description */}
                        <Text style={styles.modalDescription}>
                            {selectedBadge.description}
                        </Text>

                        {/* XP Reward */}
                        {selectedBadge.xp_reward > 0 && (
                            <View style={styles.xpReward}>
                                <Ionicons name="flash" size={18} color={colors.accent.primary} />
                                <Text style={styles.xpRewardText}>
                                    +{selectedBadge.xp_reward} XP
                                </Text>
                            </View>
                        )}

                        {/* Status */}
                        <View style={[
                            styles.statusBar,
                            {
                                backgroundColor: selectedBadge.unlocked
                                    ? `${colors.success.primary}15`
                                    : `${colors.text.tertiary}15`,
                            },
                        ]}>
                            <Ionicons
                                name={selectedBadge.unlocked ? 'checkmark-circle' : 'lock-closed'}
                                size={18}
                                color={selectedBadge.unlocked ? colors.success.primary : colors.text.tertiary}
                            />
                            <Text style={[
                                styles.statusText,
                                { color: selectedBadge.unlocked ? colors.success.primary : colors.text.tertiary },
                            ]}>
                                {selectedBadge.unlocked
                                    ? `Conquistado em ${new Date(selectedBadge.unlocked_at!).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                    : 'Continua a estudar para desbloquear!'
                                }
                            </Text>
                        </View>

                        {/* Close button */}
                        <Pressable
                            style={styles.closeButton}
                            onPress={() => setSelectedBadge(null)}
                        >
                            <Text style={styles.closeButtonText}>Fechar</Text>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>
        );
    };

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                    <Text style={styles.loadingText}>A carregar conquistas...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Confetti */}
            {showConfetti && (
                <ConfettiCannon
                    ref={confettiRef}
                    count={200}
                    origin={{ x: width / 2, y: -10 }}
                    autoStart={true}
                    fadeOut={true}
                    onAnimationEnd={() => setShowConfetti(false)}
                />
            )}

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>🏅 As Minhas Conquistas</Text>
                    <Text style={styles.headerSubtitle}>
                        {unlockedCount}/{totalCount} Desbloqueados
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Progresso</Text>
                    <Text style={styles.progressPercent}>
                        {Math.round(progressPercent)}%
                    </Text>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${progressPercent}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressHint}>
                    {totalCount - unlockedCount > 0
                        ? `Faltam ${totalCount - unlockedCount} conquistas!`
                        : '🎉 Todas as conquistas desbloqueadas!'
                    }
                </Text>
            </View>

            {/* Badges Grid */}
            <FlatList
                data={sortedBadges}
                keyExtractor={(item) => item.id}
                renderItem={renderBadge}
                numColumns={3}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="medal-outline" size={64} color={colors.text.tertiary} />
                        <Text style={styles.emptyTitle}>Nenhuma conquista disponível</Text>
                    </View>
                }
            />

            {/* Detail Modal */}
            {renderDetailModal()}
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
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Progress
    progressCard: {
        backgroundColor: colors.surface,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.sm,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    progressTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    progressPercent: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    progressBar: {
        height: 10,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.full,
    },
    progressHint: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },

    // Grid
    gridContent: {
        padding: spacing.md,
    },
    gridRow: {
        justifyContent: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },

    // Badge Card
    badgeCard: {
        width: CARD_SIZE,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.divider,
        ...shadows.sm,
    },
    badgeIconContainer: {
        width: CARD_SIZE - spacing.lg,
        height: CARD_SIZE - spacing.lg,
        borderRadius: (CARD_SIZE - spacing.lg) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: spacing.xs,
    },
    badgeIcon: {
        fontSize: 32,
    },
    badgeIconLocked: {
        opacity: 0.3,
        // Grayscale effect via opacity
    },
    lockBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.text.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shineBadge: {
        position: 'absolute',
        top: 4,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    badgeName: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        textAlign: 'center',
        marginTop: 2,
    },
    badgeNameLocked: {
        color: colors.text.tertiary,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        padding: spacing.xl,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
        ...shadows.lg,
    },
    modalIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        marginBottom: spacing.md,
    },
    modalIcon: {
        fontSize: 48,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
    },
    rarityBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginTop: spacing.sm,
    },
    rarityText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },
    modalDescription: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.lg,
        lineHeight: 22,
    },
    xpReward: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.lg,
        backgroundColor: colors.accent.subtle,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    xpRewardText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        width: '100%',
    },
    statusText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        flex: 1,
    },
    closeButton: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing['3xl'],
        paddingVertical: spacing.md,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
    },
    closeButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['5xl'],
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginTop: spacing.md,
    },
});
