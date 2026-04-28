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
            // Não fazer nada enquanto está a carregar
            if (isLoading || isRefreshing) return;

            // Verificar se a navegação está pronta
            if (!navigationState?.key) return;

            // Verificar se estamos numa rota de autenticação
            const inAuthGroup = segments[0] === '(auth)';
            const inOnboarding = segments[1] === 'onboarding';
            const inEducationSetup = segments[1] === 'education-setup';

            if (!session && !inAuthGroup) {
                // Utilizador NÃO está logado e NÃO está na página de auth
                console.log('➡️ Redirecting to login');
                router.replace('/(auth)/login');
            } else if (session) {
                // Se estivermos no grupo auth, onboarding ou setup, precisamos de validar se já podemos sair
                if (!inAuthGroup && !inOnboarding && !inEducationSetup) return;
                
                // Utilizador ESTÁ logado, verificar se tem perfil completo
                console.log('🔍 [AuthProvider] Checking profile for:', session.user.id);
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) console.error('❌ [AuthProvider] Profile error:', profileError);

                if (!profile?.username) {
                    // Perfil incompleto - ir para onboarding
                    console.log('➡️ [AuthProvider] Redirecting to onboarding (profile incomplete)');
                    router.replace('/(auth)/onboarding');
                } else {
                    console.log('✅ [AuthProvider] Profile found:', profile.username);
                    // Verificar se tem dados de educação
                    const { data: education, error: eduError } = await supabase
                        .from('user_education')
                        .select('user_id')
                        .eq('user_id', session.user.id)
                        .single();

                    if (eduError && eduError.code !== 'PGRST116') {
                        console.error('❌ [AuthProvider] Education error:', eduError);
                    }

                    if (!education) {
                        // Educação não configurada - ir para education-setup
                        console.log('➡️ Redirecting to education-setup');
                        router.replace('/(auth)/education-setup' as any);
                    } else {
                        // Perfil completo - ir para a app
                        console.log('➡️ Redirecting to tabs');
                        router.replace('/(tabs)');
                    }
                }
            }
        };

        checkProfileAndRedirect();
    }, [session, segments, isLoading, isRefreshing, navigationState?.key]);

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
        setTimeout(() => setIsRefreshing(false), 800);
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading: isLoading || isRefreshing, signOut, refreshSession }}>
            {isLoading || isRefreshing ? (
                <LoadingScreen message={isRefreshing ? "A entrar no teu espaço..." : "A preparar a Escola+..."} />
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
