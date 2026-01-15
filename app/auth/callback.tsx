/**
 * OAuth Callback Page
 * Handles Google/Discord auth redirects from Supabase
 * Route: /auth/callback
 * 
 * FLOW:
 * - Web: Processes tokens automatically and redirects to app
 * - Electron: Shows "Open in App" button that deep-links with tokens
 */
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

// Check if opened from Electron (via URL parameter or user agent check)
function detectElectronSource(): boolean {
    if (Platform.OS !== 'web') return false;
    if (typeof window === 'undefined') return false;

    // Check URL for electron hint (we'll add this param when opening from Electron)
    const url = window.location.href;
    if (url.includes('source=electron')) return true;

    // Fallback: Show "Open in App" button anyway if there's a hash with tokens
    // The user can click it if they came from Electron
    return url.includes('#access_token=');
}

export default function AuthCallback() {
    const [status, setStatus] = useState<'loading' | 'success' | 'electron' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

    useEffect(() => {
        async function handleCallback() {
            if (Platform.OS !== 'web') {
                router.replace('/(tabs)');
                return;
            }

            try {
                // Get current URL with hash
                const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

                // Check if this looks like it came from Electron
                const fromElectron = detectElectronSource();

                // Wait for Supabase to process the hash
                await new Promise(resolve => setTimeout(resolve, 800));

                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    setError(sessionError.message);
                    setStatus('error');
                    return;
                }

                if (session) {
                    // Got session! Now decide what to do
                    if (fromElectron) {
                        // Build deep link URL with tokens for Electron
                        const tokens = `access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
                        const electronUrl = `escolaa://auth/callback#${tokens}`;
                        setDeepLinkUrl(electronUrl);
                        setStatus('electron');
                    } else {
                        // Normal web - just redirect
                        setStatus('success');
                        setTimeout(() => {
                            router.replace('/(tabs)');
                        }, 500);
                    }
                } else {
                    // No session - maybe Supabase didn't detect the hash
                    // Try to extract manually from URL
                    if (currentUrl.includes('access_token=')) {
                        setError('Erro ao processar tokens. Tenta novamente.');
                    } else {
                        setError('Sessão não encontrada. Tenta fazer login novamente.');
                    }
                    setStatus('error');
                }
            } catch (err: any) {
                console.error('OAuth callback error:', err);
                setError(err.message || 'Erro ao processar login');
                setStatus('error');
            }
        }

        handleCallback();
    }, []);

    const handleOpenInApp = () => {
        if (deepLinkUrl) {
            Linking.openURL(deepLinkUrl);
        }
    };

    const handleBackToLogin = () => {
        router.replace('/(auth)/login');
    };

    // Loading state
    if (status === 'loading') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.text}>A processar login...</Text>
            </View>
        );
    }

    // Success state (brief, then redirect)
    if (status === 'success') {
        return (
            <View style={styles.container}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                <Text style={styles.successText}>Login efetuado!</Text>
                <Text style={styles.subText}>A redirecionar...</Text>
            </View>
        );
    }

    // Electron state - show "Open in App" button
    if (status === 'electron') {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                    <Text style={styles.successText}>Login efetuado com sucesso!</Text>
                    <Text style={styles.subText}>
                        Clica no botão abaixo para voltar à aplicação Escola+
                    </Text>

                    <Pressable onPress={handleOpenInApp} style={styles.openButton}>
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.openButtonGradient}
                        >
                            <Ionicons name="open" size={20} color="#FFF" />
                            <Text style={styles.openButtonText}>Abrir Escola+</Text>
                        </LinearGradient>
                    </Pressable>

                    <Text style={styles.hint}>
                        Podes fechar esta janela do browser depois.
                    </Text>
                </View>
            </View>
        );
    }

    // Error state
    return (
        <View style={styles.container}>
            <Ionicons name="close-circle" size={64} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={handleBackToLogin} style={styles.linkButton}>
                <Text style={styles.link}>Voltar ao Login</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.xl,
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
    },
    text: {
        color: '#FFF',
        marginTop: 16,
        fontSize: 16,
    },
    successText: {
        color: '#10B981',
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: '700',
        marginTop: SPACING.md,
        textAlign: 'center',
    },
    subText: {
        color: COLORS.text.secondary,
        fontSize: TYPOGRAPHY.size.base,
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    linkButton: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
    },
    link: {
        color: '#6366F1',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    openButton: {
        width: '100%',
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        marginTop: SPACING.lg,
    },
    openButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    openButtonText: {
        color: '#FFF',
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: '600',
    },
    hint: {
        color: COLORS.text.tertiary,
        fontSize: TYPOGRAPHY.size.sm,
        marginTop: SPACING.md,
        textAlign: 'center',
    },
});
