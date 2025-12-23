/**
 * Hook para gerir disciplinas e horários do utilizador
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
import { useCallback, useEffect, useState } from 'react';

// ============================================
// HOOK: useSubjects
// ============================================

export function useSubjects() {
    const { user } = useAuthContext();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ========================================
    // FETCH: Obter todas as disciplinas
    // ========================================
    const fetchSubjects = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('user_subjects')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (fetchError) throw fetchError;

            setSubjects(data || []);
        } catch (err) {
            console.error('Erro ao carregar disciplinas:', err);
            setError('Não foi possível carregar as disciplinas');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Carregar ao montar
    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    // ========================================
    // CREATE: Adicionar nova disciplina
    // ========================================
    const addSubject = async (data: Omit<SubjectInsert, 'user_id'>): Promise<Subject | null> => {
        if (!user?.id) return null;

        try {
            const { data: newSubject, error } = await supabase
                .from('user_subjects')
                .insert({
                    ...data,
                    user_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;

            // Atualizar lista local
            setSubjects(prev => [...prev, newSubject].sort((a, b) => a.name.localeCompare(b.name)));

            return newSubject;
        } catch (err) {
            console.error('Erro ao adicionar disciplina:', err);
            throw err;
        }
    };

    // ========================================
    // UPDATE: Editar disciplina
    // ========================================
    const updateSubject = async (id: string, data: SubjectUpdate): Promise<Subject | null> => {
        if (!user?.id) return null;

        try {
            const { data: updated, error } = await supabase
                .from('user_subjects')
                .update(data)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            // Atualizar lista local
            setSubjects(prev =>
                prev.map(s => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
            );

            return updated;
        } catch (err) {
            console.error('Erro ao atualizar disciplina:', err);
            throw err;
        }
    };

    // ========================================
    // DELETE: Remover disciplina
    // ========================================
    const deleteSubject = async (id: string): Promise<boolean> => {
        if (!user?.id) return false;

        try {
            const { error } = await supabase
                .from('user_subjects')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            // Remover da lista local
            setSubjects(prev => prev.filter(s => s.id !== id));

            return true;
        } catch (err) {
            console.error('Erro ao remover disciplina:', err);
            throw err;
        }
    };

    // ========================================
    // GET BY ID: Obter disciplina específica
    // ========================================
    const getSubjectById = (id: string): Subject | undefined => {
        return subjects.find(s => s.id === id);
    };

    return {
        subjects,
        loading,
        error,
        fetchSubjects,
        addSubject,
        updateSubject,
        deleteSubject,
        getSubjectById,
    };
}

// ============================================
// HOOK: useSchedule
// ============================================

export function useSchedule() {
    const { user } = useAuthContext();
    const [schedule, setSchedule] = useState<ClassSessionWithSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ========================================
    // FETCH: Obter horário completo
    // ========================================
    const fetchSchedule = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('class_schedule')
                .select(`
                    *,
                    subject:user_subjects(*)
                `)
                .eq('user_id', user.id)
                .order('day_of_week')
                .order('start_time');

            if (fetchError) throw fetchError;

            setSchedule(data || []);
        } catch (err) {
            console.error('Erro ao carregar horário:', err);
            setError('Não foi possível carregar o horário');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Carregar ao montar
    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    // ========================================
    // CREATE: Adicionar aula ao horário
    // ========================================
    const addClassSession = async (data: Omit<ClassSessionInsert, 'user_id'>): Promise<ClassSession | null> => {
        if (!user?.id) return null;

        try {
            const { data: newSession, error } = await supabase
                .from('class_schedule')
                .insert({
                    ...data,
                    user_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;

            // Refetch para obter dados completos com subject
            await fetchSchedule();

            return newSession;
        } catch (err) {
            console.error('Erro ao adicionar aula:', err);
            throw err;
        }
    };

    // ========================================
    // UPDATE: Editar aula
    // ========================================
    const updateClassSession = async (id: string, data: ClassSessionUpdate): Promise<ClassSession | null> => {
        if (!user?.id) return null;

        try {
            const { data: updated, error } = await supabase
                .from('class_schedule')
                .update(data)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            // Refetch para obter dados completos
            await fetchSchedule();

            return updated;
        } catch (err) {
            console.error('Erro ao atualizar aula:', err);
            throw err;
        }
    };

    // ========================================
    // DELETE: Remover aula do horário
    // ========================================
    const deleteClassSession = async (id: string): Promise<boolean> => {
        if (!user?.id) return false;

        try {
            const { error } = await supabase
                .from('class_schedule')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            // Remover da lista local
            setSchedule(prev => prev.filter(s => s.id !== id));

            return true;
        } catch (err) {
            console.error('Erro ao remover aula:', err);
            throw err;
        }
    };

    // ========================================
    // HELPERS: Filtragem por dia
    // ========================================

    // Obter aulas de um dia específico
    const getSessionsByDay = (day: DayOfWeek): ClassSessionWithSubject[] => {
        return schedule.filter(s => s.day_of_week === day);
    };

    // Obter aulas de hoje
    const getTodaySessions = (): ClassSessionWithSubject[] => {
        const today = new Date().getDay() as DayOfWeek;
        return getSessionsByDay(today);
    };

    // Obter próxima aula
    const getNextSession = (): ClassSessionWithSubject | null => {
        const now = new Date();
        const currentDay = now.getDay() as DayOfWeek;
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

        // Procurar aula hoje que ainda não começou
        const todaySessions = getSessionsByDay(currentDay)
            .filter(s => s.start_time > currentTime)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

        if (todaySessions.length > 0) {
            return todaySessions[0];
        }

        // Procurar próxima aula nos próximos dias
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

    // Agrupar horário por dia (para vista semanal)
    const getScheduleByDay = (): Record<DayOfWeek, ClassSessionWithSubject[]> => {
        const byDay: Record<DayOfWeek, ClassSessionWithSubject[]> = {
            0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
        };

        schedule.forEach(session => {
            byDay[session.day_of_week].push(session);
        });

        // Ordenar cada dia por hora
        (Object.keys(byDay) as unknown as DayOfWeek[]).forEach(day => {
            byDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });

        return byDay;
    };

    return {
        schedule,
        loading,
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
    const subjects = useSubjects();
    const schedule = useSchedule();

    // Obter disciplinas com as suas sessões
    const getSubjectsWithSessions = (): SubjectWithSchedule[] => {
        return subjects.subjects.map(subject => ({
            ...subject,
            sessions: schedule.schedule
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
        ...subjects,
        ...schedule,
        getSubjectsWithSessions,
        isLoading: subjects.loading || schedule.loading,
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
