import { useAuth } from '@/hooks/useAuth';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, loading } = useAuth();

    const handleLogin = async () => {
        setError('');
        if (!email || !password) {
            setError('Por favor, preenche todos os campos');
            return;
        }
        const result = await signIn(email, password);
        if (!result.success) {
            setError(result.error?.message || 'Erro ao entrar');
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
                        {error ? (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={16} color={colors.danger.primary} />
                                <Text style={styles.errorText}>{error}</Text>
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

    // Logo
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

    // Forgot Password
    forgotPassword: {
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    forgotPasswordText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Register
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
});
