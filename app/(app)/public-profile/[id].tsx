/**
 * Public Profile Page
 * View another user's profile with avatar, tier, XP, badges
 * + Friendship status and actions
 */

import { useStartConversation } from '@/hooks/useDMs';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
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
// TYPES
// ============================================

interface UserProfile {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    current_tier: string;
    total_xp: number;
    streak_days: number;
    focus_minutes: number;
    badges: string[];
    bio: string | null;
}

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

interface Friendship {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: 'pending' | 'accepted' | 'rejected';
}

// Tier colors
const TIER_COLORS: Record<string, string[]> = {
    Bronze: ['#CD7F32', '#B8860B'],
    Silver: ['#C0C0C0', '#A8A8A8'],
    Gold: ['#FFD700', '#FFA500'],
    Platinum: ['#E5E4E2', '#B0C4DE'],
    Diamond: ['#B9F2FF', '#00CED1'],
    Master: ['#9400D3', '#8B008B'],
};

// ============================================
// COMPONENT
// ============================================

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const { startOrGetConversation } = useStartConversation();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [startingDM, setStartingDM] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
    const [friendship, setFriendship] = useState<Friendship | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch profile data
    useEffect(() => {
        const fetchProfile = async () => {
            if (!id) return;

            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProfile(data as UserProfile);
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    // Check friendship status
    useEffect(() => {
        const checkFriendship = async () => {
            if (!id || !user?.id) return;

            try {
                // Check if friendship exists in either direction
                const { data } = await supabase
                    .from('friendships')
                    .select('*')
                    .or(
                        `and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`
                    )
                    .single();

                if (data) {
                    setFriendship(data as Friendship);

                    if (data.status === 'accepted') {
                        setFriendshipStatus('friends');
                    } else if (data.status === 'pending') {
                        if (data.requester_id === user.id) {
                            setFriendshipStatus('pending_sent');
                        } else {
                            setFriendshipStatus('pending_received');
                        }
                    }
                } else {
                    setFriendshipStatus('none');
                    setFriendship(null);
                }
            } catch (err) {
                // No friendship found
                setFriendshipStatus('none');
            }
        };

        checkFriendship();
    }, [id, user?.id]);

    // Handle send message
    const handleSendMessage = async () => {
        if (!id) return;

        setStartingDM(true);
        try {
            const conversationId = await startOrGetConversation(id);
            if (conversationId) {
                router.push(`/dm/${conversationId}` as any);
            }
        } catch (err) {
            console.error('Error starting DM:', err);
        } finally {
            setStartingDM(false);
        }
    };

    // Send friend request
    const handleAddFriend = async () => {
        if (!id || !user?.id) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('friendships')
                .insert({
                    requester_id: user.id,
                    addressee_id: id,
                    status: 'pending',
                });

            if (error) throw error;
            setFriendshipStatus('pending_sent');
        } catch (err: any) {
            Alert.alert('Erro', 'Não foi possível enviar o pedido de amizade');
        } finally {
            setActionLoading(false);
        }
    };

    // Accept friend request
    const handleAcceptRequest = async () => {
        if (!friendship?.id) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('friendships')
                .update({ status: 'accepted' })
                .eq('id', friendship.id);

            if (error) throw error;
            setFriendshipStatus('friends');
        } catch (err: any) {
            Alert.alert('Erro', 'Não foi possível aceitar o pedido');
        } finally {
            setActionLoading(false);
        }
    };

    // Reject friend request
    const handleRejectRequest = async () => {
        if (!friendship?.id) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('friendships')
                .delete()
                .eq('id', friendship.id);

            if (error) throw error;
            setFriendshipStatus('none');
            setFriendship(null);
        } catch (err: any) {
            Alert.alert('Erro', 'Não foi possível recusar o pedido');
        } finally {
            setActionLoading(false);
        }
    };

    // Remove friend
    const handleRemoveFriend = async () => {
        if (!friendship?.id) return;

        Alert.alert(
            'Remover Amigo',
            'Tens a certeza que queres remover esta pessoa dos teus amigos?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await supabase
                                .from('friendships')
                                .delete()
                                .eq('id', friendship.id);
                            setFriendshipStatus('none');
                            setFriendship(null);
                        } catch (err) {
                            Alert.alert('Erro', 'Não foi possível remover');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // Not found
    if (!profile) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="person-outline" size={48} color={colors.text.tertiary} />
                    <Text style={styles.notFoundText}>Utilizador não encontrado</Text>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Voltar</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const tierGradient = TIER_COLORS[profile.current_tier] || TIER_COLORS.Bronze;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.headerBackButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Perfil</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <LinearGradient
                    colors={tierGradient as [string, string]}
                    style={styles.profileCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {profile.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitial}>
                                    {(profile.full_name?.[0] || profile.username?.[0] || '?').toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Name & Username */}
                    <Text style={styles.profileName}>
                        {profile.full_name || profile.username}
                    </Text>
                    {profile.full_name && (
                        <Text style={styles.profileUsername}>@{profile.username}</Text>
                    )}

                    {/* Tier Badge */}
                    <View style={styles.tierBadge}>
                        <Ionicons name="shield" size={16} color="#FFF" />
                        <Text style={styles.tierText}>{profile.current_tier}</Text>
                    </View>

                    {/* Bio */}
                    {profile.bio && (
                        <Text style={styles.bio}>{profile.bio}</Text>
                    )}
                </LinearGradient>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{profile.total_xp?.toLocaleString() || 0}</Text>
                        <Text style={styles.statLabel}>XP Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>🔥 {profile.streak_days || 0}</Text>
                        <Text style={styles.statLabel}>Dias de Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{profile.focus_minutes || 0}m</Text>
                        <Text style={styles.statLabel}>Foco Total</Text>
                    </View>
                </View>

                {/* Badges */}
                {profile.badges && profile.badges.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🏅 Badges</Text>
                        <View style={styles.badgesGrid}>
                            {profile.badges.map((badge, index) => (
                                <View key={index} style={styles.badgeItem}>
                                    <Text style={styles.badgeEmoji}>{badge}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Friendship Actions */}
                <View style={styles.actionsSection}>
                    {friendshipStatus === 'none' && (
                        <Pressable
                            style={styles.addFriendButton}
                            onPress={handleAddFriend}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="person-add" size={20} color="#FFF" />
                                    <Text style={styles.actionButtonText}>Adicionar Amigo</Text>
                                </>
                            )}
                        </Pressable>
                    )}

                    {friendshipStatus === 'pending_sent' && (
                        <View style={styles.pendingButton}>
                            <Ionicons name="time-outline" size={20} color={colors.text.tertiary} />
                            <Text style={styles.pendingButtonText}>Pedido Enviado</Text>
                        </View>
                    )}

                    {friendshipStatus === 'pending_received' && (
                        <View style={styles.requestButtons}>
                            <Pressable
                                style={styles.acceptButton}
                                onPress={handleAcceptRequest}
                                disabled={actionLoading}
                            >
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Aceitar</Text>
                            </Pressable>
                            <Pressable
                                style={styles.rejectButton}
                                onPress={handleRejectRequest}
                                disabled={actionLoading}
                            >
                                <Ionicons name="close" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Recusar</Text>
                            </Pressable>
                        </View>
                    )}

                    {friendshipStatus === 'friends' && (
                        <Pressable
                            style={styles.friendsButton}
                            onPress={handleRemoveFriend}
                            disabled={actionLoading}
                        >
                            <Ionicons name="people" size={20} color="#FFF" />
                            <Text style={styles.actionButtonText}>Amigos ✓</Text>
                        </Pressable>
                    )}
                </View>

                {/* Send Message Button */}
                <Pressable
                    style={styles.messageButton}
                    onPress={handleSendMessage}
                    disabled={startingDM}
                >
                    {startingDM ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="chatbubble" size={20} color="#FFF" />
                            <Text style={styles.messageButtonText}>Enviar Mensagem</Text>
                        </>
                    )}
                </Pressable>
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
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    notFoundText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },
    backButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
    },
    backButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    headerBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },

    scrollContent: {
        padding: spacing.md,
        paddingBottom: spacing.xl * 2,
    },

    // Profile Card
    profileCard: {
        alignItems: 'center',
        padding: spacing.xl,
        borderRadius: borderRadius['2xl'],
        marginBottom: spacing.lg,
        ...shadows.lg,
    },
    avatarContainer: {
        marginBottom: spacing.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#FFF',
    },
    profileName: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: '#FFF',
        textAlign: 'center',
    },
    profileUsername: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: spacing.xs,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginTop: spacing.md,
    },
    tierText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    bio: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
    },
    statValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },

    // Badges
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    badgeItem: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeEmoji: {
        fontSize: 24,
    },

    // Friendship Actions
    actionsSection: {
        marginBottom: spacing.md,
    },
    addFriendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
    },
    pendingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pendingButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.tertiary,
    },
    requestButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    acceptButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: colors.success.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: '#EF4444',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
    },
    friendsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.success.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
    },
    actionButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },

    // Message Button
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.xl,
        ...shadows.md,
    },
    messageButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
});
