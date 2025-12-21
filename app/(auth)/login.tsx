import { useAuth } from '@/hooks/useAuth';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { supabase } from '@/lib/supabase'; // Importação direta necessária para o OAuth customizado
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Necessário para o fluxo de browser funcionar corretamente no Android/iOS
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Vamos usar o estado de loading local para o OAuth também
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);
    
    const { signIn, loading: authLoading } = useAuth();
    const router = useRouter();

    const loading = authLoading || isOAuthLoading;

    // Função auxiliar para tirar o token do URL
    const extractParamsFromUrl = (url: string) => {
        const params = new URLSearchParams(url.split('#')[1]);
        return {
            access_token: params.get('access_token'),
            refresh_token: params.get('refresh_token'),
        };
    };

    // Função "God Tier" para lidar com Google e Discord
    const performOAuth = async (provider: 'google' | 'discord') => {
        try {
            setLocalError('');
            setIsOAuthLoading(true);

            // 1. Criar o URL de retorno (escolaa://auth/callback)
            const redirectUrl = makeRedirectUri({
                scheme: 'escolaa',
                path: 'auth/callback',
            });

            console.log(`[OAuth] Iniciando login com ${provider}. Redirecionar para: ${redirectUrl}`);

            // 2. Iniciar o fluxo com o Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data?.url) throw new Error('O Supabase não retornou um URL de login.');

            // 3. Abrir o Browser do Sistema e esperar que ele volte
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUrl
            );

            // 4. Verificar o resultado e FORÇAR a sessão
            if (result.type === 'success' && result.url) {
                // Truque de Mestre: Ler o token diretamente do URL
                const { access_token, refresh_token } = extractParamsFromUrl(result.url);

                if (access_token && refresh_token) {
                    const { error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });
                    if (error) throw error;
                    console.log("[OAuth] Sessão definida manualmente com sucesso!");
                } else {
                    // Fallback (plano B)
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error('Sessão não detetada.');
                }
            } else {
                console.log("[OAuth] Cancelado pelo utilizador.");
            }

        } catch (err: any) {
            console.error("[OAuth Error]", err);
            setLocalError(err.message || 'Erro ao conectar com o provedor.');
            Alert.alert('Erro no Login', err.message);
        } finally {
            setIsOAuthLoading(false);
        }
    };

    const handleLogin = async () => {
        setLocalError('');
        if (!email || !password) {
            setLocalError('Por favor, preenche todos os campos');
            return;
        }
        
        // Login normal com Email/Pass
        const result = await signIn(email, password);
        if (!result.success) {
            setLocalError(result.error?.message || 'Erro ao entrar');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoIcon}>
                            <Ionicons name="flash" size={32} color={colors.accent.primary} />
                        </View>
                        <Text style={styles.logoText}>Escola+</Text>
                        <Text style={styles.tagline}>Aprende. Conquista. Evolui.</Text>
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
                                    placeholder="••••••••"
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

                        {/* Error */}
                        {localError ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={colors.danger.primary} />
                                <Text style={styles.errorText}>{localError}</Text>
                            </View>
                        ) : null}

                        {/* Submit */}
                        <Pressable
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.text.inverse} />
                            ) : (
                                <Text style={styles.submitText}>Entrar</Text>
                            )}
                        </Pressable>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou continua com</Text>
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

                        {/* Forgot Password */}
                        <Pressable style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Esqueceste a password?</Text>
                        </Pressable>
                    </View>

                    {/* Register Link */}
                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>Não tens conta? </Text>
                        <Link href="/(auth)/register" asChild>
                            <Pressable>
                                <Text style={styles.registerLink}>Regista-te</Text>
                            </Pressable>
                        </Link>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Mantive os teus estilos exatamente como estavam
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing['4xl'],
    },
    logoIcon: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    logoText: {
        fontSize: typography.size['3xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
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
    forgotPassword: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    forgotPasswordText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing['3xl'],
    },
    registerText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    registerLink: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
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
});