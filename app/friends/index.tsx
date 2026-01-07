/**
 * 👥 Friends Screen - PREMIUM REDESIGN
 * Modern friends list with animations and premium design
 */

import { CachedAvatar } from '@/components/CachedImage';
import { useStartConversation } from '@/hooks/useDMs';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { FriendWithProfile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// ANIMATED FRIEND CARD
// ============================================

function FriendCard({ friend, onMessage, onRemove, index }: {
    friend: FriendWithProfile;
    onMessage: () => void;
    onRemove: () => void;
    index: number;
}) {
    const { profile } = friend;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Staggered animation on mount
    useState(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    });

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                style={styles.friendCard}
                onPress={() => router.push(`/public-profile/${profile.id}` as any)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <View style={styles.avatarContainer}>
                    {profile.avatar_url ? (
                        <CachedAvatar uri={profile.avatar_url} size={52} />
                    ) : (
                        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatar}>
                            <Text style={styles.avatarInitial}>
                                {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    )}
                    {/* Online indicator */}
                    <View style={styles.onlineIndicator} />
                </View>

                {/* Content */}
                <View style={styles.friendContent}>
                    <Text style={styles.friendName} numberOfLines={1}>
                        {profile.full_name || profile.username}
                    </Text>
                    <Text style={styles.friendUsername}>@{profile.username || 'utilizador'}</Text>
                </View>

                {/* Actions */}
                <View style={styles.friendActions}>
                    <Pressable style={styles.messageBtn} onPress={onMessage}>
                        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.messageBtnGradient}>
                            <Ionicons name="chatbubble" size={16} color="#FFF" />
                        </LinearGradient>
                    </Pressable>
                    <Pressable style={styles.moreBtn} onPress={onRemove}>
                        <Ionicons name="ellipsis-vertical" size={16} color={COLORS.text.tertiary} />
                    </Pressable>
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyFriends() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
                <LinearGradient colors={['#6366F120', '#8B5CF620']} style={styles.emptyIconBg}>
                    <Ionicons name="people" size={48} color="#6366F1" />
                </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>Ainda sem amigos</Text>
            <Text style={styles.emptySubtitle}>Procura colegas e adiciona-os para colaborar!</Text>
            <Pressable style={styles.emptyBtn} onPress={() => router.push('/friends/search' as any)}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.emptyBtnGradient}>
                    <Ionicons name="person-add" size={18} color="#FFF" />
                    <Text style={styles.emptyBtnText}>Procurar Amigos</Text>
                </LinearGradient>
            </Pressable>
        </View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FriendsScreen() {
    const { friends, loading, refetch, removeFriend } = useFriends();
    const { startOrGetConversation } = useStartConversation();
    const { showAlert } = useAlert();

    const [refreshing, setRefreshing] = useState(false);
    const headerAnim = useRef(new Animated.Value(0)).current;

    // Blocked Users Filter
    const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchBlocked = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('user_blocks')
                .select('*')
                .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

            if (data) {
                const ids = new Set<string>();
                data.forEach(b => {
                    ids.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
                });
                setBlockedIds(ids);
            }
        };
        fetchBlocked();
    }, []);

    const filteredFriends = friends.filter(f => !blockedIds.has(f.friend_id));

    useState(() => {
        Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });

    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleMessage = async (friendId: string) => {
        const conversationId = await startOrGetConversation(friendId);
        if (conversationId) {
            router.push(`/dm/${conversationId}` as any);
        }
    };

    const handleRemove = (friend: FriendWithProfile) => {
        showAlert({
            title: 'Remover Amigo',
            message: `Tens a certeza que queres remover ${friend.profile.full_name || friend.profile.username}?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => removeFriend(friend.friendship_id) },
            ]
        });
    };

    if (loading && friends.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Premium Header */}
            <Animated.View style={[styles.header, {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
            }]}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                </Pressable>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerEmoji}>👥</Text>
                    <View>
                        <Text style={styles.headerTitle}>Amigos</Text>
                        <Text style={styles.headerSubtitle}>{filteredFriends.length} conexões</Text>
                    </View>
                </View>

                <Pressable style={styles.addBtn} onPress={() => router.push('/friends/search' as any)}>
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.addBtnGradient}>
                        <Ionicons name="person-add" size={18} color="#FFF" />
                    </LinearGradient>
                </Pressable>
            </Animated.View>

            {/* Stats Banner */}
            {friends.length > 0 && (
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.statsBanner}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{filteredFriends.length}</Text>
                        <Text style={styles.statLabel}>Amigos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {filteredFriends.filter(f => f.profile?.current_tier).length}
                        </Text>
                        <Text style={styles.statLabel}>Ativos</Text>
                    </View>
                </LinearGradient>
            )}

            {/* Friends List */}
            <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.friendship_id}
                renderItem={({ item, index }) => (
                    <FriendCard
                        friend={item}
                        index={index}
                        onMessage={() => handleMessage(item.friend_id)}
                        onRemove={() => handleRemove(item)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<EmptyFriends />}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

// ============================================
// STYLES - Premium Design
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginLeft: SPACING.md },
    headerEmoji: { fontSize: 28 },
    headerTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    addBtn: { borderRadius: 22, overflow: 'hidden', ...SHADOWS.md },
    addBtnGradient: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

    // Stats Banner
    statsBanner: { flexDirection: 'row', marginHorizontal: SPACING.md, marginVertical: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', justifyContent: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    statLabel: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.8)' },
    statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },

    // List
    listContent: { paddingHorizontal: SPACING.md, paddingBottom: 120, flexGrow: 1 },

    // Friend Card
    friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    avatarContainer: { position: 'relative' },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    onlineIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: COLORS.surfaceElevated },
    friendContent: { flex: 1, marginLeft: SPACING.md },
    friendName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    friendUsername: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    friendActions: { flexDirection: 'row', gap: SPACING.xs },
    messageBtn: { borderRadius: 18, overflow: 'hidden' },
    messageBtnGradient: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    moreBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },

    // Empty State
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, paddingTop: SPACING['3xl'] },
    emptyIconWrap: { marginBottom: SPACING.lg },
    emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.xs },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.xl },
    emptyBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
    emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
    emptyBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
});
