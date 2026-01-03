import { AuthResponse, supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';

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

    // OAuth com Google
    const signInWithGoogle = useCallback(async (): Promise<AuthResponse> => {
        try {
            setLoading(true);
            const redirectUrl = makeRedirectUri({ scheme: 'escolaa' });
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                return { success: false, error: { message: error.message } };
            }

            if (data.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                
                if (result.type === 'success' && result.url) {
                    // Supabase retorna tokens no FRAGMENT (#) não nos query params (?)
                    const url = result.url;
                    
                    // Extrair do fragment (após #)
                    const hashParams = url.split('#')[1];
                    if (hashParams) {
                        const params = new URLSearchParams(hashParams);
                        const accessToken = params.get('access_token');
                        const refreshToken = params.get('refresh_token');
                        
                        if (accessToken && refreshToken) {
                            await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });
                            return { success: true };
                        }
                    }
                    
                    // Fallback: tentar query params
                    const urlObj = new URL(result.url);
                    const accessToken = urlObj.searchParams.get('access_token');
                    const refreshToken = urlObj.searchParams.get('refresh_token');
                    
                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        return { success: true };
                    }
                    
                    console.log('OAuth callback URL:', result.url);
                    return { success: false, error: { message: 'Não foi possível extrair tokens' } };
                }
                
                return { success: false, error: { message: 'Login cancelado' } };
            }

            return { success: false, error: { message: 'URL de OAuth não disponível' } };
        } catch (error) {
            console.error('Google OAuth error:', error);
            return { success: false, error: { message: 'Erro ao entrar com Google' } };
        } finally {
            setLoading(false);
        }
    }, []);

    // OAuth com Discord
    const signInWithDiscord = useCallback(async (): Promise<AuthResponse> => {
        try {
            setLoading(true);
            const redirectUrl = makeRedirectUri({ scheme: 'escolaa' });
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                return { success: false, error: { message: error.message } };
            }

            if (data.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                
                if (result.type === 'success' && result.url) {
                    // Supabase retorna tokens no FRAGMENT (#) não nos query params (?)
                    const url = result.url;
                    
                    // Extrair do fragment (após #)
                    const hashParams = url.split('#')[1];
                    if (hashParams) {
                        const params = new URLSearchParams(hashParams);
                        const accessToken = params.get('access_token');
                        const refreshToken = params.get('refresh_token');
                        
                        if (accessToken && refreshToken) {
                            await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });
                            return { success: true };
                        }
                    }
                    
                    // Fallback: tentar query params
                    const urlObj = new URL(result.url);
                    const accessToken = urlObj.searchParams.get('access_token');
                    const refreshToken = urlObj.searchParams.get('refresh_token');
                    
                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        return { success: true };
                    }
                    
                    console.log('OAuth callback URL:', result.url);
                    return { success: false, error: { message: 'Não foi possível extrair tokens' } };
                }
                
                return { success: false, error: { message: 'Login cancelado' } };
            }

            return { success: false, error: { message: 'URL de OAuth não disponível' } };
        } catch (error) {
            console.error('Discord OAuth error:', error);
            return { success: false, error: { message: 'Erro ao entrar com Discord' } };
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
        signInWithGoogle,
        signInWithDiscord,
        signOut,
    };
}

