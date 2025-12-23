import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type UserStatus = 'online' | 'offline' | 'away' | 'dnd';

interface PresenceState {
  id: string;
  status: UserStatus;
  lastSeen: string;
}

/**
 * Hook para gerir o status de presença do utilizador
 * - Atualiza automaticamente online/offline baseado no AppState
 * - Permite definir status manual (DND, Away)
 */
export function usePresence() {
  const { user } = useAuthContext();
  const [myStatus, setMyStatus] = useState<UserStatus>('online');
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Atualizar status na base de dados
  const updateStatus = useCallback(async (status: UserStatus) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          status,
          last_seen_at: new Date().toISOString()
        })
        .eq('id', user.id);

      setMyStatus(status);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  }, [user?.id]);

  // Definir status manual (DND, Away, etc)
  const setStatus = useCallback((status: UserStatus) => {
    updateStatus(status);
  }, [updateStatus]);

  // Verificar se um utilizador está online
  const isUserOnline = useCallback((userId: string): boolean => {
    const presence = onlineUsers.get(userId);
    return presence?.status === 'online';
  }, [onlineUsers]);

  // Obter status de um utilizador
  const getUserStatus = useCallback((userId: string): UserStatus => {
    return onlineUsers.get(userId)?.status || 'offline';
  }, [onlineUsers]);

  // Configurar Presence Realtime
  useEffect(() => {
    if (!user?.id) return;

    // Marcar como online ao iniciar
    updateStatus('online');

    // Configurar canal de Presence
    channelRef.current = supabase.channel('presence:global', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current?.presenceState() || {};
        const newOnlineUsers = new Map<string, PresenceState>();
        
        Object.entries(state).forEach(([userId, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            const latest = presences[0] as any;
            newOnlineUsers.set(userId, {
              id: userId,
              status: latest.status || 'online',
              lastSeen: latest.lastSeen || new Date().toISOString(),
            });
          }
        });

        setOnlineUsers(newOnlineUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelRef.current?.track({
            status: myStatus,
            lastSeen: new Date().toISOString(),
          });
        }
      });

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, updateStatus, myStatus]);

  // Gerir AppState (app em background = offline)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App aberta -> Online (se não estiver em modo manual)
        if (myStatus === 'offline') {
          updateStatus('online');
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        // App fechada -> Offline (se não estiver em DND/Away que são manuais)
        if (myStatus === 'online') {
          updateStatus('offline');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [myStatus, updateStatus]);

  return {
    myStatus,
    setStatus,
    isUserOnline,
    getUserStatus,
    onlineUsers,
  };
}

/**
 * Hook para obter status de um utilizador específico
 */
export function useUserStatus(userId: string | null) {
  const [status, setStatus] = useState<UserStatus>('offline');
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchStatus = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('status, last_seen_at')
        .eq('id', userId)
        .single();

      if (data) {
        setStatus((data.status as UserStatus) || 'offline');
        setLastSeen(data.last_seen_at);
      }
      setLoading(false);
    };

    fetchStatus();

    // Subscrever a mudanças
    const channel = supabase
      .channel(`status:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          setStatus((payload.new.status as UserStatus) || 'offline');
          setLastSeen(payload.new.last_seen_at);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Formatar "última vez online"
  const formatLastSeen = (): string => {
    if (status === 'online') return 'online';
    if (status === 'dnd') return 'não perturbar';
    if (status === 'away') return 'ausente';
    if (!lastSeen) return 'offline';

    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'agora mesmo';
    if (diffMinutes < 60) return `há ${diffMinutes}m`;
    if (diffMinutes < 1440) return `há ${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  };

  return { status, lastSeen, loading, formatLastSeen };
}
