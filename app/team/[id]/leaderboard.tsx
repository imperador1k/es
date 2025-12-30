/**
 * Team Leaderboard Screen - Premium Dark Design
 * Ranking de membros por XP com design moderno
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const PODIUM_CONFIG = {
    1: { color: '#FFD700', icon: '👑', height: 120 },
    2: { color: '#C0C0C0', icon: '🥈', height: 90 },
    3: { color: '#CD7F32', icon: '🥉', height: 70 },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamLeaderboardScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();

    const [members, setMembers] = useState<LeaderboardMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teamName, setTeamName] = useState('');

    // ============================================
    // LOAD DATA
    // ============================================

    const loadLeaderboard = useCallback(async () => {
        if (!teamId) return;

        try {
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

            const { data: teamData } = await supabase
                .from('teams')
                .select('name')
                .eq('id', teamId)
                .single();
            if (teamData) setTeamName(teamData.name);
        } catch (err) {
            console.error('Error loading leaderboard:', err);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadLeaderboard();
        setRefreshing(false);
    };

    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    // ============================================
    // HELPERS
    // ============================================

    const formatXP = (xp: number): string => {
        if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
        return xp.toString();
    };

    const getMyRank = () => members.find((m) => m.user_id === user?.id)?.rank || 0;

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFD700" />
                    <Text style={styles.loadingText}>A carregar ranking...</Text>
                </View>
            </View>
        );
    }

    const top3 = members.slice(0, 3);
    const restMembers = members.slice(3);

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>🏆 Ranking</Text>
                        <Text style={styles.headerSubtitle}>{teamName}</Text>
                    </View>
                    <Pressable style={styles.refreshButton} onPress={handleRefresh}>
                        <Ionicons name="refresh" size={20} color={COLORS.text.tertiary} />
                    </Pressable>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFD700" />
                    }
                >
                    {/* Podium Section */}
                    {top3.length > 0 && (
                        <View style={styles.podiumSection}>
                            <LinearGradient
                                colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
                                style={styles.podiumGradient}
                            />

                            <View style={styles.podiumRow}>
                                {/* 2nd Place */}
                                {top3[1] && <PodiumCard member={top3[1]} position={2} />}

                                {/* 1st Place */}
                                {top3[0] && <PodiumCard member={top3[0]} position={1} />}

                                {/* 3rd Place */}
                                {top3[2] && <PodiumCard member={top3[2]} position={3} />}
                            </View>
                        </View>
                    )}

                    {/* Rest of Members */}
                    {restMembers.length > 0 && (
                        <View style={styles.listSection}>
                            <Text style={styles.sectionTitle}>
                                Restantes Membros ({restMembers.length})
                            </Text>

                            {restMembers.map((member) => (
                                <MemberCard key={member.user_id} member={member} isCurrentUser={member.user_id === user?.id} />
                            ))}
                        </View>
                    )}

                    {restMembers.length === 0 && members.length > 0 && members.length <= 3 && (
                        <View style={styles.emptyMessage}>
                            <Text style={styles.emptyText}>Todos os membros estão no pódio! 🎉</Text>
                        </View>
                    )}
                </ScrollView>

                {/* My Position Footer */}
                {getMyRank() > 0 && (
                    <View style={styles.footer}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.footerGradient}>
                            <View style={styles.footerContent}>
                                <Text style={styles.footerRank}>#{getMyRank()}</Text>
                                <View>
                                    <Text style={styles.footerLabel}>Tua Posição</Text>
                                    <Text style={styles.footerXP}>
                                        {formatXP(members.find((m) => m.user_id === user?.id)?.current_xp || 0)} XP
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

// ============================================
// PODIUM CARD
// ============================================

function PodiumCard({ member, position }: { member: LeaderboardMember; position: 1 | 2 | 3 }) {
    const scale = useRef(new Animated.Value(1)).current;
    const config = PODIUM_CONFIG[position];
    const isFirst = position === 1;

    return (
        <Pressable
            onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={() => router.push(`/user/${member.user_id}` as any)}
        >
            <Animated.View style={[styles.podiumCard, isFirst && styles.podiumCardFirst, { transform: [{ scale }] }]}>
                {/* Icon */}
                <Text style={styles.podiumIcon}>{config.icon}</Text>

                {/* Avatar */}
                {member.avatar_url ? (
                    <Image
                        source={{ uri: member.avatar_url }}
                        style={[styles.podiumAvatar, isFirst && styles.podiumAvatarFirst, { borderColor: config.color }]}
                    />
                ) : (
                    <View style={[styles.podiumAvatarPlaceholder, isFirst && styles.podiumAvatarFirst, { borderColor: config.color, backgroundColor: `${config.color}20` }]}>
                        <Text style={[styles.podiumInitial, { color: config.color }]}>
                            {(member.full_name || member.username || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Name */}
                <Text style={styles.podiumName} numberOfLines={1}>
                    {member.full_name || member.username || 'Anónimo'}
                </Text>

                {/* XP */}
                <Text style={[styles.podiumXP, { color: config.color }]}>
                    {member.current_xp} XP
                </Text>

                {/* Pedestal */}
                <LinearGradient colors={[config.color, `${config.color}80`]} style={[styles.pedestal, { height: config.height }]}>
                    <Text style={styles.pedestalRank}>#{position}</Text>
                </LinearGradient>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// MEMBER CARD
// ============================================

function MemberCard({ member, isCurrentUser }: { member: LeaderboardMember; isCurrentUser: boolean }) {
    const scale = useRef(new Animated.Value(1)).current;

    return (
        <Pressable
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={() => router.push(`/user/${member.user_id}` as any)}
        >
            <Animated.View style={[styles.memberCard, isCurrentUser && styles.memberCardHighlight, { transform: [{ scale }] }]}>
                {/* Rank */}
                <View style={styles.rankBadge}>
                    <Text style={[styles.rankText, isCurrentUser && styles.rankTextHighlight]}>#{member.rank}</Text>
                </View>

                {/* Avatar */}
                {member.avatar_url ? (
                    <Image source={{ uri: member.avatar_url }} style={styles.memberAvatar} />
                ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.memberInitial}>
                            {(member.full_name || member.username || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Info */}
                <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, isCurrentUser && styles.memberNameHighlight]}>
                        {member.full_name || member.username || 'Utilizador'}
                        {isCurrentUser && ' (Tu)'}
                    </Text>
                    <Text style={styles.memberTier}>{member.current_tier || 'Bronze'}</Text>
                </View>

                {/* XP Badge */}
                <View style={styles.xpBadge}>
                    <Ionicons name="flash" size={14} color="#FFD700" />
                    <Text style={styles.xpText}>{member.current_xp}</Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    scrollContent: {
        paddingBottom: 120,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Podium Section
    podiumSection: {
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    podiumGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    podiumRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },

    // Podium Card
    podiumCard: {
        alignItems: 'center',
        width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm * 2) / 3,
        maxWidth: 110,
    },
    podiumCardFirst: {
        marginTop: -20,
    },
    podiumIcon: {
        fontSize: 28,
        marginBottom: SPACING.xs,
    },
    podiumAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
    },
    podiumAvatarFirst: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
    },
    podiumAvatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    podiumInitial: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    podiumName: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginTop: SPACING.sm,
        maxWidth: 100,
    },
    podiumXP: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.bold,
        marginTop: 2,
    },
    pedestal: {
        width: '90%',
        marginTop: SPACING.md,
        borderTopLeftRadius: RADIUS.lg,
        borderTopRightRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pedestalRank: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // List Section
    listSection: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
        marginBottom: SPACING.md,
    },

    // Member Card
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    memberCardHighlight: {
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    rankBadge: {
        width: 40,
        alignItems: 'center',
    },
    rankText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.tertiary,
    },
    rankTextHighlight: {
        color: '#6366F1',
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginLeft: SPACING.sm,
    },
    memberAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginLeft: SPACING.sm,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberInitial: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.secondary,
    },
    memberInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    memberName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    memberNameHighlight: {
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#6366F1',
    },
    memberTier: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
        gap: 4,
    },
    xpText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFD700',
    },

    // Empty
    emptyMessage: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    footerGradient: {
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        paddingBottom: 40,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.lg,
    },
    footerRank: {
        fontSize: 32,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    footerLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: 'rgba(255,255,255,0.7)',
    },
    footerXP: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
});
