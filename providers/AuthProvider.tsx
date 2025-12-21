import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Tipos do contexto
interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

// Criar contexto com valor padrão
const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signOut: async () => { },
});

// Hook para usar o contexto
export function useAuthContext() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
    }
    return context;
}

// Props do provider
interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();
    const segments = useSegments();
    const navigationState = useRootNavigationState();

    // Verificar sessão inicial e escutar mudanças
    useEffect(() => {
        // Obter sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Escutar mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔐 Auth event:', event);
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Redirecionar baseado no estado de autenticação
    useEffect(() => {
        // Não fazer nada enquanto está a carregar
        if (isLoading) return;

        // Verificar se a navegação está pronta
        if (!navigationState?.key) return;

        // Verificar se estamos numa rota de autenticação
        const inAuthGroup = segments[0] === '(auth)';

        if (!session && !inAuthGroup) {
            // Utilizador NÃO está logado e NÃO está na página de auth
            // Redirecionar para login
            console.log('➡️ Redirecting to login');
            router.replace('/(auth)/login');
        } else if (session && inAuthGroup) {
            // Utilizador ESTÁ logado mas ainda está na página de auth
            // Redirecionar para a app principal
            console.log('➡️ Redirecting to tabs');
            router.replace('/(tabs)');
        }
    }, [session, segments, isLoading, navigationState?.key]);

    // Função de logout
    const signOut = async () => {
        try {
            setIsLoading(true);
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
