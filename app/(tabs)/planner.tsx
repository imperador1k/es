/**
 * Planner Screen (formerly Quests)
 * Unified view of Team Tasks + Personal Todos
 */

import { CreateTodoModal } from '@/components/CreateTodoModal';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { CreateTodoInput, PersonalTodo, usePersonalTodos } from '@/hooks/usePersonalTodos';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
// TYPES
// ============================================

interface TeamTask {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
    team_id: string;
    team?: { name: string; color: string };
    my_completed?: boolean;
}

interface UnifiedItem {
    id: string;
    type: 'task' | 'todo';
    title: string;
    description: string | null;
    due_date: string | null;
    is_completed: boolean;
    priority: 'low' | 'medium' | 'high';
    team_name?: string;
    team_color?: string;
    subject_name?: string;
    subject_color?: string;
    original: TeamTask | PersonalTodo;
}

type DateGroup = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_date';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PlannerScreen() {
    const { user } = useAuthContext();
    const { todos, loading: todosLoading, toggleTodo, createTodo, refresh: refreshTodos } = usePersonalTodos();

    const [tasks, setTasks] = useState<TeamTask[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
    const [selectedTask, setSelectedTask] = useState<UnifiedItem | null>(null);

    // Fetch team tasks
    const fetchTasks = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Get teams where user is member
            const { data: memberships } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id);

            const teamIds = memberships?.map(m => m.team_id) || [];

            if (teamIds.length === 0) {
                setTasks([]);
                setTasksLoading(false);
                return;
            }

            // Get tasks from those teams (excluding deleted and created by me)
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select(`
                    id, title, description, due_date, status, team_id, created_by,
                    team:teams(name, color)
                `)
                .in('team_id', teamIds)
                .is('deleted_at', null)
                .neq('created_by', user.id)  // Exclude tasks I created
                .order('due_date', { ascending: true, nullsFirst: false });

            if (taskError) {
                console.error('Error fetching tasks:', taskError);
                setTasks([]);
                setTasksLoading(false);
                return;
            }

            // Get my submissions for these tasks (to check completion status)
            const { data: submissionsData } = await supabase
                .from('task_submissions')
                .select('task_id, status, submitted_at')
                .eq('user_id', user.id);

            // Create map of my submissions
            const mySubmissions = new Map<string, { status: string; submitted_at: string | null }>();
            (submissionsData || []).forEach(s => {
                mySubmissions.set(s.task_id, { status: s.status, submitted_at: s.submitted_at });
            });

            // Process and merge with submission status
            const processed = (taskData || []).map(t => {
                const mySubmission = mySubmissions.get(t.id);
                return {
                    ...t,
                    team: Array.isArray(t.team) ? t.team[0] : t.team,
                    // Submitted = completed for display purposes
                    my_completed: mySubmission?.status === 'submitted' || mySubmission?.status === 'graded',
                };
            });

            setTasks(processed);
        } catch (err) {
            console.error('Error fetching tasks:', err);
        } finally {
            setTasksLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Refresh handler
    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchTasks(), refreshTodos()]);
        setRefreshing(false);
    };

    // Merge and group items
    const groupedItems = useMemo(() => {
        // Convert to unified format
        const unified: UnifiedItem[] = [
            // Team tasks
            ...tasks.map(task => ({
                id: task.id,
                type: 'task' as const,
                title: task.title,
                description: task.description,
                due_date: task.due_date,
                is_completed: task.my_completed || false,
                priority: 'medium' as const,
                team_name: task.team?.name,
                team_color: task.team?.color,
                original: task,
            })),
            // Personal todos
            ...todos.map(todo => ({
                id: todo.id,
                type: 'todo' as const,
                title: todo.title,
                description: todo.description,
                due_date: todo.due_date,
                is_completed: todo.is_completed,
                priority: todo.priority,
                original: todo,
            })),
        ];

        // Filter
        const filtered = unified.filter(item => {
            if (filter === 'pending') return !item.is_completed;
            if (filter === 'completed') return item.is_completed;
            return true;
        });

        // Group by date
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const groups: Record<DateGroup, UnifiedItem[]> = {
            overdue: [],
            today: [],
            tomorrow: [],
            this_week: [],
            later: [],
            no_date: [],
        };

        filtered.forEach(item => {
            if (!item.due_date) {
                groups.no_date.push(item);
            } else {
                const dueDate = new Date(item.due_date);
                if (dueDate < today) {
                    groups.overdue.push(item);
                } else if (dueDate < tomorrow) {
                    groups.today.push(item);
                } else if (dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
                    groups.tomorrow.push(item);
                } else if (dueDate < endOfWeek) {
                    groups.this_week.push(item);
                } else {
                    groups.later.push(item);
                }
            }
        });

        // Sort each group by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        Object.values(groups).forEach(group => {
            group.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        });

        return groups;
    }, [tasks, todos, filter]);

    // Render section
    const renderSection = (title: string, items: UnifiedItem[], icon: string, color: string) => {
        if (items.length === 0) return null;

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name={icon as any} size={18} color={color} />
                    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
                    <View style={[styles.sectionBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.sectionBadgeText, { color }]}>{items.length}</Text>
                    </View>
                </View>
                {items.map(item => (
                    <ItemCard
                        key={item.id}
                        item={item}
                        onToggle={() => item.type === 'todo' && toggleTodo(item.id)}
                        onPress={() => setSelectedTask(item)}
                    />
                ))}
            </View>
        );
    };

    // Handle create todo
    const handleCreateTodo = async (input: CreateTodoInput) => {
        await createTodo(input);
    };

    // Loading state
    if (tasksLoading && todosLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const totalPending = Object.values(groupedItems).flat().filter(i => !i.is_completed).length;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Planner</Text>
                    <Text style={styles.headerSubtitle}>
                        {totalPending} tarefa{totalPending !== 1 ? 's' : ''} pendente{totalPending !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {(['pending', 'all', 'completed'] as const).map(f => (
                    <Pressable
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === 'pending' ? 'Pendentes' : f === 'all' ? 'Todas' : 'Concluídas'}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Content */}
            <FlatList
                data={[1]} // Dummy data, we render sections manually
                keyExtractor={() => 'content'}
                renderItem={() => (
                    <View style={styles.content}>
                        {renderSection('Atrasadas', groupedItems.overdue, 'alert-circle', '#EF4444')}
                        {renderSection('Hoje', groupedItems.today, 'today', colors.accent.primary)}
                        {renderSection('Amanhã', groupedItems.tomorrow, 'calendar', '#F59E0B')}
                        {renderSection('Esta Semana', groupedItems.this_week, 'calendar-outline', '#10B981')}
                        {renderSection('Mais Tarde', groupedItems.later, 'time-outline', colors.text.tertiary)}
                        {renderSection('Sem Data', groupedItems.no_date, 'help-circle-outline', colors.text.tertiary)}

                        {/* Empty state */}
                        {Object.values(groupedItems).every(g => g.length === 0) && (
                            <View style={styles.emptyState}>
                                <Ionicons name="checkmark-done-circle" size={64} color={colors.accent.primary} />
                                <Text style={styles.emptyTitle}>
                                    {filter === 'pending' ? 'Tudo em dia!' : 'Sem tarefas'}
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    Clica no + para adicionar uma tarefa pessoal
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                showsVerticalScrollIndicator={false}
            />

            {/* FAB */}
            <Pressable style={styles.fab} onPress={() => setShowCreateModal(true)}>
                <Ionicons name="add" size={28} color="#FFF" />
            </Pressable>

            {/* Create Modal */}
            <CreateTodoModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateTodo}
            />

            {/* Task Detail Modal */}
            <TaskDetailModal
                visible={selectedTask !== null}
                onClose={() => setSelectedTask(null)}
                onUpdate={handleRefresh}
                task={selectedTask}
            />
        </SafeAreaView>
    );
}

// ============================================
// ITEM CARD COMPONENT
// ============================================

function ItemCard({ item, onToggle, onPress }: { item: UnifiedItem; onToggle: () => void; onPress: () => void }) {
    const priorityColors = {
        low: '#10B981',
        medium: '#F59E0B',
        high: '#EF4444',
    };

    const formatDueDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    };

    return (
        <Pressable style={[styles.card, item.is_completed && styles.cardCompleted]} onPress={onPress}>
            {/* Checkbox / Type indicator */}
            <Pressable
                style={[
                    styles.checkbox,
                    item.type === 'task' && styles.checkboxTask,
                    item.is_completed && styles.checkboxChecked
                ]}
                onPress={item.type === 'todo' ? onToggle : undefined}
            >
                {item.is_completed ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : item.type === 'task' ? (
                    <Ionicons name="document-text" size={14} color={colors.accent.primary} />
                ) : null}
            </Pressable>

            {/* Content */}
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, item.is_completed && styles.cardTitleCompleted]}>
                    {item.title}
                </Text>

                <View style={styles.cardMeta}>
                    {/* Team badge */}
                    {item.team_name && (
                        <View style={[styles.badge, { backgroundColor: (item.team_color || colors.accent.primary) + '20' }]}>
                            <Text style={[styles.badgeText, { color: item.team_color || colors.accent.primary }]}>
                                {item.team_name}
                            </Text>
                        </View>
                    )}

                    {/* Due date */}
                    {item.due_date && (
                        <View style={styles.dueDateBadge}>
                            <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                            <Text style={styles.dueDateText}>{formatDueDate(item.due_date)}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Priority indicator */}
            <View style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]} />
        </Pressable>
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
    header: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    headerTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    filterTab: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
    },
    filterTabActive: {
        backgroundColor: colors.accent.primary,
    },
    filterText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        fontWeight: typography.weight.medium,
    },
    filterTextActive: {
        color: '#FFF',
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        flex: 1,
    },
    sectionBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    sectionBadgeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    cardCompleted: {
        opacity: 0.6,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    checkboxTask: {
        borderColor: colors.accent.primary,
        backgroundColor: colors.accent.light,
    },
    checkboxChecked: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        marginBottom: 4,
    },
    cardTitleCompleted: {
        textDecorationLine: 'line-through',
        color: colors.text.tertiary,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    badgeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
    },
    dueDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dueDateText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['5xl'],
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.lg,
    },
});
