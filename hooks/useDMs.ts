import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { DMConversation, DMMessage, Profile } from '@/types/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * Hook para listar conversas privadas
 */
export function useConversations() {
  const { user } = useAuthContext();
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Buscar todas as conversas onde participo
      const { data, error } = await supabase
        .from('dm_conversations')
        .select(`
          *,
          user1:profiles!dm_conversations_user1_id_fkey(*),
          user2:profiles!dm_conversations_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Mapear para incluir o "outro" user
      const mapped: ConversationWithUser[] = await Promise.all(
        (data || []).map(async (conv: any) => {
          const otherUser = conv.user1_id === user.id ? conv.user2 : conv.user1;

          // Buscar última mensagem
          const { data: lastMsg } = await supabase
            .from('dm_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Contar não lidas
          const { count } = await supabase
            .from('dm_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            other_user: otherUser as Profile,
            last_message: lastMsg || null,
            unread_count: count || 0,
          };
        })
      );

      setConversations(mapped);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Realtime: atualizar quando novas mensagens chegam
  useEffect(() => {
    if (!user?.id) return;

    loadConversations();

    // Subscrever a mudanças em dm_messages e dm_conversations
    realtimeRef.current = supabase
      .channel('conversations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_messages' },
        () => {
          // Recarregar lista quando qualquer mensagem muda
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dm_conversations' },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [user?.id, loadConversations]);

  return { conversations, loading, refetch: loadConversations };
}

/**
 * Hook para uma conversa específica (mensagens + realtime)
 */
export function useDMMessages(conversationId: string | null) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<DMMessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Carregar mensagens
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('dm_messages')
        .select(`
          *,
          sender:profiles!dm_messages_sender_id_fkey(*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages((data as DMMessageWithSender[]) || []);

      // Marcar mensagens como LIDAS (read) - apenas as que não são minhas e estão delivered
      if (user?.id) {
        await supabase
          .from('dm_messages')
          .update({ status: 'read', is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .in('status', ['sent', 'delivered']); // Marca as que ainda não foram lidas
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  // Enviar mensagem
  const sendMessage = async (content: string, fileUrl?: string): Promise<boolean> => {
    if (!user?.id || !conversationId || (!content.trim() && !fileUrl)) return false;

    try {
      setSending(true);

      const { error } = await supabase.from('dm_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim() || '📷',
        file_url: fileUrl || null,
        status: 'sent', // Mensagem nasce como 'sent' (✓)
      });

      if (error) throw error;

      // Atualizar last_message_at na conversa
      await supabase
        .from('dm_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return true;
    } catch (err) {
      console.error('Erro ao enviar:', err);
      return false;
    } finally {
      setSending(false);
    }
  };

  // Setup realtime
  useEffect(() => {
    if (!conversationId) return;

    loadMessages();

    // Subscrever a novas mensagens
    realtimeRef.current = supabase
      .channel(`dm:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          // Buscar dados do sender
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg: DMMessageWithSender = {
            ...(payload.new as DMMessage),
            sender: senderData as Profile,
          };

          setMessages((prev) => [newMsg, ...prev]);

          // Se a mensagem não é minha, marcá-la como 'delivered' -> 'read'
          // Como o utilizador está com o chat aberto, marcamos direto como 'read'
          if (payload.new.sender_id !== user?.id) {
            await supabase
              .from('dm_messages')
              .update({ status: 'read', is_read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      // Também ouvir UPDATEs para atualizar status das minhas mensagens (quando o outro lê)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          // Atualizar o status na lista local
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, status: payload.new.status, is_read: payload.new.is_read }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
      }
    };
  }, [conversationId, loadMessages, user?.id]);

  return { messages, loading, sending, sendMessage, refetch: loadMessages };
}

/**
 * Hook para iniciar/obter conversa com um utilizador
 */
export function useStartConversation() {
  const { user } = useAuthContext();

  const startOrGetConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user?.id || !otherUserId) return null;

    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('dm_conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .single();

      if (existing) {
        return existing.id;
      }

      // Criar nova conversa
      const { data: newConv, error } = await supabase
        .from('dm_conversations')
        .insert({
          user1_id: user.id,
          user2_id: otherUserId,
        })
        .select('id')
        .single();

      if (error) throw error;
      return newConv?.id || null;
    } catch (err) {
      console.error('Erro ao criar conversa:', err);
      return null;
    }
  };

  return { startOrGetConversation };
}
