/**
 * 🚀 PREMIUM REGISTER - TripGlide Style
 * Consistent with app design: warm dark tones, elevated surfaces, organic radius
 * Minimalist, Premium, Immersive
 */

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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

// ============================================
// PASSWORD STRENGTH
// ============================================

function PasswordStrength({ password }: { password: string }) {
    const getStrength = () => {
        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };

    const strength = getStrength();
    const getColor = () => {
        if (strength <= 1) return COLORS.error;
        if (strength <= 2) return COLORS.warning;
        if (strength <= 3) return COLORS.success;
        return COLORS.accent.primary;
    };
    const getLabel = () => {
        if (strength <= 1) return 'Fraca';
        if (strength <= 2) return 'Razoável';
        if (strength <= 3) return 'Boa';
        return 'Excelente 💪';
    };

    if (!password) return null;

    return (
        <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((bar) => (
                    <View
                        key={bar}
                        style={[
                            styles.strengthBar,
                            { backgroundColor: bar <= strength ? getColor() : COLORS.surfaceMuted },
                        ]}
                    />
                ))}
            </View>
            <Text style={[styles.strengthLabel, { color: getColor() }]}>{getLabel()}</Text>
        </View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const { signUp, loading: authLoading } = useAuth();
    const loading = authLoading || isOAuthLoading;

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const successScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (success) {
            Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
        }
    }, [success]);

    const extractParamsFromUrl = (url: string) => {
        const params = new URLSearchParams(url.split('#')[1]);
        return { access_token: params.get('access_token'), refresh_token: params.get('refresh_token') };
    };

    const performOAuth = async (provider: 'google' | 'discord') => {
        try {
            setError('');
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
            setError(err.message || 'Erro ao conectar');
        } finally {
            setIsOAuthLoading(false);
        }
    };

    const handleRegister = async () => {
        setError('');
        if (!email || !password || !confirmPassword) {
            setError('Preenche todos os campos');
            return;
        }
        if (password !== confirmPassword) {
            setError('As passwords não coincidem');
            return;
        }
        if (password.length < 6) {
            setError('A password deve ter pelo menos 6 caracteres');
            return;
        }
        const result = await signUp(email, password);
        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.error?.message || 'Erro ao criar conta');
        }
    };

    const passwordsMatch = password && confirmPassword && password === confirmPassword;

    // Success Screen
    if (success) {
        return (
            <View style={styles.container}>
                <Animated.View style={[styles.successContainer, { transform: [{ scale: successScale }] }]}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconWrap}>
                            <LinearGradient
                                colors={[COLORS.success, '#059669']}
                                style={styles.successIcon}
                            >
                                <Ionicons name="checkmark" size={48} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.successTitle}>Conta Criada! 🎉</Text>
                        <Text style={styles.successSubtitle}>
                            Verifica o teu email para confirmar a conta e começa a tua jornada académica!
                        </Text>
                        <Link href="/(auth)/login" asChild>
                            <Pressable style={styles.successButton}>
                                <LinearGradient
                                    colors={COLORS.brand.gradient as [string, string]}
                                    style={styles.successButtonGradient}
                                >
                                    <Text style={styles.successButtonText}>Ir para Login</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </LinearGradient>
                            </Pressable>
                        </Link>
                    </View>
                </Animated.View>
            </View>
        );
    }

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
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <View style={styles.headerIconWrap}>
                                <LinearGradient
                                    colors={COLORS.brand.gradient as [string, string]}
                                    style={styles.headerIcon}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="rocket" size={32} color="#FFF" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.headerTitle}>Cria a tua conta</Text>
                            <Text style={styles.headerSubtitle}>Junta-te a milhares de estudantes</Text>
                        </View>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            {/* Email */}
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
                                        placeholder="O teu melhor email"
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

                            {/* Password */}
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
                                        placeholder="Mínimo 6 caracteres"
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
                                <PasswordStrength password={password} />
                            </View>

                            {/* Confirm Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Confirmar Password</Text>
                                <View style={[
                                    styles.inputContainer,
                                    focusedInput === 'confirm' && styles.inputFocused,
                                    passwordsMatch && styles.inputSuccess,
                                ]}>
                                    <Ionicons
                                        name={passwordsMatch ? "checkmark-circle" : "lock-closed-outline"}
                                        size={20}
                                        color={passwordsMatch ? COLORS.success : (focusedInput === 'confirm' ? COLORS.accent.primary : COLORS.text.tertiary)}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Repete a password"
                                        placeholderTextColor={COLORS.text.muted}
                                        secureTextEntry={!showPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        onFocus={() => setFocusedInput('confirm')}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    {passwordsMatch && (
                                        <Ionicons name="checkmark" size={18} color={COLORS.success} />
                                    )}
                                </View>
                            </View>

                            {/* Error */}
                            {error ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            {/* Submit Button */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.submitButton,
                                    pressed && styles.submitPressed,
                                    loading && styles.submitDisabled,
                                ]}
                                onPress={handleRegister}
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
                                            <Text style={styles.submitText}>Criar Conta</Text>
                                            <Ionicons name="sparkles" size={20} color="#FFF" />
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou regista-te com</Text>
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

                        {/* Login Link */}
                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Já tens conta? </Text>
                            <Link href="/(auth)/login" asChild>
                                <Pressable>
                                    <Text style={styles.loginLink}>Entra aqui</Text>
                                </Pressable>
                            </Link>
                        </View>

                        {/* Terms */}
                        <Text style={styles.termsText}>
                            Ao criar conta, aceitas os nossos{' '}
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
        paddingVertical: SPACING['2xl'],
    },
    content: {
        gap: SPACING.xl,
    },

    // Header
    headerSection: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    headerIconWrap: {
        marginBottom: SPACING.md,
    },
    headerIcon: {
        width: 72,
        height: 72,
        borderRadius: RADIUS['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.lg,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        marginTop: SPACING.xs,
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
    inputSuccess: {
        borderColor: COLORS.success,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    input: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        paddingVertical: SPACING.xs,
    },

    // Password Strength
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.xs,
    },
    strengthBars: {
        flex: 1,
        flexDirection: 'row',
        gap: 4,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.semibold,
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

    // Login
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    loginText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    loginLink: {
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

    // Success
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    successCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING['2xl'],
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    successIconWrap: {
        marginBottom: SPACING.xl,
    },
    successIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        fontSize: 26,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    successSubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    successButton: {
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        width: '100%',
    },
    successButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    successButtonText: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
});