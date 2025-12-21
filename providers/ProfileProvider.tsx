import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database.types';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useAuthContext } from './AuthProvider';

// Tipo do contexto
interface ProfileContextType {
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    refetchProfile: () => Promise<void>;
    updateLocalXP: (amount: number) => void;
    addXPWithSync: (amount: number) => Promise<boolean>;
}

// Criar contexto
const ProfileContext = createContext<ProfileContextType>({
    profile: null,
    loading: true,
    error: null,
    refetchProfile: async () => { },
    updateLocalXP: () => { },
    addXPWithSync: async () => false,
});

// Hook para usar o contexto
export function useProfile() {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile deve ser usado dentro de um ProfileProvider');
    }
    return context;
}

// Props do provider
interface ProfileProviderProps {
    children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
    const { user, session } = useAuthContext();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Buscar perfil do utilizador
    const fetchProfile = useCallback(async () => {
        if (!user?.id) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (fetchError) {
                console.error('Erro ao carregar perfil:', fetchError);
                setError('Erro ao carregar perfil');
                return;
            }

            console.log('👤 Perfil carregado:', data?.username, '| XP:', data?.current_xp);
            setProfile(data as Profile);
        } catch (err) {
            console.error('Erro inesperado:', err);
            setError('Erro inesperado');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Carregar perfil quando o user mudar
    useEffect(() => {
        if (session) {
            fetchProfile();
        } else {
            setProfile(null);
            setLoading(false);
        }
    }, [session, fetchProfile]);

    // Refetch manual do perfil
    const refetchProfile = useCallback(async () => {
        await fetchProfile();
    }, [fetchProfile]);

    // Atualização otimista do XP (instantâneo no UI)
    const updateLocalXP = useCallback((amount: number) => {
        setProfile(prev => {
            if (!prev) return prev;

            const newXP = prev.current_xp + amount;
            console.log(`⚡ XP otimista: ${prev.current_xp} + ${amount} = ${newXP}`);

            return {
                ...prev,
                current_xp: newXP
            };
        });
    }, []);

    // Adicionar XP com sincronização (otimista + RPC + refetch)
    const addXPWithSync = useCallback(async (amount: number): Promise<boolean> => {
        if (!user?.id) return false;

        try {
            // 1. Atualização otimista (instantânea no UI)
            updateLocalXP(amount);

            // 2. Chamar RPC no backend
            const { error: rpcError } = await supabase.rpc('add_xp', {
                p_user_id: user.id,
                p_xp_amount: amount
            });

            if (rpcError) {
                console.error('❌ Erro no RPC add_xp:', rpcError);
                // Reverter atualização otimista
                updateLocalXP(-amount);
                return false;
            }

            console.log(`✅ XP sincronizado: +${amount}`);

            // 3. Refetch para sincronizar (pega tier atualizado, etc)
            await fetchProfile();

            return true;
        } catch (err) {
            console.error('Erro inesperado ao adicionar XP:', err);
            updateLocalXP(-amount); // Reverter
            return false;
        }
    }, [user?.id, updateLocalXP, fetchProfile]);

    // Escutar mudanças em tempo real no perfil (opcional mas útil)
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`profile:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    console.log('🔄 Perfil atualizado via real-time:', payload.new);
                    setProfile(payload.new as Profile);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    return (
        <ProfileContext.Provider
            value={{
                profile,
                loading,
                error,
                refetchProfile,
                updateLocalXP,
                addXPWithSync
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
}
