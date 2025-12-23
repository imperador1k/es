import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { queryClient } from '@/providers/QueryProvider';
import { MessageWithAuthor } from '@/types/database.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Query keys
export const messageKeys = {
  all: ['messages'] as const,
  channel: (channelId: string) => [...messageKeys.all, 'channel', channelId] as const,
};

// Tipo para nova mensagem (optimistic)
interface NewMessage {
  content: string;
  fileUrl?: string | null;
}

/**
 * Hook para buscar mensagens de um canal com cache agressiva e real-time
 */
export function useMessages(channelId: string) {
  const qc = useQueryClient();

  // Query para buscar mensagens
  const query = useQuery({
    queryKey: messageKeys.channel(channelId),
    queryFn: async (): Promise<MessageWithAuthor[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          author:profiles!user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao carregar mensagens:', error);
        throw error;
      }

      return (data as MessageWithAuthor[]) || [];
    },
    enabled: !!channelId,
    staleTime: 1000 * 60 * 2, // 2 minutos de cache
  });

  // Subscription real-time para novas mensagens
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('📩 Nova mensagem via real-time:', payload.new);

          // Buscar dados do autor
          const { data: authorData } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMsg: MessageWithAuthor = {
            ...(payload.new as any),
            author: authorData,
          };

          // Atualizar cache do React Query
          qc.setQueryData<MessageWithAuthor[]>(
            messageKeys.channel(channelId),
            (old) => {
              if (!old) return [newMsg];
              // Evitar duplicados (caso já exista por optimistic update)
              const exists = old.some((m) => m.id === newMsg.id);
              if (exists) {
                // Atualizar mensagem existente (substitui optimistic)
                return old.map((m) => (m.id === newMsg.id ? newMsg : m));
              }
              return [newMsg, ...old];
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, qc]);

  return query;
}

/**
 * Hook para enviar mensagem com Optimistic Updates e suporte a menções @all
 */
export function useSendMessage(channelId: string, channelName?: string, teamId?: string) {
  const { user } = useAuthContext();
  const { addXPWithSync, profile } = useProfile();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, fileUrl }: NewMessage) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          user_id: user!.id,
          content: content || (fileUrl ? '📷 Imagem' : ''),
          file_url: fileUrl || null,
        })
        .select()
        .single();

      if (error) throw error;

      // 🔔 Detetar menção @all e criar notificações
      if (content?.toLowerCase().includes('@all') && teamId) {
        try {
          // Buscar membros da equipa (exceto o remetente)
          const { data: members } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId)
            .neq('user_id', user!.id);

          if (members && members.length > 0) {
            const senderName = profile?.full_name || profile?.username || 'Alguém';
            const notifications = members.map(m => ({
              user_id: m.user_id,
              actor_id: user!.id,
              type: 'mention' as const,
              title: `Menção em ${channelName || 'Canal'}`,
              content: `${senderName}: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`,
              resource_id: channelId,
              resource_type: 'channel' as const,
            }));

            await supabase.from('notifications').insert(notifications);
            console.log(`🔔 Criadas ${notifications.length} notificações de @all`);
          }
        } catch (err) {
          console.error('Erro ao criar notificações @all:', err);
        }
      }

      return data;
    },

    // ⚡ Optimistic Update: aparecer antes de confirmar
    onMutate: async ({ content, fileUrl }) => {
      // Cancelar queries em andamento
      await qc.cancelQueries({ queryKey: messageKeys.channel(channelId) });

      // Snapshot do estado anterior
      const previousMessages = qc.getQueryData<MessageWithAuthor[]>(
        messageKeys.channel(channelId)
      );

      // Criar mensagem otimista
      const optimisticMessage: MessageWithAuthor = {
        id: `temp-${Date.now()}`, // ID temporário
        channel_id: channelId,
        user_id: user!.id,
        content: content || (fileUrl ? '📷 Imagem' : ''),
        file_url: fileUrl || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: {
          id: user!.id,
          username: profile?.username || null,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
        },
      };

      // Adicionar ao cache imediatamente
      qc.setQueryData<MessageWithAuthor[]>(
        messageKeys.channel(channelId),
        (old) => [optimisticMessage, ...(old || [])]
      );

      return { previousMessages, optimisticMessage };
    },

    // ❌ Reverter em caso de erro
    onError: (err, variables, context) => {
      console.error('Erro ao enviar mensagem:', err);
      if (context?.previousMessages) {
        qc.setQueryData(
          messageKeys.channel(channelId),
          context.previousMessages
        );
      }
    },

    // ✅ Sucesso: dar XP (o real-time vai atualizar a mensagem real)
    onSuccess: async () => {
      console.log('✅ Mensagem enviada com sucesso');
      await addXPWithSync(10);
    },

    // Sempre invalidar para garantir sincronização
    onSettled: () => {
      // Não invalidar imediatamente - o real-time já atualiza
      // qc.invalidateQueries({ queryKey: messageKeys.channel(channelId) });
    },
  });
}

/**
 * Hook para enviar imagem
 */
export function useSendImage(channelId: string) {
  const { user } = useAuthContext();
  const sendMessage = useSendMessage(channelId);

  return useMutation({
    mutationFn: async (imageUri: string) => {
      if (!user?.id) throw new Error('Utilizador não autenticado');

      // Upload da imagem
      const publicUrl = await uploadImage(imageUri, user.id);
      if (!publicUrl) throw new Error('Falha no upload da imagem');

      // Enviar mensagem com a URL
      await sendMessage.mutateAsync({ content: '', fileUrl: publicUrl });
      return publicUrl;
    },
  });
}

/**
 * Função utilitária para invalidar cache de mensagens
 */
export function invalidateMessages(channelId: string) {
  queryClient.invalidateQueries({ queryKey: messageKeys.channel(channelId) });
}
