/**
 * Hook para gerir Notificações (Feed de Atividade)
 * Escola+ App
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { NotificationInsert, NotificationWithActor } from '@/types/database.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// ============================================
// QUERY KEYS
// ============================================

export const notificationKeys = {
    all: ['notifications'] as const,
    user: (userId: string) => [...notificationKeys.all, 'user', userId] as const,
    unreadCount: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
};

// ============================================
// HOOK: useNotifications
// ============================================

export function useNotifications() {
    const { user } = useAuthContext();
    const qc = useQueryClient();

    // Query para buscar notificações
    const query = useQuery({
        queryKey: notificationKeys.user(user?.id || ''),
        queryFn: async (): Promise<NotificationWithActor[]> => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    actor:profiles!actor_id (
                        id,
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Erro ao carregar notificações:', error);
                throw error;
            }

            return (data as NotificationWithActor[]) || [];
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60, // 1 minuto
    });

    // Contador de não lidas
    const unreadQuery = useQuery({
        queryKey: notificationKeys.unreadCount(user?.id || ''),
        queryFn: async (): Promise<number> => {
            if (!user?.id) return 0;

            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) {
                console.error('Erro ao contar notificações:', error);
                return 0;
            }

            return count || 0;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 30, // 30 segundos
    });

    // Real-time subscription
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                    console.log('🔔 Nova notificação:', payload.new);
                    
                    // Buscar dados do actor
                    const actorId = (payload.new as any).actor_id;
                    let actor = null;
                    
                    if (actorId) {
                        const { data } = await supabase
                            .from('profiles')
                            .select('id, username, full_name, avatar_url')
                            .eq('id', actorId)
                            .single();
                        actor = data;
                    }

                    const newNotif: NotificationWithActor = {
                        ...(payload.new as any),
                        actor,
                    };

                    // Atualizar cache
                    qc.setQueryData<NotificationWithActor[]>(
                        notificationKeys.user(user.id),
                        (old) => [newNotif, ...(old || [])]
                    );

                    // Incrementar contador
                    qc.setQueryData<number>(
                        notificationKeys.unreadCount(user.id),
                        (old) => (old || 0) + 1
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    // Atualizar notificação existente
                    qc.setQueryData<NotificationWithActor[]>(
                        notificationKeys.user(user.id),
                        (old) => old?.map(n => 
                            n.id === payload.new.id 
                                ? { ...n, ...(payload.new as any) } 
                                : n
                        ) || []
                    );

                    // Recalcular unread count
                    qc.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, qc]);

    return {
        notifications: query.data || [],
        loading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        unreadCount: unreadQuery.data || 0,
    };
}

// ============================================
// HOOK: useMarkNotificationRead
// ============================================

export function useMarkNotificationRead() {
    const { user } = useAuthContext();
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;
            return notificationId;
        },
        onMutate: async (notificationId) => {
            // Optimistic update
            qc.setQueryData<NotificationWithActor[]>(
                notificationKeys.user(user!.id),
                (old) => old?.map(n => 
                    n.id === notificationId ? { ...n, is_read: true } : n
                ) || []
            );

            // Decrementar contador
            qc.setQueryData<number>(
                notificationKeys.unreadCount(user!.id),
                (old) => Math.max(0, (old || 1) - 1)
            );
        },
    });
}

// ============================================
// HOOK: useMarkAllNotificationsRead
// ============================================

export function useMarkAllNotificationsRead() {
    const { user } = useAuthContext();
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user!.id)
                .eq('is_read', false);

            if (error) throw error;
        },
        onMutate: async () => {
            // Optimistic update
            qc.setQueryData<NotificationWithActor[]>(
                notificationKeys.user(user!.id),
                (old) => old?.map(n => ({ ...n, is_read: true })) || []
            );

            // Zerar contador
            qc.setQueryData<number>(
                notificationKeys.unreadCount(user!.id),
                0
            );
        },
    });
}

// ============================================
// FUNÇÃO UTILITÁRIA: Criar Notificação
// ============================================

export async function createNotification(notification: NotificationInsert): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert(notification);

        if (error) {
            console.error('Erro ao criar notificação:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Erro ao criar notificação:', err);
        return false;
    }
}

// ============================================
// FUNÇÃO UTILITÁRIA: Criar Notificações em Massa
// ============================================

export async function createBulkNotifications(notifications: NotificationInsert[]): Promise<boolean> {
    if (notifications.length === 0) return true;

    try {
        const { error } = await supabase
            .from('notifications')
            .insert(notifications);

        if (error) {
            console.error('Erro ao criar notificações em massa:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('Erro ao criar notificações em massa:', err);
        return false;
    }
}
