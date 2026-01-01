/**
 * 🚀 PREMIUM LOGIN - TripGlide Style
 * Consistent with app design: warm dark tones, elevated surfaces, organic radius
 * Minimalist, Premium, Immersive
 */

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// MAIN COMPONENT
// ============================================

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const { signIn, loading: authLoading } = useAuth();
    const router = useRouter();
    const loading = authLoading || isOAuthLoading;

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const extractParamsFromUrl = (url: string) => {
        const params = new URLSearchParams(url.split('#')[1]);
        return { access_token: params.get('access_token'), refresh_token: params.get('refresh_token') };
    };

    const performOAuth = async (provider: 'google' | 'discord') => {
        try {
            setLocalError('');
            setIsOAuthLoading(true);
            const redirectUrl = makeRedirectUri({ scheme: 'escolaa', path: 'auth/callback' });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
            });
            if (error) throw error;
            if (!data?.url) throw new Error('URL não retornado');
            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
            if (result.type === 'success' && result.url) {
                const { access_token, refresh_token } = extractParamsFromUrl(result.url);
                if (access_token && refresh_token) {
                    await supabase.auth.setSession({ access_token, refresh_token });
                }
            }
        } catch (err: any) {
            setLocalError(err.message || 'Erro ao conectar');
        } finally {
            setIsOAuthLoading(false);
        }
    };

    const handleLogin = async () => {
        setLocalError('');
        if (!email || !password) {
            setLocalError('Preenche todos os campos');
            return;
        }
        const result = await signIn(email, password);
        if (!result.success) {
            setLocalError(result.error?.message || 'Erro ao entrar');
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                        ]}
                    >
                        {/* Logo Section */}
                        <View style={styles.logoSection}>
                            <View style={styles.logoContainer}>
                                <LinearGradient
                                    colors={COLORS.brand.gradient as [string, string]}
                                    style={styles.logoGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="flash" size={36} color="#FFF" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.logoText}>Escola+</Text>
                            <Text style={styles.tagline}>O teu superpoder académico</Text>
                        </View>

                        {/* Welcome Card */}
                        <View style={styles.welcomeCard}>
                            <View style={styles.welcomeHeader}>
                                <Text style={styles.welcomeEmoji}>👋</Text>
                                <View>
                                    <Text style={styles.welcomeTitle}>Bem-vindo de volta!</Text>
                                    <Text style={styles.welcomeSubtitle}>Entra na tua conta para continuar</Text>
                                </View>
                            </View>
                        </View>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email</Text>
                                <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputFocused]}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={20}
                                        color={focusedInput === 'email' ? COLORS.accent.primary : COLORS.text.tertiary}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="exemplo@email.com"
                                        placeholderTextColor={COLORS.text.muted}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                        onFocus={() => setFocusedInput('email')}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                </View>
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputFocused]}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={20}
                                        color={focusedInput === 'password' ? COLORS.accent.primary : COLORS.text.tertiary}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor={COLORS.text.muted}
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                        onFocus={() => setFocusedInput('password')}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={COLORS.text.tertiary}
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Forgot Password */}
                            <Pressable style={styles.forgotButton}>
                                <Text style={styles.forgotText}>Esqueceste a password?</Text>
                            </Pressable>

                            {/* Error */}
                            {localError ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                                    <Text style={styles.errorText}>{localError}</Text>
                                </View>
                            ) : null}

                            {/* Submit Button */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.submitButton,
                                    pressed && styles.submitPressed,
                                    loading && styles.submitDisabled,
                                ]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={loading ? [COLORS.surfaceMuted, COLORS.surfaceMuted] : COLORS.brand.gradient as [string, string]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={COLORS.text.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.submitText}>Entrar</Text>
                                            <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou continua com</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Buttons */}
                        <View style={styles.socialGrid}>
                            <Pressable
                                style={({ pressed }) => [styles.socialButton, pressed && styles.socialPressed]}
                                onPress={() => performOAuth('google')}
                                disabled={loading}
                            >
                                <MaterialCommunityIcons name="google" size={22} color="#EA4335" />
                                <Text style={styles.socialText}>Google</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [styles.socialButton, pressed && styles.socialPressed]}
                                onPress={() => performOAuth('discord')}
                                disabled={loading}
                            >
                                <Ionicons name="logo-discord" size={22} color="#5865F2" />
                                <Text style={styles.socialText}>Discord</Text>
                            </Pressable>
                        </View>

                        {/* Register Link */}
                        <View style={styles.registerRow}>
                            <Text style={styles.registerText}>Não tens conta? </Text>
                            <Link href="/(auth)/register" asChild>
                                <Pressable>
                                    <Text style={styles.registerLink}>Cria aqui</Text>
                                </Pressable>
                            </Link>
                        </View>

                        {/* Terms */}
                        <Text style={styles.termsText}>
                            Ao continuar, aceitas os nossos{' '}
                            <Text style={styles.termsLink}>Termos de Serviço</Text>
                            {' '}e{' '}
                            <Text style={styles.termsLink}>Política de Privacidade</Text>
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============================================
// STYLES - TripGlide Design System
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING['3xl'],
    },
    content: {
        gap: SPACING.xl,
    },

    // Logo
    logoSection: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    logoContainer: {
        marginBottom: SPACING.md,
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: RADIUS['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.lg,
    },
    logoText: {
        fontSize: 32,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        marginTop: SPACING.xs,
    },

    // Welcome Card
    welcomeCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    welcomeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    welcomeEmoji: {
        fontSize: 40,
    },
    welcomeTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    welcomeSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
        marginTop: 2,
    },

    // Form Card
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.xl,
        gap: SPACING.lg,
        ...SHADOWS.sm,
    },

    // Inputs
    inputGroup: {
        gap: SPACING.sm,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        gap: SPACING.md,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: COLORS.accent.primary,
        backgroundColor: COLORS.accent.subtle,
    },
    input: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        paddingVertical: SPACING.xs,
    },

    // Forgot
    forgotButton: {
        alignSelf: 'flex-end',
    },
    forgotText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.accent.primary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },

    // Error
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    errorText: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.error,
    },

    // Submit
    submitButton: {
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        marginTop: SPACING.sm,
    },
    submitPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    submitDisabled: {
        opacity: 0.7,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    submitText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // Divider
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.glassBorder,
    },
    dividerText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.muted,
    },

    // Social
    socialGrid: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.sm,
    },
    socialPressed: {
        backgroundColor: COLORS.surfaceElevated,
    },
    socialText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },

    // Register
    registerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    registerText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    registerLink: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.accent.primary,
    },

    // Terms
    termsText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.muted,
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: COLORS.text.secondary,
        textDecorationLine: 'underline',
    },
});