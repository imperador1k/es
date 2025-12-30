/**
 * Team Tasks Screen - Ultra Premium Design
 * Lista tarefas e navega para páginas dedicadas
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { TeamRole, TeamTask } from '@/types/database.types';
import { canUser } from '@/utils/permissions';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type TabType = 'pending' | 'completed';

interface TaskWithSubmission extends TeamTask {
    my_submission: { status: string; submitted_at: string | null } | null;
    creator?: { username: string; avatar_url: string | null } | null;
}

// ============================================
// HELPERS
// ============================================

function formatDueDate(dueDate: string | null): { text: string; isOverdue: boolean; color: string } {
    if (!dueDate) return { text: 'Sem prazo', isOverdue: false, color: COLORS.text.tertiary };

    const due = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffMs = dueDay.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (dueDay < today) {
        const daysAgo = Math.abs(diffDays);
        return { text: daysAgo === 1 ? 'Atrasado 1 dia' : `Atrasado ${daysAgo} dias`, isOverdue: true, color: '#EF4444' };
    }
    if (dueDay.getTime() === today.getTime()) return { text: 'Entrega hoje', isOverdue: false, color: '#F59E0B' };
    if (dueDay.getTime() === tomorrow.getTime()) return { text: 'Entrega amanhã', isOverdue: false, color: '#F59E0B' };
    if (diffDays <= 7) return { text: `Em ${diffDays} dias`, isOverdue: false, color: '#22C55E' };
    return { text: due.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }), isOverdue: false, color: COLORS.text.tertiary };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamTasksScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();

    const [tasks, setTasks] = useState<TaskWithSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);
    const [teamName, setTeamName] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('pending');

    // ============================================
    // LOAD DATA
    // ============================================

    const loadTasks = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            // Get tasks
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select(`*, creator:created_by(username, avatar_url)`)
                .eq('team_id', teamId)
                .is('deleted_at', null)
                .order('due_date', { ascending: true, nullsFirst: false });

            if (tasksError) throw tasksError;

            // Get user role
            let currentRole = userRole;
            if (!currentRole) {
                const { data: memberData } = await supabase
                    .from('team_members')
                    .select('role')
                    .eq('team_id', teamId)
                    .eq('user_id', user.id)
                    .single();

                if (memberData) {
                    currentRole = memberData.role as TeamRole;
                    setUserRole(currentRole);
                }
            }

            // Get my submissions
            const { data: submissionsData } = await supabase
                .from('task_submissions')
                .select('task_id, status, submitted_at')
                .eq('user_id', user.id);

            const submissionsMap = new Map<string, { status: string; submitted_at: string | null }>();
            (submissionsData || []).forEach((s) => {
                submissionsMap.set(s.task_id, { status: s.status, submitted_at: s.submitted_at });
            });

            // Filter tasks (members don't see their own created tasks)
            const isAdmin = ['owner', 'admin', 'moderator'].includes(currentRole || '');
            const filteredTasks = (tasksData || []).filter((task) => {
                if (isAdmin) return true;
                return task.created_by !== user.id;
            });

            // Combine
            const combined: TaskWithSubmission[] = filteredTasks.map((task) => ({
                ...task,
                my_submission: submissionsMap.get(task.id) || null,
            }));

            setTasks(combined);

            // Get team name
            if (!teamName) {
                const { data: teamData } = await supabase.from('teams').select('name').eq('id', teamId).single();
                if (teamData) setTeamName(teamData.name);
            }
        } catch (err) {
            console.error('Error loading tasks:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teamId, user?.id, userRole, teamName]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadTasks();
    };

    // ============================================
    // NAVIGATION
    // ============================================

    // Navigate to create task wizard
    const navigateToCreateTask = () => {
        router.push(`/team/${teamId}/tasks/new` as any);
    };

    // Navigate to task detail (submission/view)
    const navigateToTask = (taskId: string) => {
        router.push(`/team/${teamId}/tasks/${taskId}` as any);
    };

    // ============================================
    // FILTER
    // ============================================

    // Pending = no submission or status != 'graded'
    const pendingTasks = tasks.filter((t) => !t.my_submission || t.my_submission.status !== 'graded');
    const completedTasks = tasks.filter((t) => t.my_submission && t.my_submission.status === 'graded');
    const displayedTasks = activeTab === 'pending' ? pendingTasks : completedTasks;

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar tarefas...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>✅ Tarefas</Text>
                        <Text style={styles.headerSubtitle}>{teamName} • {pendingTasks.length} pendentes</Text>
                    </View>
                    {canUser(userRole, 'CREATE_TASK') && (
                        <Pressable style={styles.addButton} onPress={navigateToCreateTask}>
                            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.addButtonGradient}>
                                <Ionicons name="add" size={22} color="#FFF" />
                            </LinearGradient>
                        </Pressable>
                    )}
                </View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { borderColor: '#F59E0B' }]}>
                        <Text style={styles.statValue}>{pendingTasks.length}</Text>
                        <Text style={styles.statLabel}>Pendentes</Text>
                    </View>
                    <View style={[styles.statCard, { borderColor: '#22C55E' }]}>
                        <Text style={styles.statValue}>{completedTasks.length}</Text>
                        <Text style={styles.statLabel}>Avaliadas</Text>
                    </View>
                    <View style={[styles.statCard, { borderColor: '#6366F1' }]}>
                        <Text style={styles.statValue}>{tasks.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <Pressable
                        style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Ionicons name="time-outline" size={18} color={activeTab === 'pending' ? '#FFF' : COLORS.text.tertiary} />
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>Pendentes</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
                        onPress={() => setActiveTab('completed')}
                    >
                        <Ionicons name="checkmark-circle-outline" size={18} color={activeTab === 'completed' ? '#FFF' : COLORS.text.tertiary} />
                        <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>Avaliadas</Text>
                    </Pressable>
                </View>

                {/* Task List */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />}
                >
                    {displayedTasks.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconBg}>
                                <Ionicons
                                    name={activeTab === 'pending' ? 'checkmark-done-outline' : 'list-outline'}
                                    size={48}
                                    color={COLORS.text.tertiary}
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'pending' ? 'Tudo em dia! 🎉' : 'Nenhuma tarefa avaliada'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'pending' ? 'Não tens tarefas pendentes' : 'Completa e aguarda avaliação'}
                            </Text>
                        </View>
                    ) : (
                        displayedTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                userId={user?.id || ''}
                                onPress={() => navigateToTask(task.id)}
                            />
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// TASK CARD COMPONENT
// ============================================

function TaskCard({
    task,
    userId,
    onPress,
}: {
    task: TaskWithSubmission;
    userId: string;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const hasSubmission = !!task.my_submission;
    const isGraded = task.my_submission?.status === 'graded';
    const isSubmitted = task.my_submission?.status === 'submitted';
    const { text: dueText, isOverdue, color: dueColor } = formatDueDate(task.due_date);

    // Verificar se o utilizador criou esta tarefa
    const isCreator = task.created_by === userId || (task as any).user_id === userId;

    const getStatusBadge = () => {
        if (isGraded) return { text: 'Avaliada ✓', color: '#22C55E' };
        if (isSubmitted) return { text: 'Aguarda Avaliação', color: '#F59E0B' };
        if (isOverdue && !isCreator) return { text: 'Atrasada', color: '#EF4444' };
        return null;
    };

    const statusBadge = getStatusBadge();

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={[styles.taskCard, { transform: [{ scale }] }, isCreator && styles.taskCardCreator]}>
                {/* Creator Badge - Ribbon */}
                {isCreator && (
                    <View style={styles.creatorRibbon}>
                        <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.creatorRibbonGradient}>
                            <Ionicons name="create" size={10} color="#FFF" />
                            <Text style={styles.creatorRibbonText}>CRIADA POR TI</Text>
                        </LinearGradient>
                    </View>
                )}

                {/* Left Icon */}
                <View style={[styles.taskIcon, {
                    backgroundColor: isCreator
                        ? 'rgba(139, 92, 246, 0.15)'
                        : isGraded
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(99, 102, 241, 0.15)'
                }]}>
                    <Ionicons
                        name={isCreator ? 'school' : isGraded ? 'checkmark-circle' : isSubmitted ? 'hourglass' : 'document-text'}
                        size={24}
                        color={isCreator ? '#8B5CF6' : isGraded ? '#22C55E' : isSubmitted ? '#F59E0B' : '#6366F1'}
                    />
                </View>

                {/* Info */}
                <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>

                    <View style={styles.taskMeta}>
                        {/* Due Date Badge */}
                        <View style={[styles.metaBadge, { backgroundColor: `${dueColor}15` }]}>
                            <Ionicons name="calendar-outline" size={12} color={dueColor} />
                            <Text style={[styles.metaBadgeText, { color: dueColor }]}>{dueText}</Text>
                        </View>

                        {/* XP Badge */}
                        {task.xp_reward && (
                            <View style={styles.xpBadge}>
                                <Ionicons name="flash" size={12} color="#FFD700" />
                                <Text style={styles.xpText}>{task.xp_reward} XP</Text>
                            </View>
                        )}
                    </View>

                    {/* Status Badge OR Analytics hint for creator */}
                    {isCreator ? (
                        <View style={styles.analyticsHint}>
                            <Ionicons name="bar-chart-outline" size={12} color="#8B5CF6" />
                            <Text style={styles.analyticsHintText}>Toca para ver entregas</Text>
                        </View>
                    ) : statusBadge && (
                        <View style={[styles.statusBadge, { backgroundColor: `${statusBadge.color}15` }]}>
                            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.text}</Text>
                        </View>
                    )}
                </View>

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
            </Animated.View>
        </Pressable>
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
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    addButton: {
        overflow: 'hidden',
        borderRadius: 14,
    },
    addButtonGradient: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderLeftWidth: 3,
    },
    statValue: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    tabActive: {
        backgroundColor: '#6366F1',
    },
    tabText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.tertiary,
    },
    tabTextActive: {
        color: '#FFF',
    },

    // Task Card
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    taskIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    taskTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    metaBadgeText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    xpText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#FFD700',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        marginTop: SPACING.xs,
    },
    statusBadgeText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
    },

    // Creator Badge
    taskCardCreator: {
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        overflow: 'visible',
    },
    creatorRibbon: {
        position: 'absolute',
        top: -8,
        left: SPACING.lg,
        zIndex: 10,
    },
    creatorRibbonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    creatorRibbonText: {
        fontSize: 9,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
        letterSpacing: 0.5,
    },
    analyticsHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: SPACING.xs,
    },
    analyticsHintText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: '#8B5CF6',
        fontWeight: TYPOGRAPHY.weight.medium,
    },
});
