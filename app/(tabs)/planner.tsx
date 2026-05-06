/**
 * Premium Planner Screen v2
 * Separação visual: Pessoal vs Equipas
 */

import { CreateTodoModal } from '@/components/CreateTodoModal';
import CreateEventModal from '@/components/CreateEventModal';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { CreateTodoInput, PersonalTodo, usePersonalTodos } from '@/hooks/usePersonalTodos';
import { supabase } from '@/lib/supabase';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { TeamTask } from '@/types/database.types';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import Animated, {
    FadeInDown,
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const WalkthroughableView = walkthroughable(View);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface PlannerTeamTask extends TeamTask {
    team?: { name: string; color: string };
    my_completed?: boolean;
}

interface UserEvent {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
    type: string;
}

type UnifiedItem = (
    | { type: 'task'; original: PlannerTeamTask }
    | { type: 'todo'; original: PersonalTodo }
    | { type: 'event'; original: UserEvent | any } // any for now to handle the team event spread
) & {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    is_completed: boolean;
    priority: 'low' | 'medium' | 'high';
    team_name?: string;
    team_color?: string;
    team_id?: string | null;
};

type ViewMode = 'all' | 'personal' | 'teams';
type StatusFilter = 'pending' | 'completed';
type DateFilter = 'today' | 'tomorrow' | 'week' | '3months' | 'all';

// ============================================
// ANIMATED COMPONENTS
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// PERSONAL TASK CARD
// ============================================

function PersonalTaskCard({
    item,
    index,
    onToggle,
    onPress,
}: {
    item: UnifiedItem;
    index: number;
    onToggle: () => void;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const priorityColors = {
        high: '#EF4444',
        medium: '#F59E0B',
        low: '#10B981',
    };

    return (
        <AnimatedPressable
            entering={FadeInDown.delay(index * 40).springify()}
            style={[styles.personalCard, animatedStyle]}
            onPress={onPress}
            onPressIn={() => { scale.value = withSpring(0.98); }}
            onPressOut={() => { scale.value = withSpring(1); }}
        >
            {/* Checkbox or Icon */}
            {item.type === 'event' ? (
                <View style={styles.eventIconContainer}>
                    <Ionicons 
                        name={item.original.type === 'exam' ? 'document-text' : 'calendar'} 
                        size={18} 
                        color={item.priority === 'high' ? '#EF4444' : '#6366F1'} 
                    />
                </View>
            ) : (
                <Pressable style={styles.checkbox} onPress={onToggle}>
                    <View style={[
                        styles.checkboxCircle,
                        { borderColor: priorityColors[item.priority] },
                        item.is_completed && { backgroundColor: COLORS.success, borderColor: COLORS.success }
                    ]}>
                        {item.is_completed && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>
                </Pressable>
            )}

            {/* Content */}
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, item.is_completed && styles.cardTitleDone]} numberOfLines={1}>
                    {item.title}
                </Text>
                <View style={styles.cardMeta}>
                    {item.due_date && (
                        <View style={styles.dueBadge}>
                            <Ionicons 
                                name={item.type === 'event' ? "time" : "time-outline"} 
                                size={12} 
                                color={item.type === 'event' ? '#6366F1' : COLORS.text.tertiary} 
                            />
                            <Text style={[
                                styles.dueText, 
                                item.type === 'event' && { color: '#6366F1', fontWeight: '600' }
                            ]}>
                                {item.type === 'event' 
                                    ? new Date(item.due_date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                                    : formatDueDate(item.due_date)
                                }
                            </Text>
                        </View>
                    )}
                    {item.type !== 'event' && (
                        <View style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]} />
                    )}
                </View>
            </View>
        </AnimatedPressable>
    );
}

// ============================================
// TEAM TASK CARD (More detailed)
// ============================================

function TeamTaskCard({
    item,
    index,
    onPress,
}: {
    item: UnifiedItem;
    index: number;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable
            entering={FadeInRight.delay(index * 50).springify()}
            style={[styles.teamCard, animatedStyle]}
            onPress={onPress}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
        >
            {/* Team Color Bar */}
            <LinearGradient
                colors={[item.team_color || '#6366F1', `${item.team_color || '#6366F1'}80`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.teamColorBar}
            />
            <View style={styles.teamCardContent}>
                {/* Team Badge */}
                <View style={[styles.teamBadge, { backgroundColor: `${item.team_color || '#6366F1'}20` }]}>
                    <Ionicons 
                        name={item.type === 'event' ? 'calendar' : 'people'} 
                        size={12} 
                        color={item.team_color || '#6366F1'} 
                    />
                    <Text style={[styles.teamBadgeText, { color: item.team_color || '#6366F1' }]}>
                        {item.team_name || 'Equipa'}
                    </Text>
                </View>

                {/* Title & Icon for events */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {item.type === 'event' && (
                        <Ionicons 
                            name={
                                item.original.type === 'meeting' ? 'people' : 
                                item.original.type === 'presentation' ? 'easel' :
                                item.original.type === 'deadline' ? 'time' : 'calendar'
                            } 
                            size={16} 
                            color={item.team_color || '#6366F1'} 
                        />
                    )}
                    <Text style={[styles.teamCardTitle, item.is_completed && styles.cardTitleDone]} numberOfLines={2}>
                        {item.title}
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.teamCardFooter}>
                    {item.due_date && (
                        <View style={styles.dueBadge}>
                            <Ionicons 
                                name={item.type === 'event' ? "time" : "calendar-outline"} 
                                size={12} 
                                color={COLORS.text.tertiary} 
                            />
                            <Text style={styles.dueText}>
                                {item.type === 'event'
                                    ? new Date(item.due_date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                                    : formatDueDate(item.due_date)
                                }
                            </Text>
                        </View>
                    )}
                    {item.type === 'task' ? (
                        item.is_completed ? (
                            <View style={styles.completedTag}>
                                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                                <Text style={styles.completedTagText}>Entregue</Text>
                            </View>
                        ) : (
                            <View style={styles.pendingTag}>
                                <Ionicons name="time" size={14} color="#F59E0B" />
                                <Text style={styles.pendingTagText}>Pendente</Text>
                            </View>
                        )
                    ) : (
                        <View style={[styles.pendingTag, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                            <Ionicons name="flash" size={14} color="#6366F1" />
                            <Text style={[styles.pendingTagText, { color: '#6366F1' }]}>Evento</Text>
                        </View>
                    )}
                </View>
            </View>


            <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} style={styles.chevron} />
        </AnimatedPressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PlannerScreen() {
    const { user } = useAuthContext();
    const { todos, loading: todosLoading, toggleTodo, createTodo, refresh: refreshTodos } = usePersonalTodos();

    // Tutorial auto-start when navigating from tutorial
    const { useTutorialAutoStart } = require('@/hooks/useTutorialAutoStart');
    useTutorialAutoStart('planner_view');

    const [tasks, setTasks] = useState<PlannerTeamTask[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
    const [teamEvents, setTeamEvents] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showTodoModal, setShowTodoModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showAddOptions, setShowAddOptions] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [selectedTask, setSelectedTask] = useState<UnifiedItem | null>(null);

    // Fetch team tasks
    const fetchTasks = useCallback(async () => {
        if (!user?.id) return;
        try {
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

            const { data: taskData } = await supabase
                .from('tasks')
                .select(`id, title, description, due_date, status, team_id, created_by, config, team:teams(name, color)`)
                .in('team_id', teamIds)
                .is('deleted_at', null)
                .neq('created_by', user.id)
                .order('due_date', { ascending: true, nullsFirst: false });

            const { data: submissionsData } = await supabase
                .from('task_submissions')
                .select('task_id, status')
                .eq('user_id', user.id);

            const mySubmissions = new Map<string, string>();
            (submissionsData || []).forEach(s => mySubmissions.set(s.task_id, s.status));

            const processed = (taskData || []).map(t => ({
                ...t,
                user_id: user.id,
                is_completed: false,
                type: (t as any).type || 'other',
                xp_reward: 0,
                subject_id: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
                team: Array.isArray(t.team) ? t.team[0] : t.team,
                my_completed: mySubmissions.get(t.id) === 'submitted' || mySubmissions.get(t.id) === 'graded',
            })) as unknown as PlannerTeamTask[];

            setTasks(processed);

            // Also fetch personal events
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('id, title, description, start_time, end_time, location, type')
                .eq('user_id', user.id)
                .order('start_time', { ascending: true });

            if (eventsError) console.error('Events Fetch Error:', eventsError);
            setUserEvents(eventsData || []);

            // NEW: Fetch team events
            const { data: teamEventsData, error: teamEventsError } = await supabase
                .from('team_events')
                .select('*, team:team_id(name, color)')
                .order('start_time', { ascending: true });

            if (teamEventsError) console.error('Team Events Fetch Error:', teamEventsError);
            setTeamEvents(teamEventsData || []);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setTasksLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    useFocusEffect(
        useCallback(() => {
            fetchTasks();
            refreshTodos();
        }, [fetchTasks, refreshTodos])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchTasks(), refreshTodos()]);
        setRefreshing(false);
    };

    // Convert to unified format
    const personalItems = useMemo(() => {
        return todos.map(todo => ({
            id: todo.id,
            type: 'todo' as const,
            title: todo.title,
            description: todo.description,
            due_date: todo.due_date,
            is_completed: todo.is_completed,
            priority: todo.priority,
            original: todo,
        }));
    }, [todos]);

    const userEventItems = useMemo(() => {
        return userEvents.map(event => ({
            id: event.id,
            type: 'event' as const,
            title: event.title,
            description: event.description,
            due_date: event.start_time,
            is_completed: false,
            priority: (event.type === 'exam' ? 'high' : 'medium') as 'high' | 'medium',
            original: event,
        }));
    }, [userEvents]);

    const teamItems = useMemo(() => {
        const teamTasksMapped = tasks.map(task => ({
            id: task.id,
            type: 'task' as const,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            is_completed: task.my_completed || false,
            priority: 'medium' as const,
            team_name: task.team?.name,
            team_color: task.team?.color,
            team_id: task.team_id,
            original: task,
        }));

        const teamEventsMapped = teamEvents.map(event => ({
            id: event.id,
            type: 'event' as const, // We use 'event' here for UI logic
            title: event.title,
            description: event.description,
            due_date: event.start_time,
            is_completed: false,
            priority: (event.type === 'deadline' ? 'high' : 'medium') as 'high' | 'medium',
            team_name: event.team?.name,
            team_color: event.team?.color,
            team_id: event.team_id,
            original: { ...event, isTeamEvent: true }, // Add flag to distinguish from personal events
        }));

        return [...teamTasksMapped, ...teamEventsMapped].sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    }, [tasks, teamEvents]);

    const isWithinDateFilter = useCallback((dateStr: string | null) => {
        if (dateFilter === 'all') return true;
        if (!dateStr) return false;

        const date = new Date(dateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const itemDate = new Date(date);
        itemDate.setHours(0, 0, 0, 0);

        const diffTime = itemDate.getTime() - now.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
            case 'today':
                return diffDays === 0;
            case 'tomorrow':
                return diffDays === 1;
            case 'week':
                const dayOfWeek = now.getDay();
                const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
                return diffDays >= 0 && diffDays <= daysToSunday;
            case '3months':
                return diffDays >= 0 && diffDays <= 90;
            default:
                return true;
        }
    }, [dateFilter]);

    // Filter by status
    const filteredEvents = useMemo(() => {
        return userEventItems.filter(i => isWithinDateFilter(i.due_date));
    }, [userEventItems, isWithinDateFilter]);

    const filteredPersonalTodos = useMemo(() => {
        return personalItems.filter(i => {
            const matchesStatus = statusFilter === 'pending' ? !i.is_completed : i.is_completed;
            return matchesStatus && isWithinDateFilter(i.due_date);
        });
    }, [personalItems, statusFilter, isWithinDateFilter]);

    const filteredTeamTasks = useMemo(() => {
        return teamItems.filter(i => {
            const matchesStatus = statusFilter === 'pending' ? !i.is_completed : i.is_completed;
            return matchesStatus && isWithinDateFilter(i.due_date);
        });
    }, [teamItems, statusFilter, isWithinDateFilter]);

    // Stats
    const personalPending = personalItems.filter(i => !i.is_completed).length;
    const teamPending = teamItems.filter(i => !i.is_completed).length;
    const eventsCount = filteredEvents.length;

    const handleCreateTodo = async (input: CreateTodoInput) => {
        await createTodo(input);
    };

    if (tasksLoading && todosLoading) {
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
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.text.secondary} />}
            >
                {/* ========== HEADER ========== */}
                <View style={styles.header}>
                    <CopilotStep text="Gere todas as tuas tarefas pessoais e de equipa num só lugar! 📝" order={6} name="planner_view">
                        <WalkthroughableView>
                            <Text style={styles.headerTitle}>Planner</Text>
                        </WalkthroughableView>
                    </CopilotStep>
                    <Pressable style={styles.addButton} onPress={() => setShowAddOptions(true)}>
                        <Ionicons name="add" size={24} color="#FFF" />
                    </Pressable>
                </View>

                {/* ========== VIEW MODE TABS ========== */}
                <View style={styles.viewModeContainer}>
                    <Pressable
                        style={[styles.viewModeTab, viewMode === 'all' && styles.viewModeTabActive]}
                        onPress={() => setViewMode('all')}
                    >
                        <Ionicons name="apps" size={18} color={viewMode === 'all' ? '#FFF' : COLORS.text.secondary} />
                        <Text style={[styles.viewModeText, viewMode === 'all' && styles.viewModeTextActive]}>
                            Tudo
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[styles.viewModeTab, viewMode === 'personal' && styles.viewModeTabActive]}
                        onPress={() => setViewMode('personal')}
                    >
                        <Ionicons name="person" size={18} color={viewMode === 'personal' ? '#FFF' : COLORS.text.secondary} />
                        <Text style={[styles.viewModeText, viewMode === 'personal' && styles.viewModeTextActive]}>
                            Pessoal
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[styles.viewModeTab, viewMode === 'teams' && styles.viewModeTabActive]}
                        onPress={() => setViewMode('teams')}
                    >
                        <Ionicons name="people" size={18} color={viewMode === 'teams' ? '#FFF' : COLORS.text.secondary} />
                        <Text style={[styles.viewModeText, viewMode === 'teams' && styles.viewModeTextActive]}>
                            Equipas
                        </Text>
                    </Pressable>
                </View>

                {/* ========== DATE FILTERS ========== */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.dateFilterScroll}
                    contentContainerStyle={styles.dateFilterContent}
                >
                    {[
                        { id: 'all', label: 'Sempre' },
                        { id: 'today', label: 'Hoje' },
                        { id: 'tomorrow', label: 'Amanhã' },
                        { id: 'week', label: 'Esta Semana' },
                        { id: '3months', label: '3 Meses' },
                    ].map((f) => (
                        <Pressable
                            key={f.id}
                            style={[styles.dateChip, dateFilter === f.id && styles.dateChipActive]}
                            onPress={() => setDateFilter(f.id as DateFilter)}
                        >
                            <Text style={[styles.dateChipText, dateFilter === f.id && styles.dateChipTextActive]}>
                                {f.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* ========== STATUS FILTER ========== */}
                <View style={styles.statusFilter}>
                    <Pressable
                        style={[styles.statusChip, statusFilter === 'pending' && styles.statusChipActive]}
                        onPress={() => setStatusFilter('pending')}
                    >
                        <Ionicons name="time-outline" size={14} color={statusFilter === 'pending' ? '#FFF' : COLORS.text.tertiary} />
                        <Text style={[styles.statusChipText, statusFilter === 'pending' && styles.statusChipTextActive]}>Pendentes</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.statusChip, statusFilter === 'completed' && styles.statusChipActive]}
                        onPress={() => setStatusFilter('completed')}
                    >
                        <Ionicons name="checkmark-circle" size={14} color={statusFilter === 'completed' ? '#FFF' : COLORS.text.tertiary} />
                        <Text style={[styles.statusChipText, statusFilter === 'completed' && styles.statusChipTextActive]}>Concluídas</Text>
                    </Pressable>
                </View>

                {/* ========== CONTENT ========== */}
                <View style={styles.content}>
                    {/* TOP EVENTS SECTION (Always visible if exists and pending view) */}
                    {filteredEvents.length > 0 && statusFilter === 'pending' && (
                        <View style={{ marginBottom: SPACING.xl }}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIconContainer}>
                                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.sectionIcon}>
                                        <Ionicons name="calendar" size={18} color="#FFF" />
                                    </LinearGradient>
                                </View>
                                <View>
                                    <Text style={styles.sectionTitle}>Agenda & Eventos</Text>
                                    <Text style={styles.sectionSubtitle}>O que está marcado ({filteredEvents.length})</Text>
                                </View>
                            </View>
                            
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: SPACING.md, paddingBottom: 4 }}
                            >
                                {filteredEvents.map((item, index) => (
                                    <Pressable 
                                        key={item.id} 
                                        style={styles.eventHorizontalCard}
                                        onPress={() => setSelectedTask(item)}
                                    >
                                        <View style={styles.eventCardTag}>
                                            <Ionicons name="school" size={12} color="#6366F1" />
                                            <Text style={styles.eventCardTagText}>Escolar</Text>
                                        </View>
                                        <Text style={styles.eventCardTitle} numberOfLines={2}>{item.title}</Text>
                                        <View style={styles.eventCardFooter}>
                                            <Ionicons name="time" size={12} color={COLORS.text.tertiary} />
                                            <Text style={styles.eventCardTime}>
                                                {new Date(item.due_date!).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* PERSONAL TASKS */}
                    {(viewMode === 'personal' || viewMode === 'all') && (
                        <View style={{ marginBottom: SPACING.xl }}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIconContainer}>
                                    <LinearGradient colors={['#10B981', '#059669']} style={styles.sectionIcon}>
                                        <Ionicons name="person" size={18} color="#FFF" />
                                    </LinearGradient>
                                </View>
                                <View>
                                    <Text style={styles.sectionTitle}>Tarefas Pessoais</Text>
                                    <Text style={styles.sectionSubtitle}>Afazeres individuais</Text>
                                </View>
                            </View>

                            {filteredPersonalTodos.length > 0 ? (
                                <View style={styles.personalList}>
                                    {filteredPersonalTodos.map((item, index) => (
                                        <PersonalTaskCard
                                            key={item.id}
                                            item={item}
                                            index={index}
                                            onToggle={() => toggleTodo(item.id)}
                                            onPress={() => setSelectedTask(item)}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptySmall}>
                                    <Text style={styles.emptySubtitle}>Sem tarefas pessoais</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* TEAM TASKS */}
                    {(viewMode === 'teams' || viewMode === 'all') && (
                        <View style={{ marginBottom: SPACING.xl }}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIconContainer}>
                                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.sectionIcon}>
                                        <Ionicons name="people" size={18} color="#FFF" />
                                    </LinearGradient>
                                </View>
                                <View>
                                    <Text style={styles.sectionTitle}>Trabalhos de Equipa</Text>
                                    <Text style={styles.sectionSubtitle}>Projectos partilhados</Text>
                                </View>
                            </View>

                            {filteredTeamTasks.length > 0 ? (
                                <View style={styles.teamList}>
                                    {filteredTeamTasks.map((item, index) => (
                                        <TeamTaskCard
                                            key={item.id}
                                            item={item}
                                            index={index}
                                            onPress={() => setSelectedTask(item)}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptySmall}>
                                    <Text style={styles.emptySubtitle}>Sem tarefas de equipa</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* GLOBAL EMPTY STATE */}
                    {filteredEvents.length === 0 && filteredPersonalTodos.length === 0 && filteredTeamTasks.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name={statusFilter === 'pending' ? 'checkmark-done-circle' : 'list'} size={64} color={COLORS.text.tertiary} />
                            <Text style={styles.emptyTitle}>
                                {statusFilter === 'pending' ? 'Tudo em dia!' : 'Sem tarefas concluídas'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {statusFilter === 'pending' 
                                    ? 'Aproveita o teu tempo livre 🚀' 
                                    : 'As tuas conquistas aparecem aqui'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 150 }} />
            </ScrollView>

            {/* ========== FAB with Options ========== */}
            {showAddOptions && (
                <Pressable style={styles.fabOverlay} onPress={() => setShowAddOptions(false)}>
                    <View style={styles.fabOptions}>
                        <Pressable
                            style={styles.fabOption}
                            onPress={() => {
                                setShowAddOptions(false);
                                setShowTodoModal(true);
                            }}
                        >
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.fabOptionIcon}>
                                <Ionicons name="checkbox" size={20} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.fabOptionText}>Nova Tarefa</Text>
                        </Pressable>
                        <Pressable
                            style={styles.fabOption}
                            onPress={() => {
                                setShowAddOptions(false);
                                setShowEventModal(true);
                            }}
                        >
                            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.fabOptionIcon}>
                                <Ionicons name="calendar" size={20} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.fabOptionText}>Novo Evento</Text>
                        </Pressable>
                    </View>
                </Pressable>
            )}

            <Pressable style={styles.fab} onPress={() => setShowAddOptions(true)}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.fabGradient}>
                    <Ionicons name="add" size={28} color="#FFF" />
                </LinearGradient>
            </Pressable>

            {/* ========== MODALS ========== */}
            <CreateTodoModal
                visible={showTodoModal}
                onClose={() => setShowTodoModal(false)}
                onSubmit={handleCreateTodo}
            />

            <CreateEventModal
                visible={showEventModal}
                onClose={() => setShowEventModal(false)}
                onSuccess={() => {
                    fetchTasks();
                    refreshTodos();
                }}
            />

            <TaskDetailModal
                visible={selectedTask !== null}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                onUpdate={() => { fetchTasks(); refreshTodos(); }}
            />
        </View>
    );
}

// ============================================
// HELPERS
// ============================================

function formatDueDate(dueDate: string): string {
    const date = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    if (date < today) return 'Atrasado';
    if (date < tomorrow) return 'Hoje';
    if (date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) return 'Amanhã';
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Sub Section
    subSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    subSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // View Mode Tabs
    viewModeContainer: {
        flexDirection: 'row',
        marginHorizontal: LAYOUT.screenPadding,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: 4,
        marginBottom: SPACING.lg,
    },
    viewModeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.xl,
    },
    viewModeTabActive: {
        backgroundColor: '#6366F1',
    },
    viewModeText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    viewModeTextActive: {
        color: '#FFF',
    },
    viewModeBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    viewModeBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    viewModeBadgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // Date Filters
    dateFilterScroll: {
        marginBottom: SPACING.md,
    },
    dateFilterContent: {
        paddingHorizontal: LAYOUT.screenPadding,
        gap: SPACING.xs,
    },
    dateChip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dateChipActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    dateChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.tertiary,
    },
    dateChipTextActive: {
        color: '#6366F1',
    },

    // Status Filter
    statusFilter: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingHorizontal: LAYOUT.screenPadding,
        marginBottom: SPACING.xl,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
    },
    statusChipActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
    },
    statusChipText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    statusChipTextActive: {
        color: '#6366F1',
    },

    // Content
    content: {
        paddingHorizontal: LAYOUT.screenPadding,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    sectionIconContainer: {},
    sectionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    sectionSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // Personal List
    personalList: {
        gap: SPACING.sm,
    },
    personalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        gap: SPACING.md,
        ...SHADOWS.sm,
    },
    checkbox: {
        padding: 4,
    },
    eventIconContainer: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    cardTitleDone: {
        textDecorationLine: 'line-through',
        color: COLORS.text.tertiary,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    dueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dueText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },
    priorityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // Horizontal Events
    eventHorizontalCard: {
        width: 200,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.1)',
        ...SHADOWS.sm,
    },
    eventCardTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    eventCardTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6366F1',
        textTransform: 'uppercase',
    },
    eventCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginBottom: 12,
        height: 40,
    },
    eventCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventCardTime: {
        fontSize: 11,
        color: COLORS.text.tertiary,
        fontWeight: '500',
    },

    // Team List
    teamList: {
        gap: SPACING.md,
    },
    teamCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    teamColorBar: {
        width: 4,
    },
    teamCardContent: {
        flex: 1,
        padding: SPACING.lg,
        gap: SPACING.sm,
    },
    teamBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        alignSelf: 'flex-start',
    },
    teamBadgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },
    teamCardTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    teamCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    completedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    completedTagText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.success,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    pendingTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pendingTagText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: '#F59E0B',
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    chevron: {
        alignSelf: 'center',
        marginRight: SPACING.md,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING['3xl'],
        gap: SPACING.md,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        textAlign: 'center',
    },
    emptySmall: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: RADIUS.xl,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: '#10B981',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
        marginTop: SPACING.md,
    },
    emptyButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 120,
        right: LAYOUT.screenPadding,
        ...SHADOWS.lg,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingBottom: 190,
        paddingRight: LAYOUT.screenPadding,
    },
    fabOptions: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.sm,
        gap: SPACING.xs,
        ...SHADOWS.lg,
    },
    fabOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    fabOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabOptionText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
});
