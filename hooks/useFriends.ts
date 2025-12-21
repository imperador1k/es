import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { FriendshipStatus, FriendWithProfile, Profile } from '@/types/database.types';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook para gerir a lista de amigos e pedidos de amizade
 */
export function useFriends() {
  const { user } = useAuthContext();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar amigos aceites
  const loadFriends = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar amizades onde sou requester OU addressee e status = accepted
      const { data, error: queryError } = await supabase
        .from('friendships')
        .select(`
          id,
          requester_id,
          addressee_id,
          status,
          created_at,
          requester:profiles!friendships_requester_id_fkey(*),
          addressee:profiles!friendships_addressee_id_fkey(*)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (queryError) throw queryError;

      // Mapear para FriendWithProfile
      const mappedFriends: FriendWithProfile[] = (data || []).map((f: any) => {
        const isRequester = f.requester_id === user.id;
        const friendProfile = isRequester ? f.addressee : f.requester;
        return {
          friendship_id: f.id,
          friend_id: friendProfile.id,
          profile: friendProfile as Profile,
          status: f.status as FriendshipStatus,
          is_requester: isRequester,
        };
      });

      setFriends(mappedFriends);
    } catch (err: any) {
      console.error('Erro ao carregar amigos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar pedidos pendentes (que EU recebi)
  const loadPendingRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: queryError } = await supabase
        .from('friendships')
        .select(`
          id,
          requester_id,
          addressee_id,
          status,
          created_at,
          requester:profiles!friendships_requester_id_fkey(*)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (queryError) throw queryError;

      const mappedRequests: FriendWithProfile[] = (data || []).map((f: any) => ({
        friendship_id: f.id,
        friend_id: f.requester_id,
        profile: f.requester as Profile,
        status: f.status as FriendshipStatus,
        is_requester: false,
      }));

      setPendingRequests(mappedRequests);
    } catch (err: any) {
      console.error('Erro ao carregar pedidos:', err);
    }
  }, [user?.id]);

  // Enviar pedido de amizade
  const sendFriendRequest = async (addresseeId: string): Promise<boolean> => {
    if (!user?.id) return false;
    if (addresseeId === user.id) return false; // Não posso adicionar a mim próprio

    try {
      // Verificar se já existe relação
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
        .single();

      if (existing) {
        console.log('Já existe relação:', existing);
        return false;
      }

      // Criar pedido
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending',
        });

      if (insertError) throw insertError;
      return true;
    } catch (err: any) {
      console.error('Erro ao enviar pedido:', err);
      return false;
    }
  };

  // Aceitar pedido de amizade
  const acceptFriendRequest = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (updateError) throw updateError;

      // Recarregar listas
      await Promise.all([loadFriends(), loadPendingRequests()]);
      return true;
    } catch (err: any) {
      console.error('Erro ao aceitar pedido:', err);
      return false;
    }
  };

  // Rejeitar/Bloquear pedido
  const rejectFriendRequest = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (deleteError) throw deleteError;

      await loadPendingRequests();
      return true;
    } catch (err: any) {
      console.error('Erro ao rejeitar pedido:', err);
      return false;
    }
  };

  // Remover amigo
  const removeFriend = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (deleteError) throw deleteError;

      await loadFriends();
      return true;
    } catch (err: any) {
      console.error('Erro ao remover amigo:', err);
      return false;
    }
  };

  // Carregar ao montar
  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, [loadFriends, loadPendingRequests]);

  return {
    friends,
    pendingRequests,
    loading,
    error,
    refetch: () => {
      loadFriends();
      loadPendingRequests();
    },
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  };
}

/**
 * Hook para procurar utilizadores
 */
export function useSearchUsers() {
  const { user } = useAuthContext();
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setResults((data as Profile[]) || []);
    } catch (err) {
      console.error('Erro na pesquisa:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clear = () => setResults([]);

  return { results, searching, search, clear };
}
