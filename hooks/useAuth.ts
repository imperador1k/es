import { AuthResponse, supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking'; // <--- IMPORTANTE
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Deteta se estamos a correr no Electron
const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');

interface UseAuthReturn {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<AuthResponse>;
    signIn: (email: string, password: string) => Promise<AuthResponse>;
    signInWithGoogle: () => Promise<AuthResponse>;
    signInWithDiscord: () => Promise<AuthResponse>;
    signOut: () => Promise<AuthResponse>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

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
            if (error) return { success: false, error: { message: error.message } };
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
            if (error) return { success: false, error: { message: error.message } };
            return { success: true };
        } catch (error) {
            return { success: false, error: { message: 'Erro inesperado ao entrar' } };
        } finally {
            setLoading(false);
        }
    }, []);

    // ------------------------------------------------------------------
    // FUNÇÃO AUXILIAR PARA OAUTH (Google & Discord)
    // ------------------------------------------------------------------
    const performOAuth = useCallback(async (provider: 'google' | 'discord'): Promise<AuthResponse> => {
        try {
            setLoading(true);

            // 1. Determinar o URL de Redirecionamento
            let redirectTo = '';
            
            if (isElectron) {
                // Electron: Usa o mesmo redirect da web!
                // Google/Discord OAuth NÃO suportam protocolos customizados (escolaa://)
                // A página de callback vai detetar o Electron e oferecer "Abrir na App"
                redirectTo = 'https://escolauni.vercel.app/auth/callback';
            } else if (Platform.OS === 'web') {
                // Web Normal (Vercel): Usa HTTPS
                redirectTo = 'https://escolauni.vercel.app/auth/callback';
            } else {
                // Mobile Nativo: Usa esquema expo
                redirectTo = makeRedirectUri({ scheme: 'escolaa', path: 'auth/callback' });
            }

            // 2. Chamar o Supabase
            // No Electron e Mobile, queremos 'skipBrowserRedirect: true' para recebermos o URL
            // e abrirmos nós mesmos o navegador/sessão.
            const shouldSkipRedirect = isElectron || Platform.OS !== 'web';

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    skipBrowserRedirect: shouldSkipRedirect,
                },
            });

            if (error) throw error;

            // 3. Lidar com o Resultado

            // CASO A: ELECTRON (Abre navegador do sistema)
            if (isElectron && data.url) {
                // Adiciona parâmetro para o callback saber que veio do Electron
                const urlWithSource = data.url + (data.url.includes('?') ? '&' : '?') + 'source=electron';
                // Abre o Chrome/Edge do utilizador
                await Linking.openURL(urlWithSource);
                // A página de callback vai mostrar botão "Abrir na App" com deep link
                return { success: true };
            }

            // CASO B: MOBILE (Abre AuthSession interna)
            if (Platform.OS !== 'web' && data.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
                
                if (result.type === 'success' && result.url) {
                    // Extrair tokens da URL de retorno
                    // Supabase devolve como #access_token=...&refresh_token=...
                    const urlStr = result.url;
                    
                    // Pequeno parser manual para garantir compatibilidade
                    let accessToken = null;
                    let refreshToken = null;

                    if (urlStr.includes('access_token=')) {
                        accessToken = urlStr.split('access_token=')[1].split('&')[0];
                    }
                    if (urlStr.includes('refresh_token=')) {
                        refreshToken = urlStr.split('refresh_token=')[1].split('&')[0];
                    }

                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        return { success: true };
                    }
                }
                return { success: false, error: { message: 'Login cancelado ou falhou' } };
            }

            // CASO C: WEB NORMAL (Supabase trata do redirect automático)
            return { success: true };

        } catch (error: any) {
            console.error(`${provider} OAuth error:`, error);
            return { success: false, error: { message: error.message || `Erro ao entrar com ${provider}` } };
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async (): Promise<AuthResponse> => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) return { success: false, error: { message: error.message } };
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
        signInWithGoogle: () => performOAuth('google'),
        signInWithDiscord: () => performOAuth('discord'),
        signOut,
    };
}