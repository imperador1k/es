/**
 * Task Hub - Premium Edition
 * Lista unificada de tarefas com design profissional
 * Estatísticas, progress rings, cards animados, detalhes ricos
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

// ============================================
// TYPES
// ============================================

interface UnifiedTask {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    is_completed: boolean;
    xp_reward: number;
    type: 'personal' | 'team';
    team_id: string | null;
    team_name: string | null;
    team_color: string | null;
    submission_status: string | null;
    created_at: string;
    config?: {
        requires_file_upload?: boolean;
        max_score?: number;
    };
}

type FilterType = 'all' | 'pending' | 'completed' | 'overdue';

// ============================================
// HELPERS
// ============================================

function getUrgencyLevel(dueDate: string | null): 'critical' | 'warning' | 'normal' | 'none' {
    if (!dueDate) return 'none';

    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'critical'; // Overdue
    if (diffHours < 24) return 'critical'; // Less than 1 day
    if (diffHours < 72) return 'warning'; // Less than 3 days
    return 'normal';
}

function formatDueDate(dueDate: string | null): { text: string; subtext: string } {
    if (!dueDate) return { text: 'Sem prazo', subtext: '' };

    const date = new Date(dueDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 0) {
        const overdueDays = Math.abs(diffDays);
        return {
            text: `Atrasado`,
            subtext: overdueDays === 1 ? '1 dia' : `${overdueDays} dias`
        };
    }
    if (diffHours <= 3) return { text: `${diffHours}h`, subtext: 'restantes' };
    if (diffDays === 0) return { text: 'Hoje', subtext: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) };
    if (diffDays === 1) return { text: 'Amanhã', subtext: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) };
    if (diffDays <= 7) return { text: `${diffDays} dias`, subtext: 'restantes' };

    return {
        text: date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
        subtext: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    };
}

function getTaskIcon(task: UnifiedTask): { name: string; color: string } {
    if (task.type === 'team') {
        if (task.submission_status === 'graded') return { name: 'checkmark-done-circle', color: colors.success.primary };
        if (task.submission_status === 'submitted') return { name: 'time', color: colors.warning.primary };
        if (task.config?.requires_file_upload) return { name: 'attach', color: colors.accent.primary };
        return { name: 'document-text', color: colors.accent.primary };
    }
    if (task.is_completed) return { name: 'checkmark-circle', color: colors.success.primary };
    return { name: 'checkbox-outline', color: colors.text.tertiary };
}

// ============================================
// PROGRESS RING COMPONENT
// ============================================

function ProgressRing({
    progress,
    size = 60,
    strokeWidth = 6,
    color = colors.accent.primary
}: {
    progress: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={colors.divider}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color }}>{Math.round(progress)}%</Text>
            </View>
        </View>
    );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({
    icon,
    label,
    value,
    color,
    gradient
}: {
    icon: string;
    label: string;
    value: number | string;
    color: string;
    gradient: [string, string];
}) {
    return (
        <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCard}
        >
            <View style={styles.statIconContainer}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </LinearGradient>
    );
}

// ============================================
// TASK CARD COMPONENT
// ============================================

function TaskCard({ task, index }: { task: UnifiedTask; index: number }) {
    const urgency = getUrgencyLevel(task.due_date);
    const dueInfo = formatDueDate(task.due_date);
    const taskIcon = getTaskIcon(task);
    const isCompleted = task.type === 'team'
        ? task.submission_status === 'graded'
        : task.is_completed;

    const urgencyColors = {
        critical: { bg: colors.danger.light, border: colors.danger.primary, text: colors.danger.primary },
        warning: { bg: colors.warning.light, border: colors.warning.primary, text: colors.warning.primary },
        normal: { bg: colors.surfaceSubtle, border: colors.divider, text: colors.text.tertiary },
        none: { bg: colors.surfaceSubtle, border: colors.divider, text: colors.text.tertiary },
    };

    const urgencyStyle = urgencyColors[urgency];

    return (
        <Pressable
            style={({ pressed }) => [
                styles.taskCard,
                isCompleted && styles.taskCardCompleted,
                pressed && styles.taskCardPressed,
            ]}
            onPress={() => {
                if (task.type === 'team' && task.team_id) {
                    router.push(`/team/${task.team_id}/tasks/${task.id}` as any);
                } else {
                    router.push(`/(app)/tasks/${task.id}` as any);
                }
            }}
        >
            {/* Left accent bar */}
            <View style={[
                styles.taskAccentBar,
                { backgroundColor: task.type === 'team' ? (task.team_color || colors.accent.primary) : colors.text.tertiary }
            ]} />

            {/* Icon */}
            <View style={[styles.taskIconContainer, { backgroundColor: taskIcon.color + '15' }]}>
                <Ionicons name={taskIcon.name as any} size={24} color={taskIcon.color} />
            </View>

            {/* Content */}
            <View style={styles.taskContent}>
                {/* Top row: Team/Personal badge + XP */}
                <View style={styles.taskTopRow}>
                    {task.type === 'team' && task.team_name ? (
                        <View style={[styles.teamBadge, { backgroundColor: task.team_color || colors.accent.primary }]}>
                            <Text style={styles.teamBadgeText} numberOfLines={1}>{task.team_name}</Text>
                        </View>
                    ) : (
                        <View style={styles.personalBadge}>
                            <Ionicons name="person" size={10} color={colors.text.tertiary} />
                            <Text style={styles.personalBadgeText}>Pessoal</Text>
                        </View>
                    )}
                    <View style={styles.xpContainer}>
                        <Ionicons name="flash" size={12} color={colors.warning.primary} />
                        <Text style={styles.xpText}>{task.xp_reward} XP</Text>
                    </View>
                </View>

                {/* Title */}
                <Text
                    style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}
                    numberOfLines={2}
                >
                    {task.title}
                </Text>

                {/* Description preview */}
                {task.description && (
                    <Text style={styles.taskDescription} numberOfLines={1}>
                        {task.description}
                    </Text>
                )}

                {/* Bottom row: Due date + Status */}
                <View style={styles.taskBottomRow}>
                    {/* Due date */}
                    <View style={[styles.dueDateContainer, { backgroundColor: urgencyStyle.bg }]}>
                        <Ionicons
                            name={urgency === 'critical' ? 'alert-circle' : 'calendar-outline'}
                            size={14}
                            color={urgencyStyle.text}
                        />
                        <View>
                            <Text style={[styles.dueDateText, { color: urgencyStyle.text }]}>
                                {dueInfo.text}
                            </Text>
                            {dueInfo.subtext && (
                                <Text style={[styles.dueDateSubtext, { color: urgencyStyle.text }]}>
                                    {dueInfo.subtext}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Status badges */}
                    <View style={styles.statusContainer}>
                        {task.config?.requires_file_upload && !isCompleted && (
                            <View style={styles.miniIconBadge}>
                                <Ionicons name="attach" size={12} color={colors.accent.primary} />
                            </View>
                        )}
                        {isCompleted && (
                            <View style={[styles.completedBadge]}>
                                <Ionicons name="checkmark" size={12} color={colors.success.primary} />
                                <Text style={styles.completedText}>Feito</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Chevron */}
            <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </View>
        </Pressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TaskHubScreen() {
    const { user } = useAuthContext();

    const [tasks, setTasks] = useState<UnifiedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('pending');

    // Fetch tasks
    useEffect(() => {
        if (user?.id) {
            fetchTasks();
        }
    }, [user?.id]);

    const fetchTasks = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);

            // Call RPC to get unified tasks
            const { data, error } = await supabase.rpc('get_my_unified_tasks', {
                p_user_id: user.id,
            });

            if (error) {
                console.error('Error fetching tasks:', error);
                await fetchTasksFallback();
                return;
            }

            setTasks(data || []);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fallback if RPC doesn't exist
    const fetchTasksFallback = async () => {
        if (!user?.id) return;

        try {
            // Personal tasks
            const { data: personalTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .is('team_id', null)
                .is('deleted_at', null);

            // Team tasks assigned to user
            const { data: teamAssignments } = await supabase
                .from('task_assignments')
                .select(`
                    task:tasks(
                        id, title, description, due_date, xp_reward, created_at, config,
                        team:teams(id, name, color)
                    ),
                    submission:task_submissions(status)
                `)
                .eq('user_id', user.id);

            // Combine tasks
            const unified: UnifiedTask[] = [];

            // Personal tasks
            (personalTasks || []).forEach(t => {
                unified.push({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    due_date: t.due_date,
                    is_completed: t.is_completed,
                    xp_reward: t.xp_reward || 50,
                    type: 'personal',
                    team_id: null,
                    team_name: null,
                    team_color: null,
                    submission_status: null,
                    created_at: t.created_at,
                    config: t.config,
                });
            });

            // Team tasks
            (teamAssignments || []).forEach((ta: any) => {
                if (!ta.task) return;
                const task = ta.task;
                const team = Array.isArray(task.team) ? task.team[0] : task.team;
                const submission = Array.isArray(ta.submission) ? ta.submission[0] : ta.submission;

                unified.push({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    due_date: task.due_date,
                    is_completed: false,
                    xp_reward: task.xp_reward || 50,
                    type: 'team',
                    team_id: team?.id || null,
                    team_name: team?.name || null,
                    team_color: team?.color || colors.accent.primary,
                    submission_status: submission?.status || null,
                    created_at: task.created_at,
                    config: task.config,
                });
            });

            setTasks(unified);
        } catch (err) {
            console.error('Fallback error:', err);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTasks();
        setRefreshing(false);
    }, []);

    // Calculate stats
    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t =>
            t.type === 'team' ? t.submission_status === 'graded' : t.is_completed
        ).length;
        const pending = total - completed;
        const overdue = tasks.filter(t => {
            const isComplete = t.type === 'team' ? t.submission_status === 'graded' : t.is_completed;
            return !isComplete && getUrgencyLevel(t.due_date) === 'critical';
        }).length;
        const totalXP = tasks.reduce((sum, t) => sum + (t.xp_reward || 0), 0);
        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        return { total, completed, pending, overdue, totalXP, completionRate };
    }, [tasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const isCompleted = task.type === 'team'
                ? task.submission_status === 'graded'
                : task.is_completed;
            const isOverdue = getUrgencyLevel(task.due_date) === 'critical' && !isCompleted;

            if (filter === 'pending') return !isCompleted;
            if (filter === 'completed') return isCompleted;
            if (filter === 'overdue') return isOverdue;
            return true;
        });
    }, [tasks, filter]);

    // Sort by urgency and due date
    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            // Overdue first
            const aOverdue = getUrgencyLevel(a.due_date) === 'critical';
            const bOverdue = getUrgencyLevel(b.due_date) === 'critical';
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;

            // Then by due date
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    }, [filteredTasks]);

    // ============================================
    // RENDER
    // ============================================

    const renderHeader = () => (
        <View>
            {/* Hero Header */}
            <LinearGradient
                colors={[colors.accent.primary, colors.accent.primary + 'DD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroHeader}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>📋 Task Hub</Text>
                        <Text style={styles.heroSubtitle}>
                            {stats.pending > 0
                                ? `${stats.pending} tarefas à tua espera`
                                : 'Tudo em dia! 🎉'}
                        </Text>
                    </View>
                    <ProgressRing
                        progress={stats.completionRate}
                        size={70}
                        strokeWidth={7}
                        color="#FFF"
                    />
                </View>
            </LinearGradient>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <StatCard
                    icon="hourglass-outline"
                    label="Pendentes"
                    value={stats.pending}
                    color={colors.warning.primary}
                    gradient={[colors.warning.light, '#FFF']}
                />
                <StatCard
                    icon="checkmark-done"
                    label="Concluídas"
                    value={stats.completed}
                    color={colors.success.primary}
                    gradient={[colors.success.light, '#FFF']}
                />
                <StatCard
                    icon="alert-circle"
                    label="Atrasadas"
                    value={stats.overdue}
                    color={colors.danger.primary}
                    gradient={[colors.danger.light, '#FFF']}
                />
                <StatCard
                    icon="flash"
                    label="XP Total"
                    value={stats.totalXP}
                    color={colors.accent.primary}
                    gradient={[colors.accent.light, '#FFF']}
                />
            </View>

            {/* Filter Pills */}
            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Filtrar por</Text>
                <View style={styles.filterPills}>
                    {[
                        { id: 'pending', label: '⏳ Pendentes', count: stats.pending },
                        { id: 'overdue', label: '🔥 Atrasadas', count: stats.overdue },
                        { id: 'completed', label: '✅ Concluídas', count: stats.completed },
                        { id: 'all', label: '📋 Todas', count: stats.total },
                    ].map(tab => (
                        <Pressable
                            key={tab.id}
                            style={[
                                styles.filterPill,
                                filter === tab.id && styles.filterPillActive,
                            ]}
                            onPress={() => setFilter(tab.id as FilterType)}
                        >
                            <Text style={[
                                styles.filterPillText,
                                filter === tab.id && styles.filterPillTextActive,
                            ]}>
                                {tab.label}
                            </Text>
                            <View style={[
                                styles.filterPillCount,
                                filter === tab.id && styles.filterPillCountActive,
                            ]}>
                                <Text style={[
                                    styles.filterPillCountText,
                                    filter === tab.id && styles.filterPillCountTextActive,
                                ]}>{tab.count}</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                    {filter === 'pending' && '⏳ Tarefas Pendentes'}
                    {filter === 'overdue' && '🔥 Tarefas Atrasadas'}
                    {filter === 'completed' && '✅ Tarefas Concluídas'}
                    {filter === 'all' && '📋 Todas as Tarefas'}
                </Text>
                <Text style={styles.sectionCount}>{sortedTasks.length}</Text>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons
                    name={filter === 'completed' ? 'trophy-outline' : 'checkbox-outline'}
                    size={64}
                    color={colors.accent.primary}
                />
            </View>
            <Text style={styles.emptyTitle}>
                {filter === 'pending' && 'Tudo em dia! 🎉'}
                {filter === 'overdue' && 'Sem atrasos! 💪'}
                {filter === 'completed' && 'Nenhuma tarefa concluída'}
                {filter === 'all' && 'Sem tarefas'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {filter === 'pending' && 'Não tens tarefas pendentes de momento.'}
                {filter === 'overdue' && 'Continua assim, estás a ir bem!'}
                {filter === 'completed' && 'As tarefas concluídas aparecerão aqui.'}
                {filter === 'all' && 'Cria uma tarefa para começar.'}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                    <Text style={styles.loadingText}>A carregar tarefas...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Back Button */}
            <View style={styles.topBar}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </Pressable>
            </View>

            <FlatList
                data={sortedTasks}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => <TaskCard task={item} index={index} />}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.accent.primary}
                        colors={[colors.accent.primary]}
                    />
                }
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
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },
    listContent: {
        paddingBottom: spacing['3xl'],
    },

    // Hero Header
    heroHeader: {
        marginHorizontal: spacing.md,
        borderRadius: borderRadius['2xl'],
        padding: spacing.xl,
        marginBottom: spacing.lg,
        ...shadows.lg,
    },
    heroContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroTextContainer: {
        flex: 1,
    },
    heroTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: '#FFF',
        marginBottom: spacing.xs,
    },
    heroSubtitle: {
        fontSize: typography.size.base,
        color: 'rgba(255,255,255,0.85)',
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    statCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        alignItems: 'center',
        ...shadows.sm,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    statValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },

    // Filter Section
    filterSection: {
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    filterTitle: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    filterPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    filterPillActive: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    filterPillText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    filterPillTextActive: {
        color: '#FFF',
    },
    filterPillCount: {
        backgroundColor: colors.surfaceSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    filterPillCountActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterPillCountText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
    },
    filterPillCountTextActive: {
        color: '#FFF',
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    sectionCount: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
        backgroundColor: colors.accent.light,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },

    // Task Card
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.sm,
    },
    taskCardCompleted: {
        opacity: 0.7,
    },
    taskCardPressed: {
        transform: [{ scale: 0.98 }],
    },
    taskAccentBar: {
        width: 4,
        alignSelf: 'stretch',
    },
    taskIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.md,
    },
    taskContent: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    taskTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    teamBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        maxWidth: 120,
    },
    teamBadgeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    personalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceSubtle,
    },
    personalBadgeText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    xpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    xpText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.warning.primary,
    },
    taskTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: 4,
    },
    taskTitleCompleted: {
        textDecorationLine: 'line-through',
        color: colors.text.tertiary,
    },
    taskDescription: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginBottom: spacing.sm,
    },
    taskBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dueDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
    },
    dueDateText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },
    dueDateSubtext: {
        fontSize: 10,
        opacity: 0.8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    miniIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.success.light,
    },
    completedText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.success.primary,
    },
    chevronContainer: {
        paddingRight: spacing.md,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['4xl'],
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
        textAlign: 'center',
    },
});
