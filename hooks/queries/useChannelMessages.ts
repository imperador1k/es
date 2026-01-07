/**
 * useChannelMessages Hook
 * TanStack Query hook for channel messages with Realtime updates
 * Provides aggressive caching + instant updates
 */

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/providers/QueryProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface MessageAuthor {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
}

export interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    created_at: string;
    author: MessageAuthor | null;
    attachment_url?: string | null;
    attachment_type?: 'image' | 'video' | 'file' | 'gif' | null;
    attachment_name?: string | null;
}

// ============================================
// FETCH FUNCTION
// ============================================

async function fetchChannelMessages(channelId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select(`
            id, 
            channel_id, 
            user_id, 
            content, 
            created_at, 
            attachment_url, 
            attachment_type, 
            attachment_name, 
            author:profiles!user_id (id, username, full_name, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;

    return (data || []).map((m: any) => ({
        ...m,
        author: Array.isArray(m.author) ? m.author[0] : m.author,
    }));
}

// ============================================
// HOOK
// ============================================

export function useChannelMessages(channelId: string | undefined) {
    const queryClient = useQueryClient();
    const queryKey = ['channel-messages', channelId];

    // Main query with aggressive caching
    const query = useQuery({
        queryKey,
        queryFn: () => fetchChannelMessages(channelId!),
        enabled: !!channelId,
        staleTime: 60 * 1000, // 1 minute - don't refetch if just opened
        gcTime: 5 * 60 * 1000, // 5 minutes in memory
    });

    // Realtime subscription - adds new messages to cache
    useEffect(() => {
        if (!channelId) return;

        const channel = supabase
            .channel(`room:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`,
                },
                async (payload) => {
                    // Fetch full message with author (Realtime only sends the row, not joins)
                    const { data } = await supabase
                        .from('messages')
                        .select(`
                            id, 
                            channel_id, 
                            user_id, 
                            content, 
                            created_at, 
                            attachment_url, 
                            attachment_type, 
                            attachment_name, 
                            author:profiles!user_id (id, username, full_name, avatar_url)
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        const newMessage: Message = {
                            ...data,
                            author: Array.isArray(data.author) ? data.author[0] : data.author,
                        };

                        // Add to cache without refetching
                        queryClient.setQueryData<Message[]>(queryKey, (old = []) => {
                            // Avoid duplicates
                            if (old.some((m) => m.id === newMessage.id)) return old;
                            return [newMessage, ...old];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId, queryClient]);

    return {
        messages: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
    };
}

// ============================================
// HELPERS
// ============================================

/**
 * Prefetch messages for a channel (use before navigation)
 */
export function prefetchChannelMessages(channelId: string) {
    return queryClient.prefetchQuery({
        queryKey: ['channel-messages', channelId],
        queryFn: () => fetchChannelMessages(channelId),
        staleTime: 60 * 1000,
    });
}

/**
 * Optimistic add message to cache (for instant UI feedback)
 */
export function addOptimisticMessage(channelId: string, message: Message) {
    queryClient.setQueryData<Message[]>(['channel-messages', channelId], (old = []) => {
        if (old.some((m) => m.id === message.id)) return old;
        return [message, ...old];
    });
}
