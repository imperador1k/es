/**
 * Hook para DMs - VERSÃO OFFLINE-FIRST com INFINITE SCROLL
 * Usa TanStack Query para cache e persistência offline
 * Carrega mensagens em blocos (paginação) para performance
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { DMConversation, DMMessage, Profile } from '@/types/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

// ============================================
// CONFIG
// ============================================

const MESSAGES_PER_PAGE = 15; // Reduzido de 30 para 15 - carregamento mais rápido!

/**
 * Tipo para conversa com dados do outro utilizador
 */
export interface ConversationWithUser extends DMConversation {
  other_user: Profile;
  last_message?: DMMessage | null;
  unread_count: number;
}

/**
 * Tipo para mensagem com dados do sender
 */
export interface DMMessageWithSender extends DMMessage {
  sender: Profile | null;
}

// ============================================
// QUERY KEYS
// ============================================

export const dmKeys = {
  all: ['dm'] as const,
  conversations: (userId: string) => [...dmKeys.all, 'conversations', userId] as const,
  messages: (conversationId: string) => [...dmKeys.all, 'messages', conversationId] as const,
};

// ============================================
// FETCH FUNCTIONS (OPTIMIZED - NO N+1!)
// ============================================

async function fetchConversations(userId: string): Promise<ConversationWithUser[]> {
  // Query única com todos os dados necessários
  const { data: conversations, error } = await supabase
    .from('dm_conversations')
    .select(`
      *,
      user1:profiles!dm_conversations_user1_id_fkey(id, username, full_name, avatar_url, status, last_seen_at),
      user2:profiles!dm_conversations_user2_id_fkey(id, username, full_name, avatar_url, status, last_seen_at)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  if (!conversations || conversations.length === 0) return [];

  // Buscar última mensagem de cada conversa em batch (máx 50 conversas de uma vez)
  const conversationIds = conversations.map(c => c.id);
  
  // RPC para buscar última mensagem de cada conversa (mais eficiente)
  // Se não existir a função, fazemos fallback
  let lastMessages: Record<string, DMMessage> = {};
  let unreadCounts: Record<string, number> = {};
  
  try {
    // Buscar últimas mensagens em lote
    const { data: messagesData } = await supabase
      .from('dm_messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });
    
    // Agrupar por conversation_id (pega apenas a primeira/mais recente de cada)
    if (messagesData) {
      for (const msg of messagesData) {
        if (!lastMessages[msg.conversation_id]) {
          lastMessages[msg.conversation_id] = msg;
        }
      }
    }
    
    // Contar não lidas em lote
    const { data: unreadData } = await supabase
      .from('dm_messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('is_read', false)
      .neq('sender_id', userId);
    
    if (unreadData) {
      for (const item of unreadData) {
        unreadCounts[item.conversation_id] = (unreadCounts[item.conversation_id] || 0) + 1;
      }
    }
  } catch (err) {
    console.warn('Error fetching message data:', err);
  }

  // Mapear resultados
  const mapped: ConversationWithUser[] = conversations.map((conv: any) => ({
    ...conv,
    other_user: (conv.user1_id === userId ? conv.user2 : conv.user1) as Profile,
    last_message: lastMessages[conv.id] || null,
    unread_count: unreadCounts[conv.id] || 0,
  }));

  return mapped;
}

// Função para buscar página de mensagens (para infinite scroll)
async function fetchDMMessagesPage(
  conversationId: string, 
  pageParam: number = 0
): Promise<{ messages: DMMessageWithSender[]; nextCursor: number | null }> {
  const offset = pageParam * MESSAGES_PER_PAGE;
  
  const { data, error } = await supabase
    .from('dm_messages')
    .select(`
      *,
      sender:profiles!dm_messages_sender_id_fkey(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + MESSAGES_PER_PAGE - 1);

  if (error) throw error;

  const messages = (data as DMMessageWithSender[]) || [];
  
  // Se recebemos menos que o limite, não há mais páginas
  const hasMore = messages.length === MESSAGES_PER_PAGE;
  
  return {
    messages,
    nextCursor: hasMore ? pageParam + 1 : null,
  };
}

// ============================================
// HOOK: useConversations - OFFLINE-FIRST
// ============================================

export function useConversations() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  const {
    data: conversations = [],
    isLoading: loading,
    refetch: loadConversations,
    isRefetching,
  } = useQuery<ConversationWithUser[]>({
    queryKey: dmKeys.conversations(user?.id || ''),
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 60 * 24,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!user?.id) return;

    realtimeRef.current = supabase
      .channel('conversations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: dmKeys.conversations(user.id) });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: dmKeys.conversations(user.id) });
        }
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [user?.id, queryClient]);

  const unreadConversationsCount = conversations.filter(c => c.unread_count > 0).length;

  return { 
    conversations, 
    loading, 
    isRefetching,
    refetch: loadConversations, 
    unreadConversationsCount 
  };
}

// ============================================
// HOOK: useDMMessages - INFINITE SCROLL ⚡
// ============================================

export function useDMMessages(conversationId: string | null) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Infinite Query para paginação de mensagens
  const {
    data,
    isLoading: loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: loadMessages,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: dmKeys.messages(conversationId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      const result = await fetchDMMessagesPage(conversationId!, pageParam);
      
      // Marcar mensagens como LIDAS (apenas na primeira página)
      if (pageParam === 0 && user?.id) {
        await supabase
          .from('dm_messages')
          .update({ status: 'read', is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .in('status', ['sent', 'delivered']);
      }
      
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 60 * 24,
  });

  // Flatten all pages into single array
  const messages: DMMessageWithSender[] = data?.pages.flatMap(page => page.messages) || [];

  // Mutation para enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async ({ content, fileUrl }: { content: string; fileUrl?: string }) => {
      if (!user?.id || !conversationId || (!content.trim() && !fileUrl)) {
        throw new Error('Invalid message params');
      }

      const { data: newMsg, error } = await supabase.from('dm_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim() || '📷',
        file_url: fileUrl || null,
        status: 'sent',
      }).select('*').single();

      if (error) throw error;

      await supabase
        .from('dm_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return newMsg;
    },
    // Optimistic update: aparecer mensagem imediatamente
    onMutate: async ({ content, fileUrl }) => {
      await queryClient.cancelQueries({ queryKey: dmKeys.messages(conversationId!) });
      
      const previousData = queryClient.getQueryData(dmKeys.messages(conversationId!));
      
      // Criar mensagem optimista
      const optimisticMessage: DMMessageWithSender = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId!,
        sender_id: user!.id,
        content: content.trim() || '📷',
        file_url: fileUrl || null,
        status: 'sent',
        is_read: false,
        created_at: new Date().toISOString(),
        sender: null, // Será preenchido pelo realtime
      };

      // Adicionar ao início da primeira página
      queryClient.setQueryData(dmKeys.messages(conversationId!), (old: any) => {
        if (!old?.pages?.length) {
          return { pages: [{ messages: [optimisticMessage], nextCursor: null }], pageParams: [0] };
        }
        return {
          ...old,
          pages: [
            { ...old.pages[0], messages: [optimisticMessage, ...old.pages[0].messages] },
            ...old.pages.slice(1),
          ],
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(dmKeys.messages(conversationId!), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dmKeys.conversations(user!.id) });
    },
  });

  // Setup realtime
  useEffect(() => {
    if (!conversationId) return;

    realtimeRef.current = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg: DMMessageWithSender = {
            ...(payload.new as DMMessage),
            sender: senderData as Profile,
          };

          // Adicionar ao cache (início da primeira página)
          queryClient.setQueryData(dmKeys.messages(conversationId), (old: any) => {
            if (!old?.pages?.length) {
              return { pages: [{ messages: [newMsg], nextCursor: null }], pageParams: [0] };
            }
            
            // Verificar se já existe (optimistic update)
            const exists = old.pages[0].messages.some((m: any) => 
              m.id === newMsg.id || m.id.startsWith('temp-')
            );
            
            if (exists) {
              // Substituir mensagem temporária pela real
              return {
                ...old,
                pages: [
                  { 
                    ...old.pages[0], 
                    messages: old.pages[0].messages.map((m: any) => 
                      m.id.startsWith('temp-') ? newMsg : m
                    ).filter((m: any, i: number, arr: any[]) => 
                      arr.findIndex((x: any) => x.id === m.id) === i
                    )
                  },
                  ...old.pages.slice(1),
                ],
              };
            }
            
            return {
              ...old,
              pages: [
                { ...old.pages[0], messages: [newMsg, ...old.pages[0].messages] },
                ...old.pages.slice(1),
              ],
            };
          });

          if (payload.new.sender_id !== user?.id) {
            await supabase
              .from('dm_messages')
              .update({ status: 'read', is_read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          queryClient.setQueryData(dmKeys.messages(conversationId), (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((msg: any) =>
                  msg.id === payload.new.id
                    ? { ...msg, status: payload.new.status, is_read: payload.new.is_read }
                    : msg
                ),
              })),
            };
          });
        }
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [conversationId, user?.id, queryClient]);

  // Wrapper para sendMessage
  const sendMessage = async (content: string, fileUrl?: string): Promise<boolean> => {
    try {
      await sendMutation.mutateAsync({ content, fileUrl });
      return true;
    } catch (err) {
      console.error('Erro ao enviar:', err);
      return false;
    }
  };

  // Função para carregar mais mensagens (scroll up)
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { 
    messages, 
    loading, 
    isRefetching,
    sending: sendMutation.isPending, 
    sendMessage, 
    refetch: loadMessages,
    // INFINITE SCROLL
    loadMore,
    hasMore: !!hasNextPage,
    loadingMore: isFetchingNextPage,
  };
}

// ============================================
// HOOK: useStartConversation
// ============================================

export function useStartConversation() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const startOrGetConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user?.id || !otherUserId) return null;

    try {
      const { data: existing } = await supabase
        .from('dm_conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .single();

      if (existing) {
        return existing.id;
      }

      const { data: newConv, error } = await supabase
        .from('dm_conversations')
        .insert({
          user1_id: user.id,
          user2_id: otherUserId,
        })
        .select('id')
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: dmKeys.conversations(user.id) });

      return newConv?.id || null;
    } catch (err) {
      console.error('Erro ao criar conversa:', err);
      return null;
    }
  };

  return { startOrGetConversation };
}
