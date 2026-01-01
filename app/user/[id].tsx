/**
 * User Profile Detail Screen - Premium Dark Design
 * Ecrã para ver detalhes de perfil de outro utilizador
 * Inclui badges reais, stats e ações sociais
 */

import { useStartConversation } from '@/hooks/useDMs';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { getUserBadges, UserBadge } from '@/services/badgeService';
import { Profile, Tier } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// CONSTANTS
// ============================================

const TIER_CONFIG: Record<Tier, { emoji: string; gradient: [string, string]; text: string }> = {
    Bronze: { emoji: '🥉', gradient: ['#CD7F32', '#8B4513'], text: '#CD7F32' },
    Prata: { emoji: '🥈', gradient: ['#C0C0C0', '#808080'], text: '#C0C0C0' },
    Ouro: { emoji: '🥇', gradient: ['#FFD700', '#FFA500'], text: '#F59E0B' },
    Platina: { emoji: '💎', gradient: ['#E5E4E2', '#A8A9AD'], text: '#94A3B8' },
    Diamante: { emoji: '👑', gradient: ['#60A5FA', '#3B82F6'], text: '#3B82F6' },
    Elite: { emoji: '🔥', gradient: ['#A855F7', '#7C3AED'], text: '#7C3AED' },
};

// ============================================
// COMPONENT
// ============================================

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user: currentUser } = useAuthContext();
    const { friends, sendFriendRequest, pendingRequests } = useFriends();
    const { startOrGetConversation } = useStartConversation();

    // State
    const [profile, setProfile] = useState<Profile | null>(null);
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Verificar relação
    const isFriend = friends.some(f => f.friend_id === id);
    const hasPending = pendingRequests.some(p => p.friend_id === id);
    const isMe = id === currentUser?.id;

    // Carregar dados
    useEffect(() => {
        async function loadData() {
            if (!id) return;
            try {
                setLoading(true);

                // Carregar perfil
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProfile(data as Profile);

                // Carregar badges
                const userBadges = await getUserBadges(id);
                setBadges(userBadges);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    // Handlers
    const handleAddFriend = async () => {
        if (!id) return;
        setSending(true);
        const success = await sendFriendRequest(id);
        setSending(false);
        if (success) {
            Alert.alert('✅ Pedido Enviado!', 'O teu pedido de amizade foi enviado.');
        }
    };

    const handleMessage = async () => {
        if (!id) return;
        const convId = await startOrGetConversation(id);
        if (convId) {
            router.push(`/dm/${convId}` as any);
        }
    };

    // Loading
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // Error
    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="person-outline" size={64} color={COLORS.text.tertiary} />
                    <Text style={styles.errorText}>Utilizador não encontrado</Text>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Voltar</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // Computed
    const tier = (profile.current_tier || 'Bronze') as Tier;
    const tierConfig = TIER_CONFIG[tier];
    const level = Math.floor((profile.current_xp || 0) / 200) + 1;
    const xpProgress = ((profile.current_xp || 0) % 200) / 200;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={tierConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Perfil</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Hero Card */}
                <View style={styles.heroCard}>
                    {/* Avatar with Tier Ring */}
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={tierConfig.gradient}
                            style={styles.avatarRing}
                        >
                            {profile.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitial}>
                                        {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                        {/* Level Badge */}
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>{level}</Text>
                        </View>
                    </View>

                    {/* Name & Username */}
                    <Text style={styles.name}>{profile.full_name || profile.username}</Text>
                    <Text style={styles.username}>@{profile.username || 'utilizador'}</Text>

                    {/* Tier Badge */}
                    <LinearGradient
                        colors={tierConfig.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.tierBadge}
                    >
                        <Text style={styles.tierEmoji}>{tierConfig.emoji}</Text>
                        <Text style={styles.tierText}>{tier}</Text>
                    </LinearGradient>

                    {/* XP Progress */}
                    <View style={styles.xpContainer}>
                        <View style={styles.xpBar}>
                            <LinearGradient
                                colors={tierConfig.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.xpFill, { width: `${xpProgress * 100}%` }]}
                            />
                        </View>
                        <Text style={styles.xpText}>
                            {(profile.current_xp || 0) % 200} / 200 XP
                        </Text>
                    </View>

                    {/* Actions */}
                    {!isMe && (
                        <View style={styles.actions}>
                            {isFriend ? (
                                <Pressable style={styles.messageBtn} onPress={handleMessage}>
                                    <LinearGradient
                                        colors={[COLORS.accent.primary, COLORS.accent.dark]}
                                        style={styles.actionGradient}
                                    >
                                        <Ionicons name="chatbubble" size={18} color="#FFF" />
                                        <Text style={styles.actionBtnText}>Mensagem</Text>
                                    </LinearGradient>
                                </Pressable>
                            ) : hasPending ? (
                                <View style={styles.pendingBtn}>
                                    <Ionicons name="time-outline" size={18} color={COLORS.text.secondary} />
                                    <Text style={styles.pendingBtnText}>Pedido Pendente</Text>
                                </View>
                            ) : (
                                <Pressable
                                    style={[styles.addBtn, sending && styles.addBtnDisabled]}
                                    onPress={handleAddFriend}
                                    disabled={sending}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#059669']}
                                        style={styles.actionGradient}
                                    >
                                        {sending ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="person-add" size={18} color="#FFF" />
                                                <Text style={styles.actionBtnText}>Adicionar</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={['#8B5CF6', '#6D28D9']}
                            style={styles.statIcon}
                        >
                            <Ionicons name="flash" size={20} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.statValue}>{(profile.current_xp || 0).toLocaleString()}</Text>
                        <Text style={styles.statLabel}>XP Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            style={styles.statIcon}
                        >
                            <Ionicons name="flame" size={20} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.statValue}>{profile.current_streak || 0}</Text>
                        <Text style={styles.statLabel}>Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.statIcon}
                        >
                            <Ionicons name="trophy" size={20} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.statValue}>{badges.length}</Text>
                        <Text style={styles.statLabel}>Badges</Text>
                    </View>
                </View>

                {/* Badges Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏆 Conquistas</Text>
                        <Text style={styles.sectionCount}>{badges.length}</Text>
                    </View>

                    {badges.length > 0 ? (
                        <View style={styles.badgesGrid}>
                            {badges.map((ub) => (
                                <View key={ub.id} style={styles.badgeCard}>
                                    <Text style={styles.badgeEmoji}>
                                        {ub.badge?.icon || '🏅'}
                                    </Text>
                                    <Text style={styles.badgeName} numberOfLines={1}>
                                        {ub.badge?.name || 'Badge'}
                                    </Text>
                                    <Text style={styles.badgeDate}>
                                        {new Date(ub.unlocked_at).toLocaleDateString('pt-PT', {
                                            day: '2-digit',
                                            month: 'short',
                                        })}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyBadges}>
                            <Ionicons name="ribbon-outline" size={48} color={COLORS.text.tertiary} />
                            <Text style={styles.emptyText}>
                                {isMe ? 'Ainda não tens badges' : 'Este utilizador ainda não tem badges'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Bottom Spacer */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
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
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.lg,
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.lg,
        color: COLORS.text.primary,
    },
    backBtn: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    backBtnText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },

    // Header
    headerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
    },

    // Hero Card
    heroCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING['2xl'],
        alignItems: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.lg,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    avatarRing: {
        width: 110,
        height: 110,
        borderRadius: 55,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 102,
        height: 102,
        borderRadius: 51,
        borderWidth: 3,
        borderColor: COLORS.background,
    },
    avatarFallback: {
        width: 102,
        height: 102,
        borderRadius: 51,
        backgroundColor: COLORS.surfaceElevated,
        borderWidth: 3,
        borderColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    levelBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.surface,
    },
    levelText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    name: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    username: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        marginTop: SPACING.md,
        gap: SPACING.xs,
    },
    tierEmoji: {
        fontSize: 16,
    },
    tierText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    xpContainer: {
        width: '100%',
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    xpBar: {
        width: '100%',
        height: 6,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: 3,
        overflow: 'hidden',
    },
    xpFill: {
        height: '100%',
        borderRadius: 3,
    },
    xpText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        marginTop: SPACING.xl,
        gap: SPACING.md,
    },
    messageBtn: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    addBtn: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    addBtnDisabled: {
        opacity: 0.7,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
    },
    actionBtnText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    pendingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceMuted,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        gap: SPACING.sm,
    },
    pendingBtnText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    statValue: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Section
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    sectionCount: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.accent.primary,
        backgroundColor: COLORS.accent.subtle,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },

    // Badges Grid
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    badgeCard: {
        width: '30%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    badgeEmoji: {
        fontSize: 32,
        marginBottom: SPACING.xs,
    },
    badgeName: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    badgeDate: {
        fontSize: 10,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    emptyBadges: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING['2xl'],
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.sm,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        textAlign: 'center',
    },
});
