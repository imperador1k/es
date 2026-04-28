import { LoadingScreen } from '@/components/LoadingScreen';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Tipos do contexto
interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    refreshSession: () => Promise<void>;
    signOut: () => Promise<void>;
}

// Criar contexto com valor padrão
const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    refreshSession: async () => { },
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
    const [isRefreshing, setIsRefreshing] = useState(false);

    const router = useRouter();
    const segments = useSegments();
    const navigationState = useRootNavigationState();

    // Verificar sessão inicial e escutar mudanças
    useEffect(() => {
        console.log('🔄 [AuthProvider] Checking initial session...');
        // Obter sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('✅ [AuthProvider] Initial session:', session ? 'FOUND' : 'NULL');
            setSession(session);
            setUser(session?.user ?? null);
            // Pequeno delay para garantir que a transição é suave e não um "flash"
            setTimeout(() => setIsLoading(false), 1000);
        });

        // Escutar mudanças de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔐 [AuthProvider] Auth event:', event);
                
                if (event === 'SIGNED_IN') setIsRefreshing(true);
                
                setSession(session);
                setUser(session?.user ?? null);
                
                if (event === 'SIGNED_IN') {
                    setTimeout(() => setIsRefreshing(false), 1500);
                }
                
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Redirecionar baseado no estado de autenticação E perfil completo
    useEffect(() => {
        const checkProfileAndRedirect = async () => {
            // Não fazer nada enquanto está a carregar o arranque inicial
            if (isLoading) return;

            // Verificar se a navegação está pronta
            if (!navigationState?.key) return;

            const segments_str = segments.join('/');
            const inAuthGroup = segments[0] === '(auth)';
            const inTabs = segments[0] === '(tabs)';

            if (!session) {
                if (!inAuthGroup) {
                    console.log('➡️ Redirecting to login');
                    router.replace('/(auth)/login');
                }
                return;
            }

            // Se o utilizador já estiver na App (tabs) e a sessão for apenas renovada, NÃO redirecionar
            if (session && inTabs && !isRefreshing) return;

            // Se estivermos logados e no grupo auth ou root, verificar perfil
            if (session && (inAuthGroup || segments_str === '')) {
                console.log('🔍 [AuthProvider] Validating profile...');
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                if (!profile?.username) {
                    router.replace('/(auth)/onboarding');
                } else {
                    const { data: education } = await supabase
                        .from('user_education')
                        .select('user_id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (!education) {
                        router.replace('/(auth)/education-setup');
                    } else {
                        router.replace('/(tabs)');
                    }
                }
            }
        };

        checkProfileAndRedirect();
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

    const refreshSession = async () => {
        setIsRefreshing(true);
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut, refreshSession }}>
            {isLoading ? (
                <LoadingScreen message="A preparar a Escola+..." />
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
