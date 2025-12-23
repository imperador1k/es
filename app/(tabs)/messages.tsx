import { ConversationWithUser, useConversations } from '@/hooks/useDMs';
import { useFriends } from '@/hooks/useFriends';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MessagesScreen() {
    const { conversations, loading, refetch } = useConversations();
    const { pendingRequests } = useFriends();
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');

    // Refetch quando o ecrã ganha foco (ex: volta do chat)
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
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Mensagens</Text>
                <View style={styles.headerActions}>
                    <Pressable style={styles.headerButton} onPress={() => router.push('/friends/search')}>
                        <Ionicons name="search" size={22} color={colors.text.primary} />
                    </Pressable>
                    <Pressable style={styles.headerButton} onPress={() => router.push('/friends')}>
                        <Ionicons name="people" size={22} color={colors.text.primary} />
                        {pendingRequests.length > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <Pressable
                    style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
                    onPress={() => setActiveTab('messages')}
                >
                    <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
                        Conversas
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                        Pedidos {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                    </Text>
                </Pressable>
            </View>

            {/* Content */}
            {activeTab === 'messages' ? (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ConversationCard conversation={item} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<EmptyConversations />}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FriendRequests />
            )}
        </SafeAreaView>
    );
}

// ============================================
// SUB COMPONENTS
// ============================================
function ConversationCard({ conversation }: { conversation: ConversationWithUser }) {
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

    return (
        <Pressable
            style={styles.conversationCard}
            onPress={() => router.push(`/dm/${conversation.id}`)}
        >
            {/* Avatar */}
            {other_user.avatar_url ? (
                <Image source={{ uri: other_user.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                        {(other_user.full_name || other_user.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}

            {/* Content */}
            <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                    <Text style={[styles.conversationName, hasUnread && styles.conversationNameUnread]}>
                        {other_user.full_name || other_user.username || 'Utilizador'}
                    </Text>
                    {last_message && (
                        <Text style={styles.conversationTime}>{formatTime(last_message.created_at)}</Text>
                    )}
                </View>
                {last_message && (
                    <Text style={[styles.conversationPreview, hasUnread && styles.conversationPreviewUnread]} numberOfLines={1}>
                        {last_message.content}
                    </Text>
                )}
            </View>

            {/* Unread Badge */}
            {hasUnread && (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unread_count}</Text>
                </View>
            )}
        </Pressable>
    );
}

function FriendRequests() {
    const { pendingRequests, acceptFriendRequest, rejectFriendRequest } = useFriends();
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

    if (pendingRequests.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                    <Ionicons name="people-outline" size={40} color={colors.accent.primary} />
                </View>
                <Text style={styles.emptyTitle}>Sem pedidos</Text>
                <Text style={styles.emptySubtitle}>Não tens pedidos de amizade pendentes</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.friendship_id}
            renderItem={({ item }) => (
                <View style={styles.requestCard}>
                    {item.profile.avatar_url ? (
                        <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarFallback}>
                            <Text style={styles.avatarInitial}>
                                {(item.profile.full_name || item.profile.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.requestContent}>
                        <Text style={styles.requestName}>
                            {item.profile.full_name || item.profile.username}
                        </Text>
                        <Text style={styles.requestUsername}>@{item.profile.username}</Text>
                    </View>
                    <View style={styles.requestActions}>
                        <Pressable
                            style={styles.acceptButton}
                            onPress={() => handleAccept(item.friendship_id)}
                            disabled={processing === item.friendship_id}
                        >
                            {processing === item.friendship_id ? (
                                <ActivityIndicator size="small" color={colors.text.inverse} />
                            ) : (
                                <Ionicons name="checkmark" size={18} color={colors.text.inverse} />
                            )}
                        </Pressable>
                        <Pressable
                            style={styles.rejectButton}
                            onPress={() => handleReject(item.friendship_id)}
                        >
                            <Ionicons name="close" size={18} color={colors.text.tertiary} />
                        </Pressable>
                    </View>
                </View>
            )}
            contentContainerStyle={styles.listContent}
        />
    );
}

function EmptyConversations() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem conversas</Text>
            <Text style={styles.emptySubtitle}>Procura amigos para começar a conversar!</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/friends/search')}>
                <Text style={styles.emptyButtonText}>Procurar Amigos</Text>
            </Pressable>
        </View>
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
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.danger.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: colors.text.inverse,
    },

    // Tabs
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    tab: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.full,
    },
    tabActive: {
        backgroundColor: colors.text.primary,
    },
    tabText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    tabTextActive: {
        color: colors.text.inverse,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
        flexGrow: 1,
    },

    // Conversation Card
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
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
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    conversationContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    conversationName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    conversationNameUnread: {
        fontWeight: typography.weight.bold,
    },
    conversationTime: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    conversationPreview: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    conversationPreviewUnread: {
        color: colors.text.secondary,
    },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },
    unreadText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.text.inverse,
    },

    // Request Card
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    requestContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    requestName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    requestUsername: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    requestActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    acceptButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.success.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['3xl'],
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    emptyButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    emptyButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
});
