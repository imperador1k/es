import { useStartConversation } from '@/hooks/useDMs';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, getTierStyle, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Profile, Tier } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
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

const TIER_EMOJI: Record<Tier, string> = {
    Bronze: '🥉',
    Prata: '🥈',
    Ouro: '🥇',
    Platina: '💎',
    Diamante: '👑',
    Elite: '🔥',
};

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user: currentUser } = useAuthContext();
    const { friends, sendFriendRequest, pendingRequests } = useFriends();
    const { startOrGetConversation } = useStartConversation();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Verificar relação
    const isFriend = friends.some(f => f.friend_id === id);
    const hasPending = pendingRequests.some(p => p.friend_id === id);
    const isMe = id === currentUser?.id;

    // Carregar perfil
    useEffect(() => {
        async function loadProfile() {
            if (!id) return;
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProfile(data as Profile);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [id]);

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

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Utilizador não encontrado</Text>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Voltar</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const tier = profile.current_tier || 'Bronze';
    const tierStyle = getTierStyle(tier.toLowerCase());
    const tierEmoji = TIER_EMOJI[tier];
    const level = Math.floor((profile.current_xp || 0) / 200) + 1;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Perfil</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    {/* Avatar */}
                    {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: tierStyle.bg }]}>
                            <Text style={[styles.avatarInitial, { color: tierStyle.text }]}>
                                {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}

                    {/* Info */}
                    <Text style={styles.name}>{profile.full_name || profile.username}</Text>
                    <Text style={styles.username}>@{profile.username || 'utilizador'}</Text>

                    {/* Tier Badge */}
                    <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                        <Text style={styles.tierEmoji}>{tierEmoji}</Text>
                        <Text style={[styles.tierText, { color: tierStyle.text }]}>{tier}</Text>
                    </View>

                    {/* Actions */}
                    {!isMe && (
                        <View style={styles.actions}>
                            {isFriend ? (
                                <Pressable style={styles.messageBtn} onPress={handleMessage}>
                                    <Ionicons name="chatbubble-outline" size={18} color={colors.text.inverse} />
                                    <Text style={styles.messageBtnText}>Mensagem</Text>
                                </Pressable>
                            ) : hasPending ? (
                                <View style={styles.pendingBtn}>
                                    <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
                                    <Text style={styles.pendingBtnText}>Pendente</Text>
                                </View>
                            ) : (
                                <Pressable
                                    style={[styles.addBtn, sending && styles.addBtnDisabled]}
                                    onPress={handleAddFriend}
                                    disabled={sending}
                                >
                                    {sending ? (
                                        <ActivityIndicator size="small" color={colors.text.inverse} />
                                    ) : (
                                        <>
                                            <Ionicons name="person-add" size={18} color={colors.text.inverse} />
                                            <Text style={styles.addBtnText}>Adicionar</Text>
                                        </>
                                    )}
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{level}</Text>
                        <Text style={styles.statLabel}>Nível</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{(profile.current_xp || 0).toLocaleString()}</Text>
                        <Text style={styles.statLabel}>XP</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{profile.current_streak || 0}</Text>
                        <Text style={styles.statLabel}>Streak 🔥</Text>
                    </View>
                </View>

                {/* Badges placeholder */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Badges</Text>
                    <View style={styles.badgesPlaceholder}>
                        <Text style={styles.placeholderText}>Em breve...</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
    },
    errorText: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    backBtn: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    backBtnText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },

    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: 120,
    },

    // Profile Card
    profileCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing['2xl'],
        alignItems: 'center',
        marginBottom: spacing.lg,
        ...shadows.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: spacing.lg,
    },
    avatarFallback: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    avatarInitial: {
        fontSize: typography.size['3xl'],
        fontWeight: typography.weight.bold,
    },
    name: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    username: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginTop: spacing.md,
        gap: spacing.xs,
    },
    tierEmoji: {
        fontSize: 14,
    },
    tierText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        marginTop: spacing.xl,
        gap: spacing.md,
    },
    messageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.sm,
    },
    messageBtnText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.sm,
    },
    addBtnDisabled: {
        opacity: 0.7,
    },
    addBtnText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
    pendingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    pendingBtnText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statBox: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.sm,
    },
    statValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },

    // Section
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    badgesPlaceholder: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        ...shadows.sm,
    },
    placeholderText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
});
