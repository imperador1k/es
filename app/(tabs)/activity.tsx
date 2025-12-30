/**
 * Ecrã de Atividade - Premium Design
 * Feed de notificações com design gaming/social premium
 * Escola+ App
 */

import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
} from '@/hooks/useNotifications';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { NotificationType, NotificationWithActor } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// CONFIG
// ============================================

const NOTIFICATION_CONFIG: Record<NotificationType, {
    icon: keyof typeof Ionicons.glyphMap;
    gradient: readonly [string, string];
    emoji: string;
}> = {
    task_assigned: { icon: 'clipboard', gradient: ['#6366F1', '#4F46E5'], emoji: '📋' },
    mention: { icon: 'at', gradient: ['#F59E0B', '#D97706'], emoji: '💬' },
    reply: { icon: 'chatbubble', gradient: ['#22C55E', '#16A34A'], emoji: '💭' },
    reaction: { icon: 'heart', gradient: ['#EC4899', '#DB2777'], emoji: '❤️' },
    system: { icon: 'information-circle', gradient: ['#6B7280', '#4B5563'], emoji: '⚙️' },
    direct_message: { icon: 'mail', gradient: ['#3B82F6', '#2563EB'], emoji: '✉️' },
    new_task: { icon: 'document-text', gradient: ['#8B5CF6', '#7C3AED'], emoji: '📝' },
    team_invite: { icon: 'people', gradient: ['#10B981', '#059669'], emoji: '👥' },
    task_submitted: { icon: 'cloud-upload', gradient: ['#F97316', '#EA580C'], emoji: '🚀' },
};

// ============================================
// HELPERS
// ============================================

function formatRelativeTime(dateStr: string): string {
    try {
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: pt });
    } catch {
        return '';
    }
}

// ============================================
// NOTIFICATION CARD
// ============================================

interface NotificationCardProps {
    notification: NotificationWithActor;
    onPress: () => void;
    index: number;
}

function NotificationCard({ notification, onPress, index }: NotificationCardProps) {
    const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.system;
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    // Fade in animation
    React.useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
            <Pressable
                style={[styles.notificationCard, !notification.is_read && styles.notificationCardUnread]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {/* Unread glow */}
                {!notification.is_read && (
                    <View style={[styles.unreadGlow, { backgroundColor: config.gradient[0] }]} />
                )}

                {/* Left - Icon */}
                <LinearGradient colors={config.gradient} style={styles.iconContainer}>
                    <Text style={styles.iconEmoji}>{config.emoji}</Text>
                </LinearGradient>

                {/* Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text
                            style={[styles.cardTitle, !notification.is_read && styles.cardTitleUnread]}
                            numberOfLines={1}
                        >
                            {notification.title}
                        </Text>
                        {!notification.is_read && <View style={styles.unreadBadge} />}
                    </View>

                    {notification.content && (
                        <Text style={styles.cardDescription} numberOfLines={2}>
                            {notification.content}
                        </Text>
                    )}

                    <View style={styles.cardMeta}>
                        {notification.actor && (
                            <View style={styles.actorBadge}>
                                <Ionicons name="person" size={10} color={config.gradient[0]} />
                                <Text style={[styles.actorName, { color: config.gradient[0] }]}>
                                    {notification.actor.full_name || notification.actor.username}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.timeText}>
                            {formatRelativeTime(notification.created_at)}
                        </Text>
                    </View>
                </View>

                {/* Arrow */}
                <View style={styles.arrowContainer}>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// FILTER TABS
// ============================================

type FilterType = 'all' | 'unread' | 'mentions' | 'tasks';

const FILTERS: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'Todas', icon: 'apps' },
    { key: 'unread', label: 'Por ler', icon: 'mail-unread' },
    { key: 'mentions', label: 'Menções', icon: 'at' },
    { key: 'tasks', label: 'Tarefas', icon: 'clipboard' },
];

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ filter }: { filter: FilterType }) {
    const messages: Record<FilterType, { emoji: string; title: string; subtitle: string }> = {
        all: { emoji: '🔔', title: 'Tudo Calmo!', subtitle: 'Não tens notificações de momento.' },
        unread: { emoji: '✅', title: 'Tudo Lido!', subtitle: 'Não há notificações por ler.' },
        mentions: { emoji: '💬', title: 'Sem Menções', subtitle: 'Ninguém te mencionou ainda.' },
        tasks: { emoji: '📋', title: 'Sem Tarefas', subtitle: 'Não há notificações de tarefas.' },
    };

    const msg = messages[filter];

    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyEmoji}>{msg.emoji}</Text>
            </View>
            <Text style={styles.emptyTitle}>{msg.title}</Text>
            <Text style={styles.emptySubtitle}>{msg.subtitle}</Text>
        </View>
    );
}

// ============================================
// MAIN SCREEN
// ============================================

import React from 'react';

export default function ActivityScreen() {
    const { notifications, loading, refetch, unreadCount } = useNotifications();
    const markAsRead = useMarkNotificationRead();
    const markAllAsRead = useMarkAllNotificationsRead();
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const headerAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleNotificationPress = (notification: NotificationWithActor) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }

        switch (notification.type) {
            case 'direct_message':
                router.push(notification.resource_id ? `/dm/${notification.resource_id}` as any : '/(tabs)/messages' as any);
                break;
            case 'new_task':
            case 'task_assigned':
                router.push('/(tabs)/planner' as any);
                break;
            case 'team_invite':
                router.push('/(tabs)/teams' as any);
                break;
            case 'task_submitted':
                if (notification.resource_id) router.push(`/team/task/${notification.resource_id}` as any);
                break;
            case 'mention':
            case 'reply':
            case 'reaction':
                if (notification.resource_id) router.push(`/channel/${notification.resource_id}` as any);
                break;
        }
    };

    // Filter notifications
    const filteredNotifications = notifications.filter((n) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'unread') return !n.is_read;
        if (activeFilter === 'mentions') return n.type === 'mention' || n.type === 'reply';
        if (activeFilter === 'tasks') return n.type === 'task_assigned' || n.type === 'new_task' || n.type === 'task_submitted';
        return true;
    });

    if (loading && notifications.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar atividade...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim }]}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>⚡ Atividade</Text>
                        {unreadCount > 0 && (
                            <View style={styles.unreadCountBadge}>
                                <Text style={styles.unreadCountText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                    {unreadCount > 0 && (
                        <Pressable style={styles.markAllButton} onPress={() => markAllAsRead.mutate()}>
                            <Ionicons name="checkmark-done" size={18} color="#6366F1" />
                            <Text style={styles.markAllText}>Ler todas</Text>
                        </Pressable>
                    )}
                </Animated.View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.statGradient}>
                            <Text style={styles.statValue}>{notifications.length}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.statGradient}>
                            <Text style={styles.statValue}>{notifications.filter(n => n.is_read).length}</Text>
                            <Text style={styles.statLabel}>Lidas</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.statGradient}>
                            <Text style={styles.statValue}>{unreadCount}</Text>
                            <Text style={styles.statLabel}>Por ler</Text>
                        </LinearGradient>
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filtersContainer}>
                    {FILTERS.map((filter) => {
                        const isActive = activeFilter === filter.key;
                        return (
                            <Pressable
                                key={filter.key}
                                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                                onPress={() => setActiveFilter(filter.key)}
                            >
                                <Ionicons
                                    name={filter.icon}
                                    size={16}
                                    color={isActive ? '#FFF' : COLORS.text.secondary}
                                />
                                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                    {filter.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Notifications List */}
                <FlatList
                    data={filteredNotifications}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <NotificationCard
                            notification={item}
                            onPress={() => handleNotificationPress(item)}
                            index={index}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<EmptyState filter={activeFilter} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#6366F1"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    headerTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    unreadCountBadge: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
    unreadCountText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    markAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg },
    markAllText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: '#6366F1' },

    // Stats
    statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.lg },
    statCard: { flex: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
    statGradient: { padding: SPACING.md, alignItems: 'center' },
    statValue: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    statLabel: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.8)' },

    // Filters
    filtersContainer: { flexDirection: 'row', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md, gap: SPACING.sm },
    filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceElevated },
    filterButtonActive: { backgroundColor: '#6366F1' },
    filterText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.secondary },
    filterTextActive: { color: '#FFF' },

    // List
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100, gap: SPACING.sm },

    // Notification Card
    notificationCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, position: 'relative', overflow: 'hidden' },
    notificationCardUnread: { borderLeftWidth: 3, borderLeftColor: '#6366F1' },
    unreadGlow: { position: 'absolute', top: 0, left: 0, width: 4, height: '100%', opacity: 0.5 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    iconEmoji: { fontSize: 22 },
    cardContent: { flex: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    cardTitle: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary },
    cardTitleUnread: { fontWeight: TYPOGRAPHY.weight.semibold },
    unreadBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
    cardDescription: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginTop: 2, lineHeight: 18 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xs },
    actorBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    actorName: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.medium },
    timeText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
    arrowContainer: { padding: SPACING.xs },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.tertiary, marginTop: SPACING.xs, textAlign: 'center' },
});
