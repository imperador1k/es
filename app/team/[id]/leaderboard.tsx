/**
 * Team Leaderboard Screen
 * Ranking de membros por XP com estilo gamificado (Duolingo/jogos)
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// LinearGradient pode falhar na web, usar View como fallback
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

interface LeaderboardMember {
    user_id: string;
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
    1: { primary: '#FFD700', secondary: '#FFA500', icon: '👑' }, // Ouro
    2: { primary: '#C0C0C0', secondary: '#A0A0A0', icon: '🥈' }, // Prata
    3: { primary: '#CD7F32', secondary: '#8B4513', icon: '🥉' }, // Bronze
};

const TIER_LEVELS = [
    { name: 'Bronze', minXP: 0, color: '#CD7F32' },
    { name: 'Prata', minXP: 500, color: '#C0C0C0' },
    { name: 'Ouro', minXP: 1500, color: '#FFD700' },
    { name: 'Platina', minXP: 3000, color: '#E5E4E2' },
    { name: 'Diamante', minXP: 5000, color: '#B9F2FF' },
    { name: 'Mestre', minXP: 10000, color: '#9B30FF' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamLeaderboardScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();

    const [members, setMembers] = useState<LeaderboardMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [teamName, setTeamName] = useState('');

    // Animações para o pódio
    const podiumAnim = new Animated.Value(0);

    // ============================================
    // LOAD LEADERBOARD DATA
    // ============================================

    const loadLeaderboard = useCallback(async () => {
        if (!teamId) return;

        try {
            setLoading(true);

            // Buscar membros com perfis ordenados por XP
            const { data, error } = await supabase
                .from('team_members')
                .select(`
                    user_id,
                    profiles!user_id (
                        username,
                        full_name,
                        avatar_url,
                        current_xp,
                        current_tier
                    )
                `)
                .eq('team_id', teamId);

            if (error) throw error;

            // Processar e ordenar por XP
            const processedMembers: LeaderboardMember[] = (data || [])
                .map((m: any) => {
                    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                    return {
                        user_id: m.user_id,
                        username: profile?.username || null,
                        full_name: profile?.full_name || null,
                        avatar_url: profile?.avatar_url || null,
                        current_xp: profile?.current_xp || 0,
                        current_tier: profile?.current_tier || 'Bronze',
                        rank: 0,
                    };
                })
                .sort((a, b) => b.current_xp - a.current_xp)
                .map((m, index) => ({ ...m, rank: index + 1 }));

            setMembers(processedMembers);

            // Buscar nome da equipa
            const { data: teamData } = await supabase
                .from('teams')
                .select('name')
                .eq('id', teamId)
                .single();
            if (teamData) setTeamName(teamData.name);

            // Animar entrada do pódio
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
        }
    }, [teamId]);

    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    // ============================================
    // HELPERS
    // ============================================

    const getCurrentUserRank = (): number => {
        const userMember = members.find(m => m.user_id === user?.id);
        return userMember?.rank || 0;
    };

    const getXPToNextRank = (): { name: string; xpNeeded: number } | null => {
        const myRank = getCurrentUserRank();
        if (myRank <= 1) return null;

        const userAbove = members.find(m => m.rank === myRank - 1);
        const me = members.find(m => m.user_id === user?.id);

        if (userAbove && me) {
            return {
                name: userAbove.full_name || userAbove.username || 'Utilizador',
                xpNeeded: userAbove.current_xp - me.current_xp,
            };
        }
        return null;
    };

    const formatXP = (xp: number): string => {
        if (xp >= 1000) {
            return `${(xp / 1000).toFixed(1)}k`;
        }
        return xp.toString();
    };

    // ============================================
    // RENDER PODIUM (TOP 3)
    // ============================================

    const renderPodium = () => {
        const top3 = members.slice(0, 3);
        if (top3.length === 0) return null;

        // Reordenar para 2º-1º-3º (visual do pódio)
        const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
        const heights = [100, 140, 80];

        return (
            <Animated.View
                style={[
                    styles.podiumContainer,
                    {
                        opacity: podiumAnim,
                        transform: [
                            {
                                translateY: podiumAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [50, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                {podiumOrder.map((member, index) => {
                    if (!member) return null;
                    const rank = member.rank as 1 | 2 | 3;
                    const podiumColor = PODIUM_COLORS[rank];
                    const isFirst = rank === 1;

                    return (
                        <View key={member.user_id} style={styles.podiumItem}>
                            {/* Avatar com coroa/medalha */}
                            <View style={styles.podiumAvatarContainer}>
                                <Text style={styles.podiumIcon}>{podiumColor.icon}</Text>
                                {member.avatar_url ? (
                                    <Image source={{ uri: member.avatar_url }} style={[
                                        styles.podiumAvatar,
                                        isFirst && styles.podiumAvatarFirst,
                                        { borderColor: podiumColor.primary },
                                    ]} />
                                ) : (
                                    <View style={[
                                        styles.podiumAvatarPlaceholder,
                                        isFirst && styles.podiumAvatarFirst,
                                        { borderColor: podiumColor.primary, backgroundColor: `${podiumColor.primary}30` },
                                    ]}>
                                        <Text style={[styles.podiumAvatarText, { color: podiumColor.primary }]}>
                                            {(member.full_name || member.username || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Nome */}
                            <Text style={styles.podiumName} numberOfLines={1}>
                                {member.full_name || member.username || 'Anónimo'}
                            </Text>

                            {/* XP */}
                            <Text style={[styles.podiumXP, { color: podiumColor.primary }]}>
                                {formatXP(member.current_xp)} XP
                            </Text>

                            {/* Pedestal */}
                            <LinearGradientComponent
                                colors={[podiumColor.primary, podiumColor.secondary]}
                                style={[styles.podiumPedestal, { height: heights[index] }]}
                            >
                                <Text style={styles.podiumRank}>#{rank}</Text>
                            </LinearGradientComponent>
                        </View>
                    );
                })}
            </Animated.View>
        );
    };

    // ============================================
    // RENDER LIST ITEM (4th and below)
    // ============================================

    const renderListItem = ({ item }: { item: LeaderboardMember }) => {
        const isCurrentUser = item.user_id === user?.id;

        return (
            <Pressable
                style={[
                    styles.listItem,
                    isCurrentUser && styles.listItemHighlight,
                ]}
                onPress={() => router.push(`/user/${item.user_id}` as any)}
            >
                {/* Rank */}
                <View style={styles.rankContainer}>
                    <Text style={[styles.rankText, isCurrentUser && styles.rankTextHighlight]}>
                        #{item.rank}
                    </Text>
                </View>

                {/* Avatar */}
                {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.listAvatar} />
                ) : (
                    <View style={styles.listAvatarPlaceholder}>
                        <Text style={styles.listAvatarText}>
                            {(item.full_name || item.username || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Info */}
                <View style={styles.listInfo}>
                    <Text style={[styles.listName, isCurrentUser && styles.listNameHighlight]}>
                        {item.full_name || item.username || 'Utilizador'}
                        {isCurrentUser && ' (Tu)'}
                    </Text>
                    <Text style={styles.listTier}>{item.current_tier || 'Bronze'}</Text>
                </View>

                {/* XP */}
                <View style={styles.xpBadge}>
                    <Ionicons name="flash" size={14} color={colors.accent.primary} />
                    <Text style={styles.xpText}>{formatXP(item.current_xp)}</Text>
                </View>
            </Pressable>
        );
    };

    // ============================================
    // RENDER FOOTER (Status atual)
    // ============================================

    const renderFooter = () => {
        const myRank = getCurrentUserRank();
        const nextRank = getXPToNextRank();
        const me = members.find(m => m.user_id === user?.id);

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
                                <Text style={styles.footerTitle}>Tua Posição</Text>
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
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                    <Text style={styles.loadingText}>A carregar ranking...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    const restOfMembers = members.slice(3);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>🏆 Ranking</Text>
                    <Text style={styles.headerSubtitle}>{teamName}</Text>
                </View>
                <Pressable style={styles.refreshButton} onPress={loadLeaderboard}>
                    <Ionicons name="refresh" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Podium */}
            {renderPodium()}

            {/* List */}
            <FlatList
                data={restOfMembers}
                keyExtractor={(item) => item.user_id}
                renderItem={renderListItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    members.length <= 3 ? (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyListText}>
                                Apenas {members.length} membro{members.length !== 1 ? 's' : ''} na equipa
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
    listTier: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
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
