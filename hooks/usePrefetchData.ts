/**
 * 🚀 usePrefetchData - Prefetch agressivo de dados ao iniciar app
 * Carrega TODOS os dados importantes para o cache offline
 * Deve ser chamado uma vez no _layout.tsx após autenticação
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

interface PrefetchStatus {
    isLoading: boolean;
    progress: number; // 0-100
    currentTask: string;
    error: string | null;
    isComplete: boolean;
}

// Lista de dados a fazer prefetch
const PREFETCH_TASKS = [
    { key: 'subjects', label: 'Disciplinas' },
    { key: 'schedule', label: 'Horário' },
    { key: 'conversations', label: 'Conversas' },
    { key: 'friends', label: 'Amigos' },
    { key: 'teams', label: 'Equipas' },
    { key: 'todos', label: 'Tarefas' },
    { key: 'profile', label: 'Perfil' },
];

export function usePrefetchData() {
    const { user } = useAuthContext();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<PrefetchStatus>({
        isLoading: false,
        progress: 0,
        currentTask: '',
        error: null,
        isComplete: false,
    });

    const prefetchAll = useCallback(async () => {
        if (!user?.id) return;

        setStatus({
            isLoading: true,
            progress: 0,
            currentTask: 'A iniciar...',
            error: null,
            isComplete: false,
        });

        const totalTasks = PREFETCH_TASKS.length;
        let completedTasks = 0;

        try {
            // 1. Disciplinas
            setStatus(s => ({ ...s, currentTask: 'Disciplinas', progress: (completedTasks / totalTasks) * 100 }));
            await queryClient.prefetchQuery({
                queryKey: ['subjects', user.id],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('user_subjects')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('name');
                    return data || [];
                },
                staleTime: 1000 * 60 * 5,
            });
            completedTasks++;

            // 2. Horário
            setStatus(s => ({ ...s, currentTask: 'Horário', progress: (completedTasks / totalTasks) * 100 }));
            await queryClient.prefetchQuery({
                queryKey: ['schedule', user.id],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('class_schedule')
                        .select('*, subject:user_subjects(*)')
                        .eq('user_id', user.id)
                        .order('day_of_week')
                        .order('start_time');
                    return data || [];
                },
                staleTime: 1000 * 60 * 5,
            });
            completedTasks++;

            // 3. Conversas (DMs) - usando mesma query key que useDMs.ts
            setStatus(s => ({ ...s, currentTask: 'Conversas', progress: (completedTasks / totalTasks) * 100 }));
            await queryClient.prefetchQuery({
                queryKey: ['dm', 'conversations', user.id],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('dm_conversations')
                        .select(`
                            *,
                            user1:profiles!dm_conversations_user1_id_fkey(*),
                            user2:profiles!dm_conversations_user2_id_fkey(*)
                        `)
                        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
                        .order('last_message_at', { ascending: false, nullsFirst: false });
                    
                    // Mapear para incluir o "outro" user + última mensagem
                    const mapped = await Promise.all(
                        (data || []).map(async (conv: any) => {
                            const otherUser = conv.user1_id === user.id ? conv.user2 : conv.user1;
                            
                            const { data: lastMsg } = await supabase
                                .from('dm_messages')
                                .select('*')
                                .eq('conversation_id', conv.id)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .single();
                            
                            const { count } = await supabase
                                .from('dm_messages')
                                .select('*', { count: 'exact', head: true })
                                .eq('conversation_id', conv.id)
                                .eq('is_read', false)
                                .neq('sender_id', user.id);
                            
                            return {
                                ...conv,
                                other_user: otherUser,
                                last_message: lastMsg || null,
                                unread_count: count || 0,
                            };
                        })
                    );
                    return mapped;
                },
                staleTime: 1000 * 60 * 2,
            });
            completedTasks++;

            // 4. Amigos
            setStatus(s => ({ ...s, currentTask: 'Amigos', progress: (completedTasks / totalTasks) * 100 }));
            await queryClient.prefetchQuery({
                queryKey: ['friends', user.id],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('friendships')
                        .select(`
                            id,
                            friend:profiles!friendships_friend_id_fkey (
                                id, username, avatar_url, current_level
                            )
                        `)
                        .eq('user_id', user.id)
                        .eq('status', 'accepted');
                    return data || [];
                },
                staleTime: 1000 * 60 * 5,
            });
            completedTasks++;

            // 5. Equipas
            setStatus(s => ({ ...s, currentTask: 'Equipas', progress: (completedTasks / totalTasks) * 100 }));
            await queryClient.prefetchQuery({
                queryKey: ['teams', user.id],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('team_members')
                        .select(`
                            team_id,
                            role,
                            teams!inner (
                                id, name, icon, color
                            )
                        `)
                        .eq('user_id', user.id);
                    return data || [];
                },
                staleTime: 1000 * 60 * 5,
            });
            completedTasks++;

            // 6. Tarefas Pessoais
            setStatus(s => ({ ...s, currentTask: 'Tarefas', progress: (completedTasks / totalTasks) * 100 }));
            await queryClient.prefetchQuery({
                queryKey: ['todos', user.id],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('personal_todos')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('due_date', { ascending: true });
                    return data || [];
                },
                staleTime: 1000 * 60 * 2,
            });
            completedTasks++;

            // 7. Perfil
            setStatus(s => ({ ...s, currentTask: 'Perfil', progress: (completedTasks / totalTasks) * 100 }));
            await queryClient.prefetchQuery({
                queryKey: ['profile', user.id],
                queryFn: async () => {
                    const { data } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    return data;
                },
                staleTime: 1000 * 60 * 5,
            });
            completedTasks++;

            // Concluído!
            setStatus({
                isLoading: false,
                progress: 100,
                currentTask: 'Concluído!',
                error: null,
                isComplete: true,
            });

            console.log('✅ Prefetch complete! All data cached for offline use.');

        } catch (error: any) {
            console.error('❌ Prefetch error:', error);
            setStatus(s => ({
                ...s,
                isLoading: false,
                error: error.message || 'Erro ao carregar dados',
                isComplete: true, // Mesmo com erro, marca como complete para não bloquear
            }));
        }
    }, [user?.id, queryClient]);

    // Auto-prefetch quando user muda
    useEffect(() => {
        if (user?.id) {
            prefetchAll();
        }
    }, [user?.id, prefetchAll]);

    return {
        ...status,
        refetch: prefetchAll,
    };
}

export default usePrefetchData;
