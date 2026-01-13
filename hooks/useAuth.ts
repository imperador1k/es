import { AuthResponse, supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

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
            
            // Define redirect URL based on platform
            const redirectTo = Platform.select({
                web: 'https://escolauni.vercel.app/auth/callback',
                default: makeRedirectUri({ scheme: 'escolaa', path: 'auth/callback' })
            });

            if (Platform.OS === 'web') {
                // WEB: Full page redirect to the Callback URL
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo,
                    },
                });
                
                if (error) throw error;
                return { success: true };
            } else {
                // NATIVE: In-app Browser / AuthSession
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo,
                        skipBrowserRedirect: true,
                    },
                });

                if (error) return { success: false, error: { message: error.message } };

                if (data.url) {
                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
                    
                    if (result.type === 'success' && result.url) {
                        // Extract tokens
                        const urlObj = new URL(result.url);
                        const accessToken = urlObj.searchParams.get('access_token') || result.url.split('access_token=')[1]?.split('&')[0];
                        const refreshToken = urlObj.searchParams.get('refresh_token') || result.url.split('refresh_token=')[1]?.split('&')[0];
                        
                        if (accessToken && refreshToken) {
                            await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });
                            return { success: true };
                        }
                    }
                    return { success: false, error: { message: 'Login cancelado' } };
                }
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
            
            // Define redirect URL based on platform
            const redirectTo = Platform.select({
                web: 'https://escolauni.vercel.app/auth/callback',
                default: makeRedirectUri({ scheme: 'escolaa', path: 'auth/callback' })
            });

            if (Platform.OS === 'web') {
                // WEB: Full page redirect
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: {
                        redirectTo,
                    },
                });
                
                if (error) throw error;
                return { success: true };
            } else {
                // NATIVE: In-app Browser / AuthSession
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'discord',
                    options: {
                        redirectTo,
                        skipBrowserRedirect: true,
                    },
                });

                if (error) return { success: false, error: { message: error.message } };

                if (data.url) {
                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
                    
                    if (result.type === 'success' && result.url) {
                        const urlObj = new URL(result.url);
                        let accessToken = urlObj.searchParams.get('access_token');
                        let refreshToken = urlObj.searchParams.get('refresh_token');

                        if (!accessToken && result.url.includes('#')) {
                            const hashParams = new URLSearchParams(result.url.split('#')[1]);
                            accessToken = hashParams.get('access_token');
                            refreshToken = hashParams.get('refresh_token');
                        }

                        if (accessToken && refreshToken) {
                            await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });
                            return { success: true };
                        }
                    }
                    return { success: false, error: { message: 'Login cancelado' } };
                }
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

