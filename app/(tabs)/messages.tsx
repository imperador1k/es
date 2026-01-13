/**
 * Premium Messages Screen
 * Design inspirado em iMessage/WhatsApp/Telegram
 */

import { CachedAvatar } from '@/components/CachedImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConversationWithUser, useConversations } from '@/hooks/useDMs';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

// ============================================
// TYPES & CONSTANTS
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// CONVERSATION CARD
// ============================================

// ============================================
// CONVERSATION CARD WEB (Simplified)
// ============================================

function ConversationCardWeb({
    conversation,
    index,
}: {
    conversation: ConversationWithUser;
    index: number;
}) {
    const { other_user, last_message, unread_count } = conversation;
    const hasUnread = unread_count > 0;

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return date.toLocaleDateString('pt-PT', { weekday: 'short' });
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    };

    // Avatar colors based on name
    const getAvatarColor = (name: string) => {
        const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const displayName = other_user.full_name || other_user.username || 'Utilizador';
    const avatarColor = getAvatarColor(displayName);

    return (
        <Pressable
            style={styles.conversationCard}
            onPress={() => router.push(`/dm/${conversation.id}`)}
        >
            <View style={styles.avatarContainer}>
                {other_user.avatar_url ? (
                    <CachedAvatar uri={other_user.avatar_url} size={52} />
                ) : (
                    <LinearGradient
                        colors={[avatarColor, `${avatarColor}CC`]}
                        style={styles.avatarFallback}
                    >
                        <Text style={styles.avatarInitial}>
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                )}
                {/* Online indicator */}
                {other_user.status === 'online' && <View style={styles.onlineIndicator} />}
            </View>

            {/* Content */}
            <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                    <Text style={[styles.conversationName, hasUnread && styles.conversationNameUnread]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    {last_message && (
                        <Text style={[styles.conversationTime, hasUnread && styles.conversationTimeUnread]}>
                            {formatTime(last_message.created_at)}
                        </Text>
                    )}
                </View>
                <View style={styles.conversationFooter}>
                    {last_message && (
                        <Text style={[styles.conversationPreview, hasUnread && styles.conversationPreviewUnread]} numberOfLines={1}>
                            {last_message.content}
                        </Text>
                    )}
                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unread_count > 9 ? '9+' : unread_count}</Text>
                        </View>
                    )}
                </View>
            </View>
        </Pressable>
    );
}

// ============================================
// CONVERSATION CARD NATIVE (Animated)
// ============================================

function ConversationCardNative({
    conversation,
    index,
}: {
    conversation: ConversationWithUser;
    index: number;
}) {
    const { other_user, last_message, unread_count } = conversation;
    const hasUnread = unread_count > 0;
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return date.toLocaleDateString('pt-PT', { weekday: 'short' });
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    };

    // Avatar colors based on name
    const getAvatarColor = (name: string) => {
        const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const displayName = other_user.full_name || other_user.username || 'Utilizador';
    const avatarColor = getAvatarColor(displayName);

    return (
        <AnimatedPressable
            entering={FadeInDown.delay(index * 40).springify()}
            style={[styles.conversationCard, animatedStyle]}
            onPress={() => router.push(`/dm/${conversation.id}`)}
            onPressIn={() => { scale.value = withSpring(0.98); }}
            onPressOut={() => { scale.value = withSpring(1); }}
        >
            <View style={styles.avatarContainer}>
                {other_user.avatar_url ? (
                    <CachedAvatar uri={other_user.avatar_url} size={52} />
                ) : (
                    <LinearGradient
                        colors={[avatarColor, `${avatarColor}CC`]}
                        style={styles.avatarFallback}
                    >
                        <Text style={styles.avatarInitial}>
                            {displayName.charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                )}
                {/* Online indicator */}
                {other_user.status === 'online' && <View style={styles.onlineIndicator} />}
            </View>

            {/* Content */}
            <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                    <Text style={[styles.conversationName, hasUnread && styles.conversationNameUnread]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    {last_message && (
                        <Text style={[styles.conversationTime, hasUnread && styles.conversationTimeUnread]}>
                            {formatTime(last_message.created_at)}
                        </Text>
                    )}
                </View>
                <View style={styles.conversationFooter}>
                    {last_message && (
                        <Text style={[styles.conversationPreview, hasUnread && styles.conversationPreviewUnread]} numberOfLines={1}>
                            {last_message.content}
                        </Text>
                    )}
                    {hasUnread && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unread_count > 9 ? '9+' : unread_count}</Text>
                        </View>
                    )}
                </View>
            </View>
        </AnimatedPressable>
    );
}

function ConversationCard(props: any) {
    if (Platform.OS === 'web') return <ConversationCardWeb {...props} />;
    return <ConversationCardNative {...props} />;
}

// ============================================
// FRIEND REQUEST CARD
// ============================================

// ============================================
// FRIEND REQUEST CARD WEB (Static)
// ============================================

function FriendRequestCardWeb({
    item,
    index,
    onAccept,
    onReject,
    processing,
}: {
    item: any;
    index: number;
    onAccept: () => void;
    onReject: () => void;
    processing: boolean;
}) {
    const displayName = item.profile.full_name || item.profile.username || 'Utilizador';

    return (
        <View style={styles.requestCard}>
            <View style={styles.avatarContainer}>
                {item.profile.avatar_url ? (
                    <CachedAvatar uri={item.profile.avatar_url} size={52} />
                ) : (
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                )}
            </View>

            {/* Content */}
            <View style={styles.requestContent}>
                <Text style={styles.requestName}>{displayName}</Text>
                <Text style={styles.requestUsername}>@{item.profile.username}</Text>
            </View>

            {/* Actions */}
            <View style={styles.requestActions}>
                <Pressable style={styles.acceptButton} onPress={onAccept} disabled={processing}>
                    {processing ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Ionicons name="checkmark" size={20} color="#FFF" />
                    )}
                </Pressable>
                <Pressable style={styles.rejectButton} onPress={onReject} disabled={processing}>
                    <Ionicons name="close" size={20} color={COLORS.text.tertiary} />
                </Pressable>
            </View>
        </View>
    );
}

// ============================================
// FRIEND REQUEST CARD NATIVE (Animated)
// ============================================

function FriendRequestCardNative({
    item,
    index,
    onAccept,
    onReject,
    processing,
}: {
    item: any;
    index: number;
    onAccept: () => void;
    onReject: () => void;
    processing: boolean;
}) {
    const displayName = item.profile.full_name || item.profile.username || 'Utilizador';

    return (
        <Animated.View entering={FadeInRight.delay(index * 50).springify()} style={styles.requestCard}>
            <View style={styles.avatarContainer}>
                {item.profile.avatar_url ? (
                    <CachedAvatar uri={item.profile.avatar_url} size={52} />
                ) : (
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                )}
            </View>

            {/* Content */}
            <View style={styles.requestContent}>
                <Text style={styles.requestName}>{displayName}</Text>
                <Text style={styles.requestUsername}>@{item.profile.username}</Text>
            </View>

            {/* Actions */}
            <View style={styles.requestActions}>
                <Pressable style={styles.acceptButton} onPress={onAccept} disabled={processing}>
                    {processing ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Ionicons name="checkmark" size={20} color="#FFF" />
                    )}
                </Pressable>
                <Pressable style={styles.rejectButton} onPress={onReject} disabled={processing}>
                    <Ionicons name="close" size={20} color={COLORS.text.tertiary} />
                </Pressable>
            </View>
        </Animated.View>
    );
}

function FriendRequestCard(props: any) {
    if (Platform.OS === 'web') return <FriendRequestCardWeb {...props} />;
    return <FriendRequestCardNative {...props} />;
}

// ============================================
// FRIEND REQUESTS LIST
// ============================================

function FriendRequests({ requests }: { requests: any[] }) {
    const { acceptFriendRequest, rejectFriendRequest } = useFriends();
    const [processing, setProcessing] = useState<string | null>(null);

    const handleAccept = async (id: string) => {
        setProcessing(id);
        await acceptFriendRequest(id);
        setProcessing(null);
    };

    const handleReject = async (id: string) => {
        setProcessing(id);
        await rejectFriendRequest(id);
        setProcessing(null);
    };

    if (requests.length === 0) {
        return (
            <EmptyState
                icon="people-outline"
                title="Sem pedidos"
                message="Não tens pedidos de amizade pendentes."
            />
        );
    }

    return (
        <FlatList
            data={requests}
            keyExtractor={(item) => item.friendship_id}
            renderItem={({ item, index }) => (
                <FriendRequestCard
                    item={item}
                    index={index}
                    onAccept={() => handleAccept(item.friendship_id)}
                    onReject={() => handleReject(item.friendship_id)}
                    processing={processing === item.friendship_id}
                />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    );
}

// ============================================
// EMPTY CONVERSATIONS
// ============================================

function EmptyConversations() {
    return (
        <EmptyState
            icon="chatbubbles-outline"
            title="O silêncio é de ouro..."
            message="Mas podes iniciar uma conversa com novos amigos!"
            actionLabel="Procurar Amigos"
            onAction={() => router.push('/friends/search')}
        />
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MessagesScreen() {
    const { conversations, loading, refetch } = useConversations();
    const { pendingRequests } = useFriends();
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');

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

    const filteredConversations = conversations.filter(c => !blockedIds.has(c.other_user.id));
    // Filter requests too just in case
    const filteredRequests = pendingRequests.filter(r => !blockedIds.has(r.profile?.id));

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (loading && conversations.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* ========== HEADER ========== */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mensagens</Text>
                <View style={styles.headerActions}>
                    <Pressable style={styles.headerButton} onPress={() => router.push('/friends/search')}>
                        <Ionicons name="search" size={20} color={COLORS.text.primary} />
                    </Pressable>
                    <Pressable style={styles.headerButton} onPress={() => router.push('/friends')}>
                        <Ionicons name="people" size={20} color={COLORS.text.primary} />
                        {filteredRequests.length > 0 && (
                            <View style={styles.headerBadge}>
                                <Text style={styles.headerBadgeText}>{filteredRequests.length}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

            {/* ========== TABS ========== */}
            <View style={styles.tabsContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
                    onPress={() => setActiveTab('messages')}
                >
                    <Ionicons
                        name={activeTab === 'messages' ? 'chatbubbles' : 'chatbubbles-outline'}
                        size={18}
                        color={activeTab === 'messages' ? '#FFF' : COLORS.text.secondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
                        Conversas
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Ionicons
                        name={activeTab === 'requests' ? 'person-add' : 'person-add-outline'}
                        size={18}
                        color={activeTab === 'requests' ? '#FFF' : COLORS.text.secondary}
                    />
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                        Pedidos
                    </Text>
                    {filteredRequests.length > 0 && (
                        <View style={[styles.tabBadge, activeTab === 'requests' && styles.tabBadgeActive]}>
                            <Text style={styles.tabBadgeText}>{filteredRequests.length}</Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* ========== CONTENT ========== */}
            {activeTab === 'messages' ? (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => <ConversationCard conversation={item} index={index} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<EmptyConversations />}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={COLORS.text.secondary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FriendRequests requests={filteredRequests} />
            )}
        </View>
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

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: SPACING.lg,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size['3xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    headerBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBadgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: LAYOUT.screenPadding,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: 4,
        marginBottom: SPACING.lg,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.xl,
    },
    tabActive: {
        backgroundColor: '#6366F1',
    },
    tabText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    tabTextActive: {
        color: '#FFF',
    },
    tabBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    tabBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#EF4444',
    },

    // List
    listContent: {
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: 150,
    },

    // Conversation Card
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: SPACING.md,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarFallback: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    conversationContent: {
        flex: 1,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    conversationName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        flex: 1,
    },
    conversationNameUnread: {
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    conversationTime: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginLeft: SPACING.sm,
    },
    conversationTimeUnread: {
        color: '#6366F1',
    },
    conversationFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    conversationPreview: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        flex: 1,
    },
    conversationPreviewUnread: {
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    unreadBadge: {
        backgroundColor: '#6366F1',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        marginLeft: SPACING.sm,
    },
    unreadText: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // Request Card
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    requestContent: {
        flex: 1,
    },
    requestName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    requestUsername: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    requestActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    acceptButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: LAYOUT.screenPadding,
        paddingVertical: SPACING['3xl'],
    },
    emptyIconContainer: {
        marginBottom: SPACING.lg,
    },
    emptyIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: '#6366F1',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
    },
    emptyButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
});
