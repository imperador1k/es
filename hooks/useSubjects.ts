/**
 * Hook para gerir disciplinas e horários do utilizador
 * VERSÃO OFFLINE-FIRST com TanStack Query
 * Escola+ App
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import {
    ClassSession,
    ClassSessionInsert,
    ClassSessionUpdate,
    ClassSessionWithSubject,
    DayOfWeek,
    Subject,
    SubjectInsert,
    SubjectUpdate,
    SubjectWithSchedule,
} from '@/types/database.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================
// FETCH FUNCTIONS
// ============================================

async function fetchSubjectsFromDb(userId: string): Promise<Subject[]> {
    const { data, error } = await supabase
        .from('user_subjects')
        .select('*')
        .eq('user_id', userId)
        .order('name');

    if (error) throw error;
    return data || [];
}

async function fetchScheduleFromDb(userId: string): Promise<ClassSessionWithSubject[]> {
    const { data, error } = await supabase
        .from('class_schedule')
        .select(`
            *,
            subject:user_subjects(*)
        `)
        .eq('user_id', userId)
        .order('day_of_week')
        .order('start_time');

    if (error) throw error;
    return data || [];
}

// ============================================
// HOOK: useSubjects - OFFLINE-FIRST
// ============================================

export function useSubjects() {
    const { user } = useAuthContext();
    const queryClient = useQueryClient();

    // Query para disciplinas com cache offline
    const {
        data: subjects = [],
        isLoading: loading,
        error: queryError,
        refetch: fetchSubjects,
        isRefetching,
    } = useQuery<Subject[]>({
        queryKey: ['subjects', user?.id],
        queryFn: () => fetchSubjectsFromDb(user!.id),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
        placeholderData: (previousData) => previousData,
    });

    const error = queryError?.message || null;

    // ========================================
    // MUTATIONS
    // ========================================

    const addMutation = useMutation({
        mutationFn: async (data: Omit<SubjectInsert, 'user_id'>) => {
            if (!user?.id) throw new Error('User not authenticated');
            
            const { data: newSubject, error } = await supabase
                .from('user_subjects')
                .insert({ ...data, user_id: user.id })
                .select()
                .single();

            if (error) throw error;
            return newSubject;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: SubjectUpdate }) => {
            if (!user?.id) throw new Error('User not authenticated');
            
            const { data: updated, error } = await supabase
                .from('user_subjects')
                .update(data)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!user?.id) throw new Error('User not authenticated');
            
            const { error } = await supabase
                .from('user_subjects')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects', user?.id] });
        },
    });

    // ========================================
    // API METHODS
    // ========================================

    const addSubject = async (data: Omit<SubjectInsert, 'user_id'>): Promise<Subject | null> => {
        try {
            return await addMutation.mutateAsync(data);
        } catch (err) {
            console.error('Erro ao adicionar disciplina:', err);
            throw err;
        }
    };

    const updateSubject = async (id: string, data: SubjectUpdate): Promise<Subject | null> => {
        try {
            return await updateMutation.mutateAsync({ id, data });
        } catch (err) {
            console.error('Erro ao atualizar disciplina:', err);
            throw err;
        }
    };

    const deleteSubject = async (id: string): Promise<boolean> => {
        try {
            return await deleteMutation.mutateAsync(id);
        } catch (err) {
            console.error('Erro ao remover disciplina:', err);
            throw err;
        }
    };

    const getSubjectById = (id: string): Subject | undefined => {
        return subjects.find(s => s.id === id);
    };

    return {
        subjects,
        loading,
        isRefetching,
        error,
        fetchSubjects,
        addSubject,
        updateSubject,
        deleteSubject,
        getSubjectById,
    };
}

// ============================================
// HOOK: useSchedule - OFFLINE-FIRST
// ============================================

export function useSchedule() {
    const { user } = useAuthContext();
    const queryClient = useQueryClient();

    // Query para horário com cache offline
    const {
        data: schedule = [],
        isLoading: loading,
        error: queryError,
        refetch: fetchSchedule,
        isRefetching,
    } = useQuery<ClassSessionWithSubject[]>({
        queryKey: ['schedule', user?.id],
        queryFn: () => fetchScheduleFromDb(user!.id),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutos
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
        placeholderData: (previousData) => previousData,
    });

    const error = queryError?.message || null;

    // ========================================
    // MUTATIONS
    // ========================================

    const addMutation = useMutation({
        mutationFn: async (data: Omit<ClassSessionInsert, 'user_id'>) => {
            if (!user?.id) throw new Error('User not authenticated');
            
            const { data: newSession, error } = await supabase
                .from('class_schedule')
                .insert({ ...data, user_id: user.id })
                .select()
                .single();

            if (error) throw error;
            return newSession;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['calendar'] }); // Também atualiza calendário
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ClassSessionUpdate }) => {
            if (!user?.id) throw new Error('User not authenticated');
            
            const { data: updated, error } = await supabase
                .from('class_schedule')
                .update(data)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!user?.id) throw new Error('User not authenticated');
            
            const { error } = await supabase
                .from('class_schedule')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
        },
    });

    // ========================================
    // API METHODS
    // ========================================

    const addClassSession = async (data: Omit<ClassSessionInsert, 'user_id'>): Promise<ClassSession | null> => {
        try {
            return await addMutation.mutateAsync(data);
        } catch (err) {
            console.error('Erro ao adicionar aula:', err);
            throw err;
        }
    };

    const updateClassSession = async (id: string, data: ClassSessionUpdate): Promise<ClassSession | null> => {
        try {
            return await updateMutation.mutateAsync({ id, data });
        } catch (err) {
            console.error('Erro ao atualizar aula:', err);
            throw err;
        }
    };

    const deleteClassSession = async (id: string): Promise<boolean> => {
        try {
            return await deleteMutation.mutateAsync(id);
        } catch (err) {
            console.error('Erro ao remover aula:', err);
            throw err;
        }
    };

    // ========================================
    // HELPERS
    // ========================================

    const getSessionsByDay = (day: DayOfWeek): ClassSessionWithSubject[] => {
        return schedule.filter(s => s.day_of_week === day);
    };

    const getTodaySessions = (): ClassSessionWithSubject[] => {
        const today = new Date().getDay() as DayOfWeek;
        return getSessionsByDay(today);
    };

    const getNextSession = (): ClassSessionWithSubject | null => {
        const now = new Date();
        const currentDay = now.getDay() as DayOfWeek;
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

        const todaySessions = getSessionsByDay(currentDay)
            .filter(s => s.start_time > currentTime)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

        if (todaySessions.length > 0) {
            return todaySessions[0];
        }

        for (let i = 1; i <= 7; i++) {
            const nextDay = ((currentDay + i) % 7) as DayOfWeek;
            const sessions = getSessionsByDay(nextDay).sort((a, b) =>
                a.start_time.localeCompare(b.start_time)
            );
            if (sessions.length > 0) {
                return sessions[0];
            }
        }

        return null;
    };

    const getScheduleByDay = (): Record<DayOfWeek, ClassSessionWithSubject[]> => {
        const byDay: Record<DayOfWeek, ClassSessionWithSubject[]> = {
            0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
        };

        schedule.forEach(session => {
            byDay[session.day_of_week].push(session);
        });

        (Object.keys(byDay) as unknown as DayOfWeek[]).forEach(day => {
            byDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });

        return byDay;
    };

    return {
        schedule,
        loading,
        isRefetching,
        error,
        fetchSchedule,
        addClassSession,
        updateClassSession,
        deleteClassSession,
        getSessionsByDay,
        getTodaySessions,
        getNextSession,
        getScheduleByDay,
    };
}

// ============================================
// HOOK COMBINADO: useSubjectsWithSchedule
// ============================================

export function useSubjectsWithSchedule() {
    const subjectsHook = useSubjects();
    const scheduleHook = useSchedule();

    const getSubjectsWithSessions = (): SubjectWithSchedule[] => {
        return subjectsHook.subjects.map(subject => ({
            ...subject,
            sessions: scheduleHook.schedule
                .filter(s => s.subject_id === subject.id)
                .map(s => ({
                    id: s.id,
                    user_id: s.user_id,
                    subject_id: s.subject_id,
                    day_of_week: s.day_of_week,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    room: s.room,
                    type: s.type,
                    notes: s.notes,
                    created_at: s.created_at,
                })),
        }));
    };

    return {
        // Subjects
        subjects: subjectsHook.subjects,
        subjectsLoading: subjectsHook.loading,
        subjectsError: subjectsHook.error,
        fetchSubjects: subjectsHook.fetchSubjects,
        addSubject: subjectsHook.addSubject,
        updateSubject: subjectsHook.updateSubject,
        deleteSubject: subjectsHook.deleteSubject,
        getSubjectById: subjectsHook.getSubjectById,
        
        // Schedule
        schedule: scheduleHook.schedule,
        scheduleLoading: scheduleHook.loading,
        scheduleError: scheduleHook.error,
        fetchSchedule: scheduleHook.fetchSchedule,
        addClassSession: scheduleHook.addClassSession,
        updateClassSession: scheduleHook.updateClassSession,
        deleteClassSession: scheduleHook.deleteClassSession,
        getSessionsByDay: scheduleHook.getSessionsByDay,
        getTodaySessions: scheduleHook.getTodaySessions,
        getNextSession: scheduleHook.getNextSession,
        getScheduleByDay: scheduleHook.getScheduleByDay,
        
        // Combined
        getSubjectsWithSessions,
        isLoading: subjectsHook.loading || scheduleHook.loading,
        isRefetching: subjectsHook.isRefetching || scheduleHook.isRefetching,
    };
}

// ============================================
// CORES PRÉ-DEFINIDAS PARA DISCIPLINAS
// ============================================

export const SUBJECT_COLORS = [
    '#6366f1', // Indigo (default)
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#f43f5e', // Rose
];
