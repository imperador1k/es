/**
 * Hook para Calendário Unificado - VERSÃO OFFLINE-FIRST
 * Usa TanStack Query para cache e persistência automática
 * Combina: RPC get_calendar_items + Projeção do Horário Escolar (class_schedule)
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface CalendarItem {
    id: string;
    title: string;
    description?: string;
    start_at: string;
    end_at?: string;
    item_type: 'event' | 'task' | 'todo' | 'class';
    category: string;
    color: string;
    is_completed?: boolean;
    room?: string;
    subject_name?: string;
}

export interface PersonalTodo {
    id: string;
    title: string;
    description?: string;
    due_date: string | null;
    is_completed: boolean;
    priority: 'low' | 'medium' | 'high';
    tags?: string[];
}

export interface UserEvent {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    type: string;
}

export interface AgendaItem extends CalendarItem {
    name: string;
    height: number;
}

export interface AgendaItemsMap {
    [date: string]: AgendaItem[];
}

export interface MarkedDates {
    [date: string]: {
        marked?: boolean;
        dots?: Array<{ color: string; key?: string }>;
        selected?: boolean;
        selectedColor?: string;
    };
}

// ============================================
// COLORS
// ============================================

const ITEM_COLORS = {
    class: '#3B82F6',     // Azul - Aulas
    exam: '#EF4444',      // Vermelho - Exames
    task: '#F59E0B',      // Laranja - Tarefas
    todo: '#10B981',      // Verde - Pessoal
    event: '#8B5CF6',     // Roxo - Eventos
    default: '#6B7280',   // Cinza
};

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchCalendarItems(userId: string, startDate: string, endDate: string): Promise<CalendarItem[]> {
    const { data, error } = await supabase.rpc('get_calendar_items', {
        p_start_date: startDate,
        p_end_date: endDate,
    });

    if (error) {
        console.error('❌ RPC error:', error);
        return [];
    }

    // Normalize categories: todos default to 'tarefa' unless explicitly 'lembrete'
    return ((data as CalendarItem[]) || []).map(item => {
        if (item.item_type === 'todo') {
            const isReminder = item.category === 'lembrete';
            return {
                ...item,
                category: isReminder ? 'lembrete' : 'tarefa',
                color: isReminder ? ITEM_COLORS.todo : '#F59E0B',
            };
        }
        return item;
    });
}

async function fetchPersonalTodos(userId: string, startDate: string, endDate: string): Promise<PersonalTodo[]> {
    const { data, error } = await supabase
        .from('personal_todos')
        .select('id, title, description, due_date, is_completed, priority, tags')
        .eq('user_id', userId)
        .gte('due_date', startDate)
        .lte('due_date', endDate + 'T23:59:59');

    if (error) {
        console.error('❌ Personal todos error:', error);
        return [];
    }

    return (data || []) as PersonalTodo[];
}

async function fetchUserEvents(userId: string, startDate: string, endDate: string): Promise<UserEvent[]> {
    const { data, error } = await supabase
        .from('events')
        .select('id, title, description, start_time, end_time, location, type')
        .eq('user_id', userId)
        .gte('start_time', startDate)
        .lte('start_time', endDate + 'T23:59:59');

    if (error) {
        console.error('❌ User events error:', error);
        return [];
    }

    return (data || []) as UserEvent[];
}

// ============================================
// HOOK - OFFLINE-FIRST VERSION
// ============================================

export type CalendarRange = 'month' | '3months' | 'all';

export function useCalendarItems(focusedDate: Date, rangeType: CalendarRange = 'month') {
    const { user } = useAuthContext();

    // Calculate start and end of the focused month
    const { startDate, endDate, year, month } = useMemo(() => {
        const y = focusedDate.getFullYear();
        const m = focusedDate.getMonth();

        let start = new Date(y, m, 1);
        let end = new Date(y, m + 1, 0);

        if (rangeType === '3months') {
            end = new Date(y, m + 3, 0);
        } else if (rangeType === 'all') {
            start = new Date(y, m - 6, 1); // 6 months back
            end = new Date(y, m + 12, 0); // 1 year forward
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            year: y,
            month: m,
        };
    }, [focusedDate, rangeType]);

    // ============================================
    // QUERY 1: Calendar Items (RPC) - OFFLINE-FIRST
    // ============================================
    const {
        data: rpcItems = [],
        isLoading: rpcLoading,
        isRefetching: rpcRefetching,
        error: rpcError,
        refetch: refetchRpc,
    } = useQuery<CalendarItem[]>({
        queryKey: ['calendar', 'items', user?.id, startDate, endDate],
        queryFn: () => fetchCalendarItems(user!.id, startDate, endDate),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
        placeholderData: (previousData) => previousData, // Mostra cache enquanto recarrega
    });



    // ============================================
    // QUERY 3: Personal Todos - OFFLINE-FIRST
    // ============================================
    const {
        data: personalTodos = [],
        isLoading: todosLoading,
        isRefetching: todosRefetching,
        error: todosError,
        refetch: refetchTodos,
    } = useQuery<PersonalTodo[]>({
        queryKey: ['calendar', 'personal_todos', user?.id, startDate, endDate],
        queryFn: () => fetchPersonalTodos(user!.id, startDate, endDate),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
        placeholderData: (previousData) => previousData,
    });

    // ============================================
    // QUERY 4: User Events - OFFLINE-FIRST
    // ============================================
    const {
        data: userEvents = [],
        isLoading: userEventsLoading,
        isRefetching: userEventsRefetching,
        error: userEventsError,
        refetch: refetchUserEvents,
    } = useQuery<UserEvent[]>({
        queryKey: ['calendar', 'user_events', user?.id, startDate, endDate],
        queryFn: () => fetchUserEvents(user!.id, startDate, endDate),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
        placeholderData: (previousData) => previousData,
    });

    // ============================================
    // MERGE ALL ITEMS
    // ============================================

    // Map personal todos to CalendarItem format
    const personalTodosItems: CalendarItem[] = useMemo(() => {
        return personalTodos.map(todo => {
            // Default to 'tarefa'. Only 'lembrete' if explicitly tagged as such
            const isReminder = todo.tags?.includes('lembrete') && !todo.tags?.includes('tarefa');
            return {
                id: todo.id,
                title: todo.title,
                description: todo.description,
                start_at: todo.due_date || new Date().toISOString(),
                end_at: todo.due_date || undefined,
                item_type: 'todo' as const,
                category: isReminder ? 'lembrete' : 'tarefa',
                color: isReminder ? ITEM_COLORS.todo : '#F59E0B', // Orange for tasks, green for reminders
                is_completed: todo.is_completed,
            };
        });
    }, [personalTodos]);

    // Map user events to CalendarItem format
    const userEventsItems: CalendarItem[] = useMemo(() => {
        return userEvents.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            start_at: event.start_time,
            end_at: event.end_time,
            item_type: 'event' as const,
            category: event.type,
            color: getItemColor('event', event.type),
            room: event.location,
        }));
    }, [userEvents]);

    const allItems = useMemo(() => {
        const combined = [...rpcItems, ...personalTodosItems, ...userEventsItems];
        // Deduplicate by ID to prevent React key errors
        const seen = new Set<string>();
        return combined.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }, [rpcItems, personalTodosItems, userEventsItems]);

    // ============================================
    // FORMAT FOR AGENDA COMPONENT
    // ============================================

    const agendaItems: AgendaItemsMap = useMemo(() => {
        const grouped: AgendaItemsMap = {};

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = new Date(year, month, day).toISOString().split('T')[0];
            grouped[dateString] = [];
        }

        allItems.forEach((item) => {
            const dateKey = item.start_at.split('T')[0];

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }

            grouped[dateKey].push({
                ...item,
                name: item.title,
                height: 80,
            });
        });

        Object.keys(grouped).forEach((date) => {
            grouped[date].sort((a, b) =>
                new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
            );
        });

        return grouped;
    }, [allItems, year, month]);

    // Generate marked dates for calendar dots
    const markedDates: MarkedDates = useMemo(() => {
        const marks: MarkedDates = {};

        allItems.forEach((item) => {
            const dateKey = item.start_at.split('T')[0];

            if (!marks[dateKey]) {
                marks[dateKey] = {
                    marked: true,
                    dots: [],
                };
            }

            if (marks[dateKey].dots && marks[dateKey].dots!.length < 3) {
                const color = item.color || getItemColor(item.item_type, item.category);
                const key = `${item.item_type}-${dateKey}`;

                if (!marks[dateKey].dots!.find(d => d.key === key)) {
                    marks[dateKey].dots!.push({ color, key });
                }
            }
        });

        return marks;
    }, [allItems]);

    // ============================================
    // REFETCH FUNCTION
    // ============================================

    const refetch = async () => {
        await Promise.all([refetchRpc(), refetchTodos(), refetchUserEvents()]);
    };

    // ============================================
    // COMBINED LOADING STATE
    // ============================================

    const loading = rpcLoading || todosLoading || userEventsLoading;
    const isRefetching = rpcRefetching || todosRefetching || userEventsRefetching;
    const error = rpcError || todosError || userEventsError
        ? (rpcError?.message || todosError?.message || userEventsError?.message || 'Erro ao carregar calendário')
        : null;

    return {
        items: allItems,
        agendaItems,
        markedDates,
        loading,
        isRefetching, // NEW: Indica se está a atualizar em background
        error,
        refetch,
    };
}

// ============================================
// HELPERS
// ============================================

export function getItemColor(itemType: string, category?: string): string {
    switch (itemType) {
        case 'class':
            return ITEM_COLORS.class;
        case 'event':
            if (category?.toLowerCase().includes('exam')) return ITEM_COLORS.exam;
            return ITEM_COLORS.event;
        case 'task':
            return ITEM_COLORS.task;
        case 'todo':
            return ITEM_COLORS.todo;
        default:
            return ITEM_COLORS.default;
    }
}

export function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatTimeRange(start: string, end?: string): string {
    const startTime = formatTime(start);
    if (!end) return startTime;
    const endTime = formatTime(end);
    return `${startTime} - ${endTime}`;
}

export function getItemTypeIcon(itemType: string, category?: string): string {
    switch (itemType) {
        case 'class':
            return 'school-outline';
        case 'event':
            if (category?.toLowerCase().includes('exam')) return 'document-text-outline';
            return 'calendar-outline';
        case 'task':
            return 'checkbox-outline';
        case 'todo':
            return 'flag-outline';
        default:
            return 'ellipse-outline';
    }
}
