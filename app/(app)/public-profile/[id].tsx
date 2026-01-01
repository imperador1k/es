/**
 * 👤 Public Profile Screen - PREMIUM REDESIGN
 * Beautiful profile view with animations and modern design
 */

import { useStartConversation } from '@/hooks/useDMs';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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

// Tier gradients
const TIER_GRADIENTS: Record<string, [string, string]> = {
    Bronze: ['#CD7F32', '#B8860B'],
    Silver: ['#C0C0C0', '#A8A8A8'],
    Gold: ['#FFD700', '#F59E0B'],
    Platinum: ['#E5E4E2', '#94A3B8'],
    Diamond: ['#60A5FA', '#3B82F6'],
    Master: ['#A855F7', '#7C3AED'],
};

const TIER_ICONS: Record<string, string> = {
    Bronze: '🥉',
    Silver: '🥈',
    Gold: '🥇',
    Platinum: '💎',
    Diamond: '💠',
    Master: '👑',
};

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({ value, label, icon, color, delay }: {
    value: string | number;
    label: string;
    icon: string;
    color: string;
    delay: number;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.statCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Animated.View>
    );
}

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

    // Animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const cardAnim = useRef(new Animated.Value(0)).current;
    const actionsAnim = useRef(new Animated.Value(0)).current;

    // Fetch profile
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

                // Start animations
                Animated.stagger(150, [
                    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(cardAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(actionsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                ]).start();
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    // Check friendship
    useEffect(() => {
        const checkFriendship = async () => {
            if (!id || !user?.id) return;
            try {
                const { data } = await supabase
                    .from('friendships')
                    .select('*')
                    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`)
                    .single();

                if (data) {
                    setFriendship(data as Friendship);
                    if (data.status === 'accepted') {
                        setFriendshipStatus('friends');
                    } else if (data.status === 'pending') {
                        setFriendshipStatus(data.requester_id === user.id ? 'pending_sent' : 'pending_received');
                    }
                } else {
                    setFriendshipStatus('none');
                    setFriendship(null);
                }
            } catch {
                setFriendshipStatus('none');
            }
        };
        checkFriendship();
    }, [id, user?.id]);

    // Actions
    const handleSendMessage = async () => {
        if (!id) return;
        setStartingDM(true);
        try {
            const conversationId = await startOrGetConversation(id);
            if (conversationId) router.push(`/dm/${conversationId}` as any);
        } finally {
            setStartingDM(false);
        }
    };

    const handleAddFriend = async () => {
        if (!id || !user?.id) return;
        setActionLoading(true);
        try {
            const { error } = await supabase.from('friendships').insert({
                requester_id: user.id,
                addressee_id: id,
                status: 'pending',
            });
            if (error) throw error;
            setFriendshipStatus('pending_sent');
        } catch {
            Alert.alert('Erro', 'Não foi possível enviar o pedido de amizade');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAcceptRequest = async () => {
        if (!friendship?.id) return;
        setActionLoading(true);
        try {
            const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendship.id);
            if (error) throw error;
            setFriendshipStatus('friends');
        } catch {
            Alert.alert('Erro', 'Não foi possível aceitar o pedido');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectRequest = async () => {
        if (!friendship?.id) return;
        setActionLoading(true);
        try {
            await supabase.from('friendships').delete().eq('id', friendship.id);
            setFriendshipStatus('none');
            setFriendship(null);
        } catch {
            Alert.alert('Erro', 'Não foi possível recusar o pedido');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveFriend = async () => {
        if (!friendship?.id) return;
        Alert.alert('Remover Amigo', 'Tens a certeza?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: async () => {
                    setActionLoading(true);
                    try {
                        await supabase.from('friendships').delete().eq('id', friendship.id);
                        setFriendshipStatus('none');
                        setFriendship(null);
                    } finally {
                        setActionLoading(false);
                    }
                },
            },
        ]);
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            </SafeAreaView>
        );
    }

    // Not found
    if (!profile) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Ionicons name="person-outline" size={56} color={COLORS.text.tertiary} />
                    <Text style={styles.notFoundText}>Utilizador não encontrado</Text>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Voltar</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const tierGradient = TIER_GRADIENTS[profile.current_tier] || TIER_GRADIENTS.Bronze;
    const tierIcon = TIER_ICONS[profile.current_tier] || '🏅';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Floating Header */}
            <Animated.View style={[styles.header, {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
            }]}>
                <Pressable style={styles.headerBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Perfil</Text>
                <View style={{ width: 44 }} />
            </Animated.View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Profile Card */}
                <Animated.View style={[{
                    opacity: cardAnim,
                    transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }]
                }]}>
                    <LinearGradient colors={tierGradient} style={styles.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
                            {/* Tier Badge on Avatar */}
                            <View style={styles.tierBadgeOnAvatar}>
                                <Text style={styles.tierBadgeEmoji}>{tierIcon}</Text>
                            </View>
                        </View>

                        {/* Name & Username */}
                        <Text style={styles.profileName}>{profile.full_name || profile.username}</Text>
                        {profile.full_name && (
                            <Text style={styles.profileUsername}>@{profile.username}</Text>
                        )}

                        {/* Tier Badge */}
                        <View style={styles.tierBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                            <Text style={styles.tierText}>{profile.current_tier}</Text>
                        </View>

                        {/* Bio */}
                        {profile.bio && (
                            <Text style={styles.bio}>"{profile.bio}"</Text>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard value={profile.total_xp?.toLocaleString() || '0'} label="XP Total" icon="star" color="#F59E0B" delay={200} />
                    <StatCard value={`🔥 ${profile.streak_days || 0}`} label="Streak" icon="flame" color="#EF4444" delay={300} />
                    <StatCard value={`${profile.focus_minutes || 0}m`} label="Foco" icon="timer" color="#10B981" delay={400} />
                </View>

                {/* Badges Section */}
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

                {/* Actions Section */}
                <Animated.View style={[styles.actionsSection, {
                    opacity: actionsAnim,
                    transform: [{ translateY: actionsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                }]}>
                    {/* Friendship Actions */}
                    {friendshipStatus === 'none' && (
                        <Pressable style={styles.actionBtn} onPress={handleAddFriend} disabled={actionLoading}>
                            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.actionBtnGradient}>
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="person-add" size={20} color="#FFF" />
                                        <Text style={styles.actionBtnText}>Adicionar Amigo</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </Pressable>
                    )}

                    {friendshipStatus === 'pending_sent' && (
                        <View style={styles.pendingBtn}>
                            <Ionicons name="time" size={20} color={COLORS.text.tertiary} />
                            <Text style={styles.pendingBtnText}>Pedido Enviado</Text>
                        </View>
                    )}

                    {friendshipStatus === 'pending_received' && (
                        <View style={styles.requestBtns}>
                            <Pressable style={styles.acceptBtn} onPress={handleAcceptRequest} disabled={actionLoading}>
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={styles.acceptBtnText}>Aceitar</Text>
                            </Pressable>
                            <Pressable style={styles.rejectBtn} onPress={handleRejectRequest} disabled={actionLoading}>
                                <Ionicons name="close" size={20} color="#FFF" />
                                <Text style={styles.rejectBtnText}>Recusar</Text>
                            </Pressable>
                        </View>
                    )}

                    {friendshipStatus === 'friends' && (
                        <Pressable style={styles.friendsBtn} onPress={handleRemoveFriend} disabled={actionLoading}>
                            <Ionicons name="people" size={20} color="#FFF" />
                            <Text style={styles.friendsBtnText}>Amigos ✓</Text>
                        </Pressable>
                    )}

                    {/* Message Button */}
                    <Pressable style={styles.messageBtn} onPress={handleSendMessage} disabled={startingDM}>
                        {startingDM ? (
                            <ActivityIndicator size="small" color="#6366F1" />
                        ) : (
                            <>
                                <Ionicons name="chatbubble" size={20} color="#6366F1" />
                                <Text style={styles.messageBtnText}>Enviar Mensagem</Text>
                            </>
                        )}
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ============================================
// STYLES - Premium Design
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    notFoundText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.tertiary },
    backButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: '#6366F1', borderRadius: RADIUS.lg, marginTop: SPACING.md },
    backButtonText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },

    scrollContent: { padding: SPACING.md, paddingBottom: 120 },

    // Profile Card
    profileCard: { alignItems: 'center', padding: SPACING.xl, borderRadius: RADIUS['2xl'], marginBottom: SPACING.lg, ...SHADOWS.lg },
    avatarContainer: { position: 'relative', marginBottom: SPACING.md },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#FFF' },
    avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFF' },
    avatarInitial: { fontSize: 44, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    tierBadgeOnAvatar: { position: 'absolute', bottom: -4, right: -4, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
    tierBadgeEmoji: { fontSize: 20 },
    profileName: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF', textAlign: 'center' },
    profileUsername: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.xs },
    tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, marginTop: SPACING.md },
    tierText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    bio: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: SPACING.md, fontStyle: 'italic', paddingHorizontal: SPACING.lg },

    // Stats
    statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
    statCard: { flex: 1, backgroundColor: COLORS.surfaceElevated, padding: SPACING.md, borderRadius: RADIUS.xl, alignItems: 'center', ...SHADOWS.sm },
    statIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
    statValue: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    statLabel: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginTop: 2 },

    // Badges
    section: { marginBottom: SPACING.lg },
    sectionTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.md },
    badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    badgeItem: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
    badgeEmoji: { fontSize: 26 },

    // Actions Section
    actionsSection: { gap: SPACING.sm },
    actionBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.md },
    actionBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
    actionBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    pendingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, paddingVertical: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pendingBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.tertiary },
    requestBtns: { flexDirection: 'row', gap: SPACING.sm },
    acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: '#10B981', paddingVertical: SPACING.md, borderRadius: RADIUS.xl },
    acceptBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: '#EF4444', paddingVertical: SPACING.md, borderRadius: RADIUS.xl },
    rejectBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    friendsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: '#10B981', paddingVertical: SPACING.md, borderRadius: RADIUS.xl },
    friendsBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, paddingVertical: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 2, borderColor: '#6366F1' },
    messageBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#6366F1' },
});
