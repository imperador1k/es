import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type UserStatus = 'online' | 'offline' | 'away' | 'dnd';

interface PresenceState {
  id: string;
  status: UserStatus;
  lastSeen: string;
}

const PREFERRED_STATUS_KEY = '@preferred_status';
const HEARTBEAT_INTERVAL_MS = 30000; // 30 segundos

/**
 * Hook para gerir o status de presença do utilizador
 * 
 * COMPORTAMENTO TIPO WHATSAPP/DISCORD:
 * - Quando fecha a app → SEMPRE fica offline
 * - Quando abre a app → Restaura o status preferido (online, away, dnd)
 * - Heartbeat a cada 30s para manter o servidor informado
 * - O utilizador pode definir o seu status preferido
 */
export function usePresence() {
  const { user } = useAuthContext();
  const [myStatus, setMyStatus] = useState<UserStatus>('offline');
  const [preferredStatus, setPreferredStatus] = useState<Exclude<UserStatus, 'offline'>>('online');
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAppActive = useRef(AppState.currentState === 'active');

  // Carregar status preferido do AsyncStorage
  useEffect(() => {
    const loadPreferredStatus = async () => {
      try {
        const saved = await AsyncStorage.getItem(PREFERRED_STATUS_KEY);
        if (saved && (saved === 'online' || saved === 'away' || saved === 'dnd')) {
          setPreferredStatus(saved as Exclude<UserStatus, 'offline'>);
        }
      } catch (err) {
        console.error('Erro ao carregar status preferido:', err);
      }
    };
    loadPreferredStatus();
  }, []);

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

      // Atualizar o track no canal de presença
      if (channelRef.current) {
        await channelRef.current.track({
          status,
          lastSeen: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  }, [user?.id]);

  // Heartbeat - manter o servidor informado que estamos ativos
  const sendHeartbeat = useCallback(async () => {
    if (!user?.id || !isAppActive.current) return;

    try {
      // Usar a função RPC para performance
      await supabase.rpc('presence_heartbeat');
    } catch (err) {
      console.error('Erro no heartbeat:', err);
    }
  }, [user?.id]);

  // Definir status preferido (o que aparece quando abre a app)
  // Não pode ser 'offline' - offline é automático quando fecha a app
  const setStatus = useCallback(async (status: Exclude<UserStatus, 'offline'>) => {
    setPreferredStatus(status);
    
    // Salvar no AsyncStorage para persistir
    try {
      await AsyncStorage.setItem(PREFERRED_STATUS_KEY, status);
    } catch (err) {
      console.error('Erro ao salvar status preferido:', err);
    }
    
    // Se a app está ativa, aplicar imediatamente
    if (isAppActive.current) {
      await updateStatus(status);
    }
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

  // Configurar Presence Realtime + Heartbeat
  useEffect(() => {
    if (!user?.id) return;

    // Marcar com status preferido ao iniciar (se app ativa)
    if (isAppActive.current) {
      updateStatus(preferredStatus);
    }

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

    // Iniciar heartbeat (a cada 30 segundos)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user?.id, updateStatus, myStatus, preferredStatus, sendHeartbeat]);

  // Gerir AppState - COMPORTAMENTO TIPO WHATSAPP/DISCORD
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const wasActive = isAppActive.current;
      isAppActive.current = nextState === 'active';

      if (nextState === 'active' && !wasActive) {
        // App abriu -> Restaurar status PREFERIDO (online, away, ou dnd)
        console.log('📱 App aberta - restaurando status:', preferredStatus);
        await updateStatus(preferredStatus);
        
        // Reiniciar heartbeat
        if (!heartbeatIntervalRef.current) {
          heartbeatIntervalRef.current = setInterval(() => {
            sendHeartbeat();
          }, HEARTBEAT_INTERVAL_MS);
        }
      } else if ((nextState === 'background' || nextState === 'inactive') && wasActive) {
        // App fechou -> SEMPRE offline (independente do status preferido)
        console.log('📱 App fechada - marcando offline');
        await updateStatus('offline');
        
        // Parar heartbeat quando app está em background
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [preferredStatus, updateStatus, sendHeartbeat]);

  return {
    myStatus,
    preferredStatus,
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
