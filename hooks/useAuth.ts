import { AuthResponse, supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

interface UseAuthReturn {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<AuthResponse>;
    signIn: (email: string, password: string) => Promise<AuthResponse>;
    signOut: () => Promise<AuthResponse>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Obter sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Escutar mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signUp = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                return { success: false, error: { message: error.message } };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: { message: 'Erro inesperado ao criar conta' } };
        } finally {
            setLoading(false);
        }
    }, []);

    const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { success: false, error: { message: error.message } };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: { message: 'Erro inesperado ao entrar' } };
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async (): Promise<AuthResponse> => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();

            if (error) {
                return { success: false, error: { message: error.message } };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: { message: 'Erro inesperado ao sair' } };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
    };
}
