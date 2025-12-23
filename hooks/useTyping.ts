import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TypingUser {
  id: string;
  name: string;
}

/**
 * Hook para indicadores de "a escrever..." usando Supabase Broadcast
 * NÃO guarda na base de dados - apenas broadcast em tempo real
 */
export function useTyping(conversationId: string | null) {
  const { user } = useAuthContext();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  // Enviar evento "a escrever"
  const sendTyping = useCallback(() => {
    if (!conversationId || !user?.id || !channelRef.current) return;

    // Só envia se não estava já a escrever
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          userName: user.user_metadata?.full_name || 'Alguém',
        },
      });
    }

    // Reset do timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Parar de escrever após 2 segundos de inatividade
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping();
    }, 2000) as number;
  }, [conversationId, user?.id, user?.user_metadata?.full_name]);

  // Enviar evento "parou de escrever"
  const sendStopTyping = useCallback(() => {
    if (!conversationId || !user?.id || !channelRef.current) return;

    isTypingRef.current = false;
    channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: {
        userId: user.id,
      },
    });
  }, [conversationId, user?.id]);

  // Configurar canal de broadcast
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    channelRef.current = supabase.channel(`typing:${conversationId}`);

    channelRef.current
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        // Não mostrar se sou eu
        if (payload.userId === user.id) return;

        setTypingUsers((prev) => {
          // Já está na lista?
          if (prev.some((u) => u.id === payload.userId)) return prev;
          return [...prev, { id: payload.userId, name: payload.userName }];
        });
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        setTypingUsers((prev) => prev.filter((u) => u.id !== payload.userId));
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, user?.id]);

  // Texto formatado para mostrar
  const typingText = (): string | null => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].name} está a escrever...`;
    if (typingUsers.length === 2) return `${typingUsers[0].name} e ${typingUsers[1].name} estão a escrever...`;
    return `${typingUsers.length} pessoas estão a escrever...`;
  };

  return {
    typingUsers,
    typingText: typingText(),
    sendTyping,
    sendStopTyping,
    isTyping: typingUsers.length > 0,
  };
}
