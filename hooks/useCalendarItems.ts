/**
 * Hook para Calendário Unificado
 * Combina: RPC get_calendar_items + Projeção do Horário Escolar (class_schedule)
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

export interface ClassSchedule {
    id: string;
    day_of_week: number; // 0=Domingo, 1=Segunda, etc.
    start_time: string; // "09:00:00"
    end_time: string; // "10:30:00"
    subject_id: string;
    room?: string;
    type?: string;
    subject?: {
        name: string;
        color: string;
    };
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
// HOOK
// ============================================

export function useCalendarItems(focusedDate: Date) {
    const { user } = useAuthContext();
    const [rpcItems, setRpcItems] = useState<CalendarItem[]>([]);
    const [classSchedule, setClassSchedule] = useState<ClassSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calculate start and end of the focused month
    const { startDate, endDate, year, month } = useMemo(() => {
        const y = focusedDate.getFullYear();
        const m = focusedDate.getMonth();

        // First day of the month
        const start = new Date(y, m, 1);
        // Last day of the month
        const end = new Date(y, m + 1, 0);

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            year: y,
            month: m,
        };
    }, [focusedDate]);

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchData = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Passo A: Fetch da RPC get_calendar_items
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_calendar_items', {
                p_start_date: startDate,
                p_end_date: endDate,
            });

            if (rpcError) {
                console.error('❌ RPC error:', rpcError);
                // Continue with empty array
            }

            setRpcItems((rpcData as CalendarItem[]) || []);

            // Passo B: Fetch do class_schedule
            const { data: scheduleData, error: scheduleError } = await supabase
                .from('class_schedule')
                .select(`
                    id, day_of_week, start_time, end_time, room, type,
                    subject:user_subjects(name, color)
                `)
                .eq('user_id', user.id);

            if (scheduleError) {
                console.error('❌ Schedule error:', scheduleError);
            }

            // Map schedule data
            const mappedSchedule: ClassSchedule[] = (scheduleData || []).map((s: any) => ({
                ...s,
                subject: Array.isArray(s.subject) ? s.subject[0] : s.subject,
            }));

            setClassSchedule(mappedSchedule);

        } catch (err) {
            console.error('❌ Unexpected error:', err);
            setError('Erro ao carregar calendário');
        } finally {
            setLoading(false);
        }
    }, [user?.id, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ============================================
    // PASSO C: Projetar Horário Escolar em Datas Específicas
    // ============================================

    const projectedClasses = useMemo(() => {
        const items: CalendarItem[] = [];

        if (classSchedule.length === 0) return items;

        // Loop por todos os dias do mês
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const dayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Segunda, etc.
            const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

            // Encontrar aulas para este dia da semana
            const classesForDay = classSchedule.filter(c => c.day_of_week === dayOfWeek);

            // Criar "Evento Virtual" para cada aula
            classesForDay.forEach(cls => {
                const startDateTime = `${dateString}T${cls.start_time}`;
                const endDateTime = `${dateString}T${cls.end_time}`;

                items.push({
                    id: `class-${cls.id}-${dateString}`,
                    title: cls.subject?.name || 'Aula',
                    description: cls.type || undefined,
                    start_at: startDateTime,
                    end_at: endDateTime,
                    item_type: 'class',
                    category: 'aula',
                    color: cls.subject?.color || ITEM_COLORS.class,
                    room: cls.room,
                    subject_name: cls.subject?.name,
                });
            });
        }

        return items;
    }, [classSchedule, year, month]);

    // ============================================
    // PASSO D: Merge RPC Items + Projected Classes
    // ============================================

    const allItems = useMemo(() => {
        return [...rpcItems, ...projectedClasses];
    }, [rpcItems, projectedClasses]);

    // ============================================
    // PASSO E: Format for Agenda Component
    // ============================================

    const agendaItems: AgendaItemsMap = useMemo(() => {
        const grouped: AgendaItemsMap = {};

        // Initialize all days of the month (even empty ones)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = new Date(year, month, day).toISOString().split('T')[0];
            grouped[dateString] = [];
        }

        // Group items by date
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

        // Sort items within each day by start time
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

            // Add dot for each item type (limit to 3)
            if (marks[dateKey].dots && marks[dateKey].dots!.length < 3) {
                const color = item.color || getItemColor(item.item_type, item.category);
                const key = `${item.item_type}-${dateKey}`;

                // Avoid duplicate dots
                if (!marks[dateKey].dots!.find(d => d.key === key)) {
                    marks[dateKey].dots!.push({ color, key });
                }
            }
        });

        return marks;
    }, [allItems]);

    return {
        items: allItems,
        agendaItems,
        markedDates,
        loading,
        error,
        refetch: fetchData,
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
