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
 * Hook para procurar utilizadores com dados de educação
 */
export function useSearchUsers() {
  const { user } = useAuthContext();
  const [results, setResults] = useState<(Profile & { 
    education?: {
      school_name?: string;
      university_name?: string;
      degree_name?: string;
      level?: string;
      year?: number;
    } | null 
  })[]>([]);
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<{
    schoolId?: string;
    universityId?: string;
    level?: string;
  }>({});

  const search = async (query: string, customFilters?: typeof filters) => {
    const activeFilters = customFilters || filters;
    
    // Check if we have enough criteria to search
    // Either a text query >= 2 chars OR active filters
    const hasQuery = query.trim().length >= 2;
    const hasFilters = activeFilters.schoolId || activeFilters.universityId || activeFilters.level;

    if (!hasQuery && !hasFilters) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // We use !inner join to filter profiles that satisfy the education criteria
      // If no filters are active, we use standard left join (implicit or explicit)
      // But passing the filter in the select string with !inner is the way to filter parent rows.
      
      const educationJoinType = hasFilters ? '!inner' : '';
      
      let queryBuilder = supabase
        .from('profiles')
        .select(`
          *,
          user_education${educationJoinType} (
            level,
            year,
            uni_year,
            school:schools(id, name),
            university:universities(id, name),
            degree:degrees(id, name),
            school_id,
            university_id
          )
        `)
        .neq('id', user?.id || '')
        .limit(50);

      // Text search
      if (hasQuery) {
        queryBuilder = queryBuilder.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
      }

      // Backend Filters
      if (activeFilters.schoolId) {
        queryBuilder = queryBuilder.eq('user_education.school_id', activeFilters.schoolId);
      }
      if (activeFilters.universityId) {
        queryBuilder = queryBuilder.eq('user_education.university_id', activeFilters.universityId);
      }
      if (activeFilters.level) {
        // Map frontend IDs to Database ENUM values
        const LEVEL_MAP: Record<string, string> = {
          'basico_2': 'basic_2',
          'basico_3': 'basic_3',
          'secundario': 'secondary',
          'licenciatura': 'university',
          'mestrado': 'university',
          'doutoramento': 'university'
        };

        const dbLevel = LEVEL_MAP[activeFilters.level] || activeFilters.level;
        queryBuilder = queryBuilder.eq('user_education.level', dbLevel);

        // If filtering by specific university degree level
        if (dbLevel === 'university' && ['licenciatura', 'mestrado', 'doutoramento'].includes(activeFilters.level)) {
             // For now, we only filter the main level to avoid complex nested joins issues.
             // The user will still see university students, and can filter by specific university in the next step.
             // Ideally we would add: queryBuilder.eq('user_education.degree.level', ...label...)
        }
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Map results
      const mapped = (data || []).map((p: any) => {
        const edu = p.user_education; // It serves as object or array depending on relation, usually object for 1:1 if defined correctly, but Supabase returns array for reverse relation usually.
                                      // Wait, user_education PK is user_id. So profiles -> user_education is 1:1?
                                      // The previous code did p.user_education?.[0]. Let's check relation.
                                      // If it returns an array (has_many), we take the first.
                                      // If user_education is 1:1, it might be an object. PostgREST usually returns object for single-relation if detected.
                                      // Safest is to handle both.
        const eduData = Array.isArray(edu) ? edu[0] : edu;

        return {
          ...p,
          education: eduData ? {
            school_name: eduData.school?.name,
            university_name: eduData.university?.name,
            degree_name: eduData.degree?.name,
            level: eduData.level,
            year: eduData.year || eduData.uni_year,
          } : null
        };
      });

      setResults(mapped);
    } catch (err) {
      console.error('Erro na pesquisa:', err);
      // Don't clear results on error, maybe toast?
      // setResults([]); 
    } finally {
      setSearching(false);
    }
  };

  const clear = () => setResults([]);

  const updateFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  return { results, searching, search, clear, filters, updateFilters };
}

