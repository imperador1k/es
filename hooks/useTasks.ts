import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { queryClient } from '@/providers/QueryProvider';
import { Task, TaskInsert, TaskType } from '@/types/database.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  user: (userId: string) => [...taskKeys.all, 'user', userId] as const,
};

// XP por tipo de tarefa
const TASK_XP: Record<TaskType, number> = {
  study: 30,
  assignment: 50,
  exam: 100,
};

/**
 * Hook para buscar tarefas do utilizador com cache
 */
export function useTasks() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: taskKeys.user(user?.id || ''),
    queryFn: async (): Promise<Task[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar tarefas:', error);
        throw error;
      }

      return (data as Task[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para criar tarefa com Optimistic Update
 */
export function useCreateTask() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<TaskInsert, 'user_id'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          user_id: user!.id,
          xp_reward: TASK_XP[task.type],
        })
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },

    onMutate: async (newTask) => {
      await qc.cancelQueries({ queryKey: taskKeys.user(user!.id) });

      const previous = qc.getQueryData<Task[]>(taskKeys.user(user!.id));

      const optimistic: Task = {
        id: `temp-${Date.now()}`,
        user_id: user!.id,
        title: newTask.title,
        description: newTask.description || null,
        due_date: newTask.due_date || null,
        is_completed: false,
        type: newTask.type,
        xp_reward: TASK_XP[newTask.type],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      qc.setQueryData<Task[]>(
        taskKeys.user(user!.id),
        (old) => [optimistic, ...(old || [])]
      );

      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        qc.setQueryData(taskKeys.user(user!.id), context.previous);
      }
    },

    onSuccess: (data) => {
      // Substituir optimistic pelo real
      qc.setQueryData<Task[]>(
        taskKeys.user(user!.id),
        (old) => old?.map((t) => (t.id.startsWith('temp-') ? data : t)) || [data]
      );
    },
  });
}

/**
 * Hook para completar tarefa com XP
 */
export function useCompleteTask() {
  const { user } = useAuthContext();
  const { addXPWithSync } = useProfile();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: true })
        .eq('id', taskId);

      if (error) throw error;
      return taskId;
    },

    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: taskKeys.user(user!.id) });

      const previous = qc.getQueryData<Task[]>(taskKeys.user(user!.id));

      qc.setQueryData<Task[]>(
        taskKeys.user(user!.id),
        (old) => old?.map((t) => (t.id === taskId ? { ...t, is_completed: true } : t))
      );

      return { previous };
    },

    onError: (err, taskId, context) => {
      if (context?.previous) {
        qc.setQueryData(taskKeys.user(user!.id), context.previous);
      }
    },

    onSuccess: async (taskId) => {
      const tasks = qc.getQueryData<Task[]>(taskKeys.user(user!.id));
      const task = tasks?.find((t) => t.id === taskId);
      
      if (task) {
        const xp = task.xp_reward || TASK_XP[task.type];
        await addXPWithSync(xp);
      }
    },
  });
}

/**
 * Hook para apagar tarefa
 */
export function useDeleteTask() {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return taskId;
    },

    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: taskKeys.user(user!.id) });

      const previous = qc.getQueryData<Task[]>(taskKeys.user(user!.id));

      qc.setQueryData<Task[]>(
        taskKeys.user(user!.id),
        (old) => old?.filter((t) => t.id !== taskId)
      );

      return { previous };
    },

    onError: (err, taskId, context) => {
      if (context?.previous) {
        qc.setQueryData(taskKeys.user(user!.id), context.previous);
      }
    },
  });
}

/**
 * Função utilitária para invalidar cache de tarefas
 */
export function invalidateTasks(userId: string) {
  queryClient.invalidateQueries({ queryKey: taskKeys.user(userId) });
}
