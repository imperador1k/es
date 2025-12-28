/**
 * usePersonalTodos Hook
 * Manages personal to-do items with subtasks
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface TodoStep {
    id: string;
    todo_id: string;
    content: string;
    is_completed: boolean;
    sort_order: number;
}

export interface PersonalTodo {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    is_completed: boolean;
    completed_at: string | null;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    subject_id: string | null;
    created_at: string;
    updated_at: string;
    steps?: TodoStep[];
    subject?: {
        name: string;
        color: string;
    };
}

export interface CreateTodoInput {
    title: string;
    description?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    subject_id?: string;
    steps?: string[]; // Array of step contents
}

// ============================================
// HOOK
// ============================================

export function usePersonalTodos() {
    const { user } = useAuthContext();
    const [todos, setTodos] = useState<PersonalTodo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch todos
    const fetchTodos = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data, error: fetchError } = await supabase
                .from('personal_todos')
                .select(`
                    *,
                    steps:personal_todo_steps(id, content, is_completed, sort_order),
                    subject:user_subjects(name, color)
                `)
                .eq('user_id', user.id)
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            // Process data
            const processed = (data || []).map(todo => ({
                ...todo,
                steps: Array.isArray(todo.steps) ? todo.steps.sort((a: TodoStep, b: TodoStep) => a.sort_order - b.sort_order) : [],
                subject: Array.isArray(todo.subject) ? todo.subject[0] : todo.subject,
            }));

            setTodos(processed);
        } catch (err: any) {
            console.error('Error fetching todos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

    // Create todo
    const createTodo = async (input: CreateTodoInput): Promise<PersonalTodo | null> => {
        if (!user?.id) return null;

        try {
            // Insert todo
            const { data: todo, error: insertError } = await supabase
                .from('personal_todos')
                .insert({
                    user_id: user.id,
                    title: input.title,
                    description: input.description || null,
                    due_date: input.due_date || null,
                    priority: input.priority || 'medium',
                    tags: input.tags || [],
                    subject_id: input.subject_id || null,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Insert steps if provided
            if (input.steps && input.steps.length > 0 && todo) {
                const stepsToInsert = input.steps.map((content, index) => ({
                    todo_id: todo.id,
                    content,
                    sort_order: index,
                }));

                await supabase
                    .from('personal_todo_steps')
                    .insert(stepsToInsert);
            }

            // Refresh and return
            await fetchTodos();
            return todo;
        } catch (err: any) {
            console.error('Error creating todo:', err);
            setError(err.message);
            return null;
        }
    };

    // Toggle todo completion
    const toggleTodo = async (todoId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase.rpc('toggle_todo_completion', {
                p_todo_id: todoId,
            });

            if (error) throw error;

            // Update local state
            setTodos(prev => prev.map(t => 
                t.id === todoId 
                    ? { ...t, is_completed: data, completed_at: data ? new Date().toISOString() : null }
                    : t
            ));

            return data;
        } catch (err: any) {
            console.error('Error toggling todo:', err);
            return false;
        }
    };

    // Toggle step completion
    const toggleStep = async (stepId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase.rpc('toggle_todo_step', {
                p_step_id: stepId,
            });

            if (error) throw error;

            // Update local state
            setTodos(prev => prev.map(todo => ({
                ...todo,
                steps: todo.steps?.map(step =>
                    step.id === stepId ? { ...step, is_completed: data } : step
                ),
            })));

            return data;
        } catch (err: any) {
            console.error('Error toggling step:', err);
            return false;
        }
    };

    // Delete todo
    const deleteTodo = async (todoId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('personal_todos')
                .delete()
                .eq('id', todoId);

            if (error) throw error;

            setTodos(prev => prev.filter(t => t.id !== todoId));
            return true;
        } catch (err: any) {
            console.error('Error deleting todo:', err);
            return false;
        }
    };

    // Add step to existing todo
    const addStep = async (todoId: string, content: string): Promise<TodoStep | null> => {
        try {
            const todo = todos.find(t => t.id === todoId);
            const sortOrder = (todo?.steps?.length || 0);

            const { data, error } = await supabase
                .from('personal_todo_steps')
                .insert({
                    todo_id: todoId,
                    content,
                    sort_order: sortOrder,
                })
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setTodos(prev => prev.map(t => 
                t.id === todoId 
                    ? { ...t, steps: [...(t.steps || []), data] }
                    : t
            ));

            return data;
        } catch (err: any) {
            console.error('Error adding step:', err);
            return null;
        }
    };

    return {
        todos,
        loading,
        error,
        createTodo,
        toggleTodo,
        toggleStep,
        deleteTodo,
        addStep,
        refresh: fetchTodos,
    };
}
