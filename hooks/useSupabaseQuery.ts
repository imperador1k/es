/**
 * 🔄 useSupabaseQuery - Hook Genérico para Queries Offline-First
 * Reutilizável para qualquer query Supabase
 */

import { useAuthContext } from '@/providers/AuthProvider';
import { QueryKey, useQuery } from '@tanstack/react-query';

type SupabaseQueryFn<T> = (userId: string) => Promise<T>;

interface UseSupabaseQueryOptions<T> {
    queryKey: QueryKey;
    queryFn: SupabaseQueryFn<T>;
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
}

/**
 * Hook genérico para queries Supabase com suporte offline
 * 
 * Comportamento:
 * 1. Mostra cache imediatamente se existir
 * 2. Tenta atualizar em background
 * 3. Persiste automaticamente no AsyncStorage
 */
export function useSupabaseQuery<T>({
    queryKey,
    queryFn,
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutos por defeito
    gcTime = 1000 * 60 * 60 * 24, // 24 horas
}: UseSupabaseQueryOptions<T>) {
    const { user } = useAuthContext();

    return useQuery<T>({
        queryKey: [...queryKey, user?.id],
        queryFn: async () => {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }
            return queryFn(user.id);
        },
        enabled: enabled && !!user?.id,
        staleTime,
        gcTime,
        // Mostrar cache enquanto recarrega
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Hook simplificado para tabelas simples
 */
export function useSupabaseTable<T>(
    tableName: string,
    options?: {
        select?: string;
        filter?: (query: any) => any;
        enabled?: boolean;
    }
) {
    const { user } = useAuthContext();
    const select = options?.select || '*';

    return useQuery<T[]>({
        queryKey: [tableName, user?.id],
        queryFn: async () => {
            if (!user?.id) throw new Error('User not authenticated');

            const { supabase } = await import('@/lib/supabase');
            let query = supabase
                .from(tableName)
                .select(select)
                .eq('user_id', user.id);

            if (options?.filter) {
                query = options.filter(query);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as T[];
        },
        enabled: options?.enabled !== false && !!user?.id,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 60 * 24,
    });
}
