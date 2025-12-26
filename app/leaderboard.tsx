/**
 * Global Leaderboard Screen
 * Ranking global de todos os utilizadores por XP
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// LinearGradient fallback
let LinearGradientComponent: any = View;
try {
    if (Platform.OS !== 'web') {
        const { LinearGradient } = require('expo-linear-gradient');
        LinearGradientComponent = LinearGradient;
    }
} catch (e) {
    console.log('LinearGradient não disponível');
}

// ============================================
// TYPES
// ============================================

interface RankedUser {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    current_xp: number;
    current_tier: string | null;
    rank: number;
}

// ============================================
// CONSTANTS
// ============================================

const PODIUM_COLORS = {
    1: { primary: '#FFD700', secondary: '#FFA500', icon: '👑' },
    2: { primary: '#C0C0C0', secondary: '#A0A0A0', icon: '🥈' },
    3: { primary: '#CD7F32', secondary: '#8B4513', icon: '🥉' },
};

const TIER_COLORS: Record<string, string> = {
    'Bronze': '#CD7F32',
    'Prata': '#C0C0C0',
    'Ouro': '#FFD700',
    'Platina': '#E5E4E2',
    'Diamante': '#B9F2FF',
    'Mestre': '#9B30FF',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function GlobalLeaderboardScreen() {
    const { user } = useAuthContext();

    const [users, setUsers] = useState<RankedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const podiumAnim = new Animated.Value(0);

    // ============================================
    // LOAD LEADERBOARD
    // ============================================

    const loadLeaderboard = useCallback(async () => {
        try {
            // Buscar todos os perfis ordenados por XP
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, current_xp, current_tier')
                .order('current_xp', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Adicionar rank
            const rankedUsers: RankedUser[] = (data || []).map((u, index) => ({
                ...u,
                current_xp: u.current_xp || 0,
                current_tier: u.current_tier || 'Bronze',
                rank: index + 1,
            }));

            setUsers(rankedUsers);

            // Animar pódio
            Animated.spring(podiumAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }).start();

        } catch (err) {
            console.error('Erro ao carregar leaderboard:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadLeaderboard();
    };

    // ============================================
    // HELPERS
    // ============================================

    const getCurrentUserRank = (): number => {
        return users.find(u => u.id === user?.id)?.rank || 0;
    };

    const getXPToNextRank = (): { name: string; xpNeeded: number } | null => {
        const myRank = getCurrentUserRank();
        if (myRank <= 1) return null;

        const userAbove = users.find(u => u.rank === myRank - 1);
        const me = users.find(u => u.id === user?.id);

        if (userAbove && me) {
            return {
                name: userAbove.full_name || userAbove.username || 'Utilizador',
                xpNeeded: userAbove.current_xp - me.current_xp,
            };
        }
        return null;
    };

    const formatXP = (xp: number): string => {
        if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
        return xp.toString();
    };

    // ============================================
    // RENDER PODIUM
    // ============================================

    const renderPodium = () => {
        const top3 = users.slice(0, 3);
        if (top3.length === 0) return null;

        const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
        const heights = [100, 140, 80];

        return (
            <Animated.View
                style={[
                    styles.podiumContainer,
                    {
                        opacity: podiumAnim,
                        transform: [{
                            translateY: podiumAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0],
                            }),
                        }],
                    },
                ]}
            >
                {podiumOrder.map((u, index) => {
                    if (!u) return null;
                    const rank = u.rank as 1 | 2 | 3;
                    const podiumColor = PODIUM_COLORS[rank];
                    const isFirst = rank === 1;

                    return (
                        <Pressable
                            key={u.id}
                            style={styles.podiumItem}
                            onPress={() => router.push(`/user/${u.id}` as any)}
                        >
                            <View style={styles.podiumAvatarContainer}>
                                <Text style={styles.podiumIcon}>{podiumColor.icon}</Text>
                                {u.avatar_url ? (
                                    <Image
                                        source={{ uri: u.avatar_url }}
                                        style={[
                                            styles.podiumAvatar,
                                            isFirst && styles.podiumAvatarFirst,
                                            { borderColor: podiumColor.primary },
                                        ]}
                                    />
                                ) : (
                                    <View style={[
                                        styles.podiumAvatarPlaceholder,
                                        isFirst && styles.podiumAvatarFirst,
                                        { borderColor: podiumColor.primary, backgroundColor: `${podiumColor.primary}30` },
                                    ]}>
                                        <Text style={[styles.podiumAvatarText, { color: podiumColor.primary }]}>
                                            {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.podiumName} numberOfLines={1}>
                                {u.full_name || u.username || 'Anónimo'}
                            </Text>

                            <Text style={[styles.podiumXP, { color: podiumColor.primary }]}>
                                {formatXP(u.current_xp)} XP
                            </Text>

                            <LinearGradientComponent
                                colors={[podiumColor.primary, podiumColor.secondary]}
                                style={[styles.podiumPedestal, { height: heights[index] }]}
                            >
                                <Text style={styles.podiumRank}>#{rank}</Text>
                            </LinearGradientComponent>
                        </Pressable>
                    );
                })}
            </Animated.View>
        );
    };

    // ============================================
    // RENDER LIST ITEM
    // ============================================

    const renderListItem = ({ item }: { item: RankedUser }) => {
        const isCurrentUser = item.id === user?.id;
        const tierColor = TIER_COLORS[item.current_tier || 'Bronze'] || TIER_COLORS.Bronze;

        return (
            <Pressable
                style={[styles.listItem, isCurrentUser && styles.listItemHighlight]}
                onPress={() => router.push(`/user/${item.id}` as any)}
            >
                <View style={styles.rankContainer}>
                    <Text style={[styles.rankText, isCurrentUser && styles.rankTextHighlight]}>
                        #{item.rank}
                    </Text>
                </View>

                {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.listAvatar} />
                ) : (
                    <View style={styles.listAvatarPlaceholder}>
                        <Text style={styles.listAvatarText}>
                            {(item.full_name || item.username || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                <View style={styles.listInfo}>
                    <Text style={[styles.listName, isCurrentUser && styles.listNameHighlight]}>
                        {item.full_name || item.username || 'Utilizador'}
                        {isCurrentUser && ' (Tu)'}
                    </Text>
                    <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20` }]}>
                        <Text style={[styles.tierText, { color: tierColor }]}>
                            {item.current_tier || 'Bronze'}
                        </Text>
                    </View>
                </View>

                <View style={styles.xpBadge}>
                    <Ionicons name="flash" size={14} color={colors.accent.primary} />
                    <Text style={styles.xpText}>{formatXP(item.current_xp)}</Text>
                </View>
            </Pressable>
        );
    };

    // ============================================
    // RENDER FOOTER
    // ============================================

    const renderFooter = () => {
        const myRank = getCurrentUserRank();
        const nextRank = getXPToNextRank();
        const me = users.find(u => u.id === user?.id);

        if (!me || myRank === 0) return null;

        return (
            <View style={styles.footer}>
                <LinearGradientComponent
                    colors={[colors.accent.primary, colors.accent.dark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.footerGradient}
                >
                    <View style={styles.footerContent}>
                        <View style={styles.footerLeft}>
                            <Text style={styles.footerRank}>#{myRank}</Text>
                            <View>
                                <Text style={styles.footerTitle}>Tua Posição Global</Text>
                                <Text style={styles.footerXP}>{formatXP(me.current_xp)} XP</Text>
                            </View>
                        </View>
                        {nextRank && (
                            <View style={styles.footerRight}>
                                <Text style={styles.footerHint}>
                                    Faltam {nextRank.xpNeeded} XP
                                </Text>
                                <Text style={styles.footerTarget}>
                                    para passar {nextRank.name}
                                </Text>
                            </View>
                        )}
                    </View>
                </LinearGradientComponent>
            </View>
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
                    <Text style={styles.loadingText}>A carregar ranking global...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    const restOfUsers = users.slice(3);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>🌍 Ranking Global</Text>
                    <Text style={styles.headerSubtitle}>Top {users.length} estudantes</Text>
                </View>
                <Pressable style={styles.refreshButton} onPress={handleRefresh}>
                    <Ionicons name="refresh" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Podium */}
            {renderPodium()}

            {/* List */}
            <FlatList
                data={restOfUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderListItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent.primary}
                    />
                }
                ListEmptyComponent={
                    users.length <= 3 ? (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyListText}>
                                Apenas {users.length} utilizador{users.length !== 1 ? 'es' : ''} registados
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* Footer */}
            {renderFooter()}
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
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Podium
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing['3xl'],
        paddingBottom: spacing.xl,
        backgroundColor: colors.surface,
    },
    podiumItem: {
        alignItems: 'center',
        flex: 1,
        maxWidth: 120,
    },
    podiumAvatarContainer: {
        position: 'relative',
        marginBottom: spacing.sm,
    },
    podiumIcon: {
        fontSize: 24,
        position: 'absolute',
        top: -20,
        left: '50%',
        marginLeft: -12,
        zIndex: 1,
    },
    podiumAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
    },
    podiumAvatarFirst: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
    },
    podiumAvatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    podiumAvatarText: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    podiumName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        textAlign: 'center',
        maxWidth: 90,
    },
    podiumXP: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        marginTop: 2,
    },
    podiumPedestal: {
        width: '80%',
        marginTop: spacing.sm,
        borderTopLeftRadius: borderRadius.md,
        borderTopRightRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    podiumRank: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: 100,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    listItemHighlight: {
        backgroundColor: `${colors.accent.primary}15`,
        borderWidth: 2,
        borderColor: colors.accent.primary,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rankText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
    },
    rankTextHighlight: {
        color: colors.accent.primary,
    },
    listAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginLeft: spacing.sm,
    },
    listAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginLeft: spacing.sm,
        backgroundColor: colors.accent.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listAvatarText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    listInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    listName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    listNameHighlight: {
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    tierBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginTop: 4,
    },
    tierText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent.subtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    xpText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    emptyList: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyListText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    footerGradient: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    footerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    footerRank: {
        fontSize: typography.size['3xl'],
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    footerTitle: {
        fontSize: typography.size.xs,
        color: 'rgba(255,255,255,0.8)',
    },
    footerXP: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    footerRight: {
        alignItems: 'flex-end',
    },
    footerHint: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    footerTarget: {
        fontSize: typography.size.xs,
        color: 'rgba(255,255,255,0.8)',
    },
});
