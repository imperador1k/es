/**
 * Ecrã de Atividade (Feed de Notificações)
 * Estilo Microsoft Teams
 * Escola+ App
 */

import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
} from '@/hooks/useNotifications';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { NotificationType, NotificationWithActor } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// HELPERS
// ============================================

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
    task_assigned: 'clipboard-outline',
    mention: 'at-outline',
    reply: 'chatbubble-outline',
    reaction: 'heart-outline',
    system: 'information-circle-outline',
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
    task_assigned: colors.accent.primary,
    mention: '#F59E0B',
    reply: colors.success.primary,
    reaction: '#EC4899',
    system: colors.text.tertiary,
};

function formatRelativeTime(dateStr: string): string {
    try {
        return formatDistanceToNow(new Date(dateStr), {
            addSuffix: true,
            locale: pt,
        });
    } catch {
        return '';
    }
}

// ============================================
// NOTIFICATION ITEM
// ============================================

interface NotificationItemProps {
    notification: NotificationWithActor;
    onPress: () => void;
}

function NotificationItem({ notification, onPress }: NotificationItemProps) {
    const iconName = NOTIFICATION_ICONS[notification.type] || 'notifications-outline';
    const iconColor = NOTIFICATION_COLORS[notification.type] || colors.accent.primary;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.notificationItem,
                !notification.is_read && styles.notificationItemUnread,
                pressed && styles.notificationItemPressed,
            ]}
            onPress={onPress}
        >
            {/* Unread Indicator */}
            {!notification.is_read && <View style={styles.unreadDot} />}

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                <Ionicons name={iconName} size={22} color={iconColor} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={[styles.title, !notification.is_read && styles.titleUnread]} numberOfLines={1}>
                    {notification.title}
                </Text>
                {notification.content && (
                    <Text style={styles.contentText} numberOfLines={2}>
                        {notification.content}
                    </Text>
                )}
                <View style={styles.meta}>
                    {notification.actor && (
                        <Text style={styles.actorName}>
                            {notification.actor.full_name || notification.actor.username}
                        </Text>
                    )}
                    <Text style={styles.time}>
                        {formatRelativeTime(notification.created_at)}
                    </Text>
                </View>
            </View>

            {/* Chevron */}
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </Pressable>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="notifications-off-outline" size={64} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>Tudo em dia!</Text>
            <Text style={styles.emptyText}>
                Não tens notificações por agora.{'\n'}
                Aparecem aqui menções, tarefas e atualizações.
            </Text>
        </View>
    );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function ActivityScreen() {
    const { notifications, loading, refetch, unreadCount } = useNotifications();
    const markAsRead = useMarkNotificationRead();
    const markAllAsRead = useMarkAllNotificationsRead();
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleNotificationPress = (notification: NotificationWithActor) => {
        // Marcar como lida
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }

        // Navegar para o recurso
        if (notification.resource_type && notification.resource_id) {
            switch (notification.resource_type) {
                case 'task':
                    router.push('/(tabs)/calendar' as any);
                    break;
                case 'channel':
                    router.push(`/channel/${notification.resource_id}` as any);
                    break;
                case 'message':
                    // Navegar para mensagens se tiver channel_id
                    router.push('/(tabs)/messages' as any);
                    break;
                default:
                    break;
            }
        }
    };

    const handleMarkAllRead = () => {
        if (unreadCount > 0) {
            markAllAsRead.mutate();
        }
    };

    const renderItem = ({ item }: { item: NotificationWithActor }) => (
        <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
        />
    );

    if (loading && notifications.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
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
                <View>
                    <Text style={styles.headerTitle}>Atividade</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.headerSubtitle}>
                            {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                        </Text>
                    )}
                </View>
                {unreadCount > 0 && (
                    <Pressable
                        style={styles.markAllButton}
                        onPress={handleMarkAllRead}
                    >
                        <Ionicons name="checkmark-done-outline" size={20} color={colors.accent.primary} />
                        <Text style={styles.markAllText}>Marcar todas</Text>
                    </Pressable>
                )}
            </View>

            {/* List */}
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.listContent,
                    notifications.length === 0 && styles.listContentEmpty,
                ]}
                ListEmptyComponent={<EmptyState />}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
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
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    headerTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        marginTop: 2,
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.accent.subtle,
    },
    markAllText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl * 4,
    },
    listContentEmpty: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: colors.divider,
        marginLeft: 66, // Align with content
    },

    // Notification Item
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    notificationItemUnread: {
        // Subtle highlight handled by unreadDot
    },
    notificationItemPressed: {
        opacity: 0.7,
    },
    unreadDot: {
        position: 'absolute',
        left: -spacing.sm,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent.primary,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        marginBottom: 2,
    },
    titleUnread: {
        fontWeight: typography.weight.semibold,
    },
    contentText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        lineHeight: 18,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    actorName: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    time: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
