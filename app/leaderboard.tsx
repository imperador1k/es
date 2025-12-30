/**
 * Global Leaderboard Screen - ABSURDAMENTE PREMIUM
 * Ranking global épico com pódio 3D, animações, efeitos visuais insanos
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const { width } = Dimensions.get('window');

// ============================================
// CONSTANTS - ABSURDAS
// ============================================

const PODIUM_CONFIG = {
    1: {
        gradient: ['#FFD700', '#F59E0B', '#D97706'] as const,
        icon: '👑',
        label: 'CAMPEÃO',
        size: 90,
        pedestalH: 140,
    },
    2: {
        gradient: ['#C0C0C0', '#9CA3AF', '#6B7280'] as const,
        icon: '🥈',
        label: 'VICE',
        size: 70,
        pedestalH: 100,
    },
    3: {
        gradient: ['#CD7F32', '#B45309', '#92400E'] as const,
        icon: '🥉',
        label: 'BRONZE',
        size: 70,
        pedestalH: 80,
    },
};

const TIER_CONFIG: Record<string, { gradient: readonly [string, string]; emoji: string }> = {
    'Bronze': { gradient: ['#CD7F32', '#92400E'], emoji: '🥉' },
    'Prata': { gradient: ['#C0C0C0', '#6B7280'], emoji: '🥈' },
    'Ouro': { gradient: ['#FFD700', '#D97706'], emoji: '🥇' },
    'Platina': { gradient: ['#E5E4E2', '#9CA3AF'], emoji: '💎' },
    'Diamante': { gradient: ['#60A5FA', '#3B82F6'], emoji: '💠' },
    'Mestre': { gradient: ['#A855F7', '#7C3AED'], emoji: '🔮' },
};

// ============================================
// COMPONENT
// ============================================

export default function GlobalLeaderboardScreen() {
    const { user } = useAuthContext();

    const [users, setUsers] = useState<RankedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const podiumAnim = useRef(new Animated.Value(0)).current;
    const headerAnim = useRef(new Animated.Value(0)).current;

    // ============================================
    // LOAD DATA
    // ============================================

    const loadLeaderboard = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, current_xp, current_tier')
                .order('current_xp', { ascending: false })
                .limit(100);

            if (error) throw error;

            const rankedUsers: RankedUser[] = (data || []).map((u, index) => ({
                ...u,
                current_xp: u.current_xp || 0,
                current_tier: u.current_tier || 'Bronze',
                rank: index + 1,
            }));

            setUsers(rankedUsers);

            // Epic animations
            Animated.parallel([
                Animated.spring(headerAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
                Animated.spring(podiumAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true, delay: 200 }),
            ]).start();
        } catch (err) {
            console.error('Erro ao carregar leaderboard:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

    // ============================================
    // HELPERS
    // ============================================

    const getCurrentUserRank = (): number => users.find((u) => u.id === user?.id)?.rank || 0;

    const getXPToNextRank = () => {
        const myRank = getCurrentUserRank();
        if (myRank <= 1) return null;
        const above = users.find((u) => u.rank === myRank - 1);
        const me = users.find((u) => u.id === user?.id);
        if (above && me) return { name: above.full_name || above.username || '???', xpNeeded: above.current_xp - me.current_xp };
        return null;
    };

    const formatXP = (xp: number): string => (xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp.toString());

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar ranking...</Text>
                </View>
            </View>
        );
    }

    const top3 = users.slice(0, 3);
    const rest = users.slice(3);
    const myRank = getCurrentUserRank();
    const me = users.find((u) => u.id === user?.id);
    const nextRank = getXPToNextRank();

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Epic Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>🌍 Ranking Global</Text>
                        <Text style={styles.headerSubtitle}>Top {users.length} Estudantes</Text>
                    </View>
                    <Pressable style={styles.refreshButton} onPress={() => { setRefreshing(true); loadLeaderboard(); }}>
                        <Ionicons name="refresh" size={20} color={COLORS.text.tertiary} />
                    </Pressable>
                </Animated.View>

                {/* Epic Podium */}
                <Animated.View style={[styles.podiumSection, { opacity: podiumAnim, transform: [{ scale: podiumAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
                    <LinearGradient colors={['rgba(99, 102, 241, 0.1)', 'transparent']} style={styles.podiumGradient}>
                        <View style={styles.podiumRow}>
                            {[top3[1], top3[0], top3[2]].map((u, idx) => {
                                if (!u) return <View key={idx} style={styles.podiumSlot} />;
                                const rank = u.rank as 1 | 2 | 3;
                                const config = PODIUM_CONFIG[rank];
                                const isFirst = rank === 1;

                                return (
                                    <Pressable key={u.id} style={styles.podiumSlot} onPress={() => router.push(`/user/${u.id}` as any)}>
                                        {/* Crown/Medal */}
                                        <Text style={[styles.podiumMedal, isFirst && styles.podiumMedalFirst]}>{config.icon}</Text>

                                        {/* Avatar with glow */}
                                        <View style={[styles.podiumAvatarWrap, { shadowColor: config.gradient[0] }]}>
                                            {u.avatar_url ? (
                                                <Image source={{ uri: u.avatar_url }} style={[styles.podiumAvatar, { width: config.size, height: config.size, borderRadius: config.size / 2 }]} />
                                            ) : (
                                                <LinearGradient colors={config.gradient} style={[styles.podiumAvatarPlaceholder, { width: config.size, height: config.size, borderRadius: config.size / 2 }]}>
                                                    <Text style={styles.podiumAvatarText}>{(u.full_name || u.username || '?')[0].toUpperCase()}</Text>
                                                </LinearGradient>
                                            )}
                                        </View>

                                        {/* Name */}
                                        <Text style={styles.podiumName} numberOfLines={1}>{u.full_name || u.username}</Text>

                                        {/* XP */}
                                        <View style={styles.podiumXPBadge}>
                                            <Ionicons name="flash" size={12} color="#FFD700" />
                                            <Text style={styles.podiumXPText}>{formatXP(u.current_xp)}</Text>
                                        </View>

                                        {/* Pedestal */}
                                        <LinearGradient colors={config.gradient} style={[styles.pedestal, { height: config.pedestalH }]}>
                                            <Text style={styles.pedestalRank}>#{rank}</Text>
                                            <Text style={styles.pedestalLabel}>{config.label}</Text>
                                        </LinearGradient>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>CLASSIFICAÇÃO</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* List */}
                <FlatList
                    data={rest}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <RankRow user={item} currentUserId={user?.id} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLeaderboard(); }} tintColor="#6366F1" />}
                />

                {/* My Position Footer */}
                {me && (
                    <View style={styles.footer}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.footerGradient}>
                            <View style={styles.footerLeft}>
                                <Text style={styles.footerRank}>#{myRank}</Text>
                                <View>
                                    <Text style={styles.footerLabel}>Tua Posição</Text>
                                    <Text style={styles.footerXP}>{formatXP(me.current_xp)} XP</Text>
                                </View>
                            </View>
                            {nextRank && (
                                <View style={styles.footerRight}>
                                    <Text style={styles.footerNext}>-{nextRank.xpNeeded} XP</Text>
                                    <Text style={styles.footerNextLabel}>para #{myRank - 1}</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

// ============================================
// RANK ROW COMPONENT
// ============================================

function RankRow({ user, currentUserId }: { user: RankedUser; currentUserId?: string }) {
    const scale = useRef(new Animated.Value(1)).current;
    const isMe = user.id === currentUserId;
    const tier = TIER_CONFIG[user.current_tier || 'Bronze'] || TIER_CONFIG.Bronze;

    const formatXP = (xp: number) => (xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp.toString());

    // Rank badge color based on position
    const getRankColor = () => {
        if (user.rank <= 10) return '#F59E0B';
        if (user.rank <= 25) return '#6366F1';
        if (user.rank <= 50) return '#22C55E';
        return COLORS.text.tertiary;
    };

    return (
        <Pressable
            onPress={() => router.push(`/user/${user.id}` as any)}
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={[styles.rankRow, isMe && styles.rankRowMe, { transform: [{ scale }] }]}>
                {/* Rank Badge */}
                <View style={[styles.rankBadge, { backgroundColor: `${getRankColor()}20` }]}>
                    <Text style={[styles.rankBadgeText, { color: getRankColor() }]}>#{user.rank}</Text>
                </View>

                {/* Avatar */}
                {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.rowAvatar} />
                ) : (
                    <LinearGradient colors={tier.gradient} style={styles.rowAvatarPlaceholder}>
                        <Text style={styles.rowAvatarText}>{(user.full_name || user.username || '?')[0].toUpperCase()}</Text>
                    </LinearGradient>
                )}

                {/* Info */}
                <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                        {user.full_name || user.username || 'Anónimo'}
                        {isMe && ' (Tu)'}
                    </Text>
                    <View style={styles.rowMeta}>
                        <LinearGradient colors={tier.gradient} style={styles.tierBadge}>
                            <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                            <Text style={styles.tierLabel}>{user.current_tier}</Text>
                        </LinearGradient>
                    </View>
                </View>

                {/* XP */}
                <View style={styles.rowXP}>
                    <Ionicons name="flash" size={16} color="#FFD700" />
                    <Text style={styles.rowXPText}>{formatXP(user.current_xp)}</Text>
                </View>
            </Animated.View>
        </Pressable>
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerContent: { flex: 1, marginLeft: SPACING.md },
    headerTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
    refreshButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },

    // Podium
    podiumSection: { marginBottom: SPACING.md },
    podiumGradient: { paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: SPACING.md },
    podiumSlot: { alignItems: 'center', flex: 1, maxWidth: 130 },
    podiumMedal: { fontSize: 28, marginBottom: -8, zIndex: 10 },
    podiumMedalFirst: { fontSize: 36 },
    podiumAvatarWrap: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 },
    podiumAvatar: { borderWidth: 3, borderColor: '#FFF' },
    podiumAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
    podiumAvatarText: { fontSize: 28, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    podiumName: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary, marginTop: SPACING.sm, maxWidth: 100, textAlign: 'center' },
    podiumXPBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 215, 0, 0.15)', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: 4 },
    podiumXPText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFD700' },
    pedestal: { width: '85%', marginTop: SPACING.md, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md },
    pedestalRank: { fontSize: TYPOGRAPHY.size['3xl'], fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    pedestalLabel: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.bold, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },

    // Divider
    divider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.surfaceElevated },
    dividerText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.tertiary, marginHorizontal: SPACING.md, letterSpacing: 1 },

    // List
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },

    // Rank Row
    rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    rankRowMe: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    rankBadge: { width: 48, height: 32, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
    rankBadgeText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold },
    rowAvatar: { width: 48, height: 48, borderRadius: 24, marginLeft: SPACING.sm },
    rowAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, marginLeft: SPACING.sm, alignItems: 'center', justifyContent: 'center' },
    rowAvatarText: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    rowInfo: { flex: 1, marginLeft: SPACING.md },
    rowName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.primary },
    rowNameMe: { fontWeight: TYPOGRAPHY.weight.bold, color: '#6366F1' },
    rowMeta: { flexDirection: 'row', marginTop: 4 },
    tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
    tierEmoji: { fontSize: 10 },
    tierLabel: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
    rowXP: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.xl },
    rowXPText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFD700' },

    // Footer
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    footerGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, paddingBottom: 40 },
    footerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    footerRank: { fontSize: 36, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    footerLabel: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.7)' },
    footerXP: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    footerRight: { alignItems: 'flex-end' },
    footerNext: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    footerNextLabel: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.7)' },
});
