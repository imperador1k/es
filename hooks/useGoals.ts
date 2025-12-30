/**
 * Hook para Goals/Objectivos do Utilizador
 * Tabela: user_goals
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================

export interface UserGoal {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    target_value: number;
    current_value: number;
    goal_type: 'study_hours' | 'tasks' | 'streak' | 'xp' | 'custom';
    deadline?: string;
    is_completed: boolean;
    created_at: string;
}

export interface CreateGoalInput {
    title: string;
    description?: string;
    target_value: number;
    goal_type: UserGoal['goal_type'];
    deadline?: string;
}

// ============================================
// QUERY KEYS
// ============================================

export const goalKeys = {
    all: ['goals'] as const,
    user: (userId: string) => [...goalKeys.all, 'user', userId] as const,
    active: (userId: string) => [...goalKeys.all, 'active', userId] as const,
};

// ============================================
// HOOK: useGoals
// ============================================

export function useGoals() {
    const { user } = useAuthContext();

    const query = useQuery({
        queryKey: goalKeys.user(user?.id || ''),
        queryFn: async (): Promise<UserGoal[]> => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('user_goals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error loading goals:', error);
                throw error;
            }

            return (data as UserGoal[]) || [];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return {
        goals: query.data || [],
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

// ============================================
// HOOK: useActiveGoals (only non-completed)
// ============================================

export function useActiveGoals() {
    const { user } = useAuthContext();

    const query = useQuery({
        queryKey: goalKeys.active(user?.id || ''),
        queryFn: async (): Promise<UserGoal[]> => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('user_goals')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_completed', false)
                .order('deadline', { ascending: true, nullsFirst: false });

            if (error) {
                console.error('❌ Error loading active goals:', error);
                throw error;
            }

            return (data as UserGoal[]) || [];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    return {
        activeGoals: query.data || [],
        loading: query.isLoading,
        refetch: query.refetch,
    };
}

// ============================================
// HOOK: useCreateGoal
// ============================================

export function useCreateGoal() {
    const { user } = useAuthContext();
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateGoalInput) => {
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('user_goals')
                .insert({
                    user_id: user.id,
                    title: input.title,
                    description: input.description,
                    target_value: input.target_value,
                    current_value: 0,
                    goal_type: input.goal_type,
                    deadline: input.deadline,
                    is_completed: false,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: goalKeys.all });
        },
    });
}

// ============================================
// HOOK: useUpdateGoalProgress
// ============================================

export function useUpdateGoalProgress() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ goalId, newValue }: { goalId: string; newValue: number }) => {
            // First get the goal to check if completed
            const { data: goal } = await supabase
                .from('user_goals')
                .select('target_value')
                .eq('id', goalId)
                .single();

            const isCompleted = goal ? newValue >= goal.target_value : false;

            const { error } = await supabase
                .from('user_goals')
                .update({
                    current_value: newValue,
                    is_completed: isCompleted,
                })
                .eq('id', goalId);

            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: goalKeys.all });
        },
    });
}

// ============================================
// HOOK: useDeleteGoal
// ============================================

export function useDeleteGoal() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (goalId: string) => {
            const { error } = await supabase
                .from('user_goals')
                .delete()
                .eq('id', goalId);

            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: goalKeys.all });
        },
    });
}

// ============================================
// HELPERS
// ============================================

export function getGoalProgress(goal: UserGoal): number {
    if (goal.target_value === 0) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
}

export function getGoalTypeIcon(type: UserGoal['goal_type']): string {
    switch (type) {
        case 'study_hours': return 'time-outline';
        case 'tasks': return 'checkbox-outline';
        case 'streak': return 'flame-outline';
        case 'xp': return 'flash-outline';
        default: return 'flag-outline';
    }
}

export function getGoalTypeLabel(type: UserGoal['goal_type']): string {
    switch (type) {
        case 'study_hours': return 'Horas de Estudo';
        case 'tasks': return 'Tarefas';
        case 'streak': return 'Streak';
        case 'xp': return 'XP';
        default: return 'Objetivo';
    }
}
