import { useAuth } from '@/hooks/useAuth';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Necessário para o fluxo de browser
WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Estado para loading do Social Login
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);

    const { signUp, loading: authLoading } = useAuth();

    const loading = authLoading || isOAuthLoading;

    // Função auxiliar (podes copiar a mesma ou importar se tiveres utils)
    const extractParamsFromUrl = (url: string) => {
        const params = new URLSearchParams(url.split('#')[1]);
        return {
            access_token: params.get('access_token'),
            refresh_token: params.get('refresh_token'),
        };
    };

    const performOAuth = async (provider: 'google' | 'discord') => {
        try {
            setError('');
            setIsOAuthLoading(true);

            const redirectUrl = makeRedirectUri({
                scheme: 'escolaa',
                path: 'auth/callback',
            });

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data?.url) throw new Error('O Supabase não retornou um URL.');

            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUrl
            );

            if (result.type === 'success' && result.url) {
                // AQUI ESTÁ A CORREÇÃO: Forçar a sessão manualmente
                const { access_token, refresh_token } = extractParamsFromUrl(result.url);

                if (access_token && refresh_token) {
                    const { error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });
                    if (error) throw error;
                    // Sucesso! O AuthProvider vai redirecionar sozinho
                } else {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error('Sessão não encontrada.');
                }
            }
        } catch (err: any) {
            console.error("[OAuth Error]", err);
            setError(err.message || 'Erro ao conectar com o provedor.');
        } finally {
            setIsOAuthLoading(false);
        }
    };

    const handleRegister = async () => {
        setError('');
        if (!email || !password || !confirmPassword) {
            setError('Por favor, preenche todos os campos');
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

    if (success) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successContainer}>
                    <View style={styles.successCard}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark" size={40} color={colors.success.primary} />
                        </View>
                        <Text style={styles.successTitle}>Conta Criada!</Text>
                        <Text style={styles.successSubtitle}>
                            Verifica o teu email para confirmar a conta e depois faz login.
                        </Text>
                        <Link href="/(auth)/login" asChild>
                            <Pressable style={styles.successButton}>
                                <Text style={styles.successButtonText}>Ir para Login</Text>
                            </Pressable>
                        </Link>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Criar Conta</Text>
                        <Text style={styles.subtitle}>Junta-te à aventura académica! 🚀</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Email */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="exemplo@email.com"
                                    placeholderTextColor={colors.text.tertiary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mínimo 6 caracteres"
                                    placeholderTextColor={colors.text.tertiary}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.tertiary} />
                                </Pressable>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmar Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Repete a password"
                                    placeholderTextColor={colors.text.tertiary}
                                    secureTextEntry={!showPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                            </View>
                        </View>

                        {/* Error */}
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={colors.danger.primary} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Submit */}
                        <Pressable
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.text.inverse} />
                            ) : (
                                <Text style={styles.submitText}>Criar Conta</Text>
                            )}
                        </Pressable>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou regista-te com</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Buttons */}
                        <View style={styles.socialButtons}>
                            <Pressable
                                style={styles.socialButton}
                                onPress={() => performOAuth('google')}
                                disabled={loading}
                            >
                                <Ionicons name="logo-google" size={20} color="#DB4437" />
                                <Text style={styles.socialButtonText}>Google</Text>
                            </Pressable>

                            <Pressable
                                style={styles.socialButton}
                                onPress={() => performOAuth('discord')}
                                disabled={loading}
                            >
                                <Ionicons name="logo-discord" size={20} color="#5865F2" />
                                <Text style={styles.socialButtonText}>Discord</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Login Link */}
                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Já tens conta? </Text>
                        <Link href="/(auth)/login" asChild>
                            <Pressable>
                                <Text style={styles.loginLink}>Entra aqui</Text>
                            </Pressable>
                        </Link>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing['2xl'],
    },

    // Header
    header: {
        alignItems: 'center',
        marginBottom: spacing['3xl'],
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },

    // Form
    form: {
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.sm,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.sm,
    },
    inputIcon: {
        marginLeft: spacing.lg,
    },
    input: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    eyeButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.danger.light,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    errorText: {
        fontSize: typography.size.sm,
        color: colors.danger.primary,
        flex: 1,
    },

    // Submit
    submitButton: {
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.md,
        ...shadows.md,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitText: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Divider (Adicionei estes estilos que faltavam)
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginHorizontal: spacing.md,
    },

    // Social Buttons (Adicionei estes estilos que faltavam)
    socialButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        gap: spacing.sm,
        ...shadows.sm,
    },
    socialButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },

    // Login
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing['3xl'],
    },
    loginText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    loginLink: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },

    // Success
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    successCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing['2xl'],
        alignItems: 'center',
        ...shadows.lg,
    },
    successIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.success.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    successTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    successSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    successButton: {
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing['2xl'],
        ...shadows.md,
    },
    successButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
});