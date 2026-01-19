/**
 * 📝 Register Screen - Ultra Minimalist
 * Matches Login V4 Design
 */

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
    useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================
// COMPONENTS
// ============================================

function MinimalInput({
    icon, placeholder, value, onChangeText,
    secureTextEntry, keyboardType, autoCapitalize,
    returnKeyType, onSubmitEditing, inputRef,
    error // Optional error state for validation visual
}: any) {
    const [focused, setFocused] = useState(false);
    const [showText, setShowText] = useState(!secureTextEntry);

    return (
        <View style={[
            styles.inputContainer,
            focused && styles.inputFocused,
            !focused && value.length > 0 && styles.inputFilled,
            error && styles.inputError
        ]}>
            <Ionicons
                name={icon}
                size={20}
                color={error ? '#EF4444' : (focused ? '#FFF' : COLORS.text.tertiary)}
                style={{ marginRight: 12 }}
            />
            <TextInput
                ref={inputRef}
                style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                placeholder={placeholder}
                placeholderTextColor={COLORS.text.muted}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry && !showText}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                returnKeyType={returnKeyType}
                onSubmitEditing={onSubmitEditing}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {secureTextEntry && (
                <Pressable onPress={() => setShowText(!showText)} hitSlop={10}>
                    <Ionicons
                        name={showText ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.text.tertiary}
                    />
                </Pressable>
            )}
        </View>
    );
}

function PasswordStrength({ password }: { password: string }) {
    if (!password) return null;

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;

    const width = (strength / 4) * 100;
    const color = strength <= 1 ? '#EF4444' : strength <= 2 ? '#F59E0B' : '#10B981';

    return (
        <View style={styles.strengthContainer}>
            <View style={styles.strengthTrack}>
                <Animated.View style={[
                    styles.strengthFill,
                    { width: `${width}%`, backgroundColor: color }
                ]} />
            </View>
        </View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RegisterScreen() {
    const { width, height } = useWindowDimensions();
    const isDesktop = width > 768;
    const insets = useSafeAreaInsets();

    const { isLoading: authLoading } = useAuthContext();
    const { signInWithGoogle, signInWithDiscord, loading: oauthLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleRegister = async () => {
        if (!email.trim() || !password || !confirmPassword) {
            setError('Preenche todos os campos');
            return;
        }
        if (password.length < 6) {
            setError('A password deve ter pelo menos 6 caracteres');
            return;
        }
        if (password !== confirmPassword) {
            setError('As passwords não coincidem');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Este email já está registado');
                } else {
                    setError(signUpError.message);
                }
            } else {
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSignup = async (provider: 'google' | 'discord') => {
        setError(null);
        try {
            const result = provider === 'google'
                ? await signInWithGoogle()
                : await signInWithDiscord();

            if (!result.success && result.error) {
                setError(result.error.message);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao registar');
        }
    };

    const isValid = email.trim().length > 0 && password.length >= 6 && password === confirmPassword;
    const isLoading = loading || authLoading || oauthLoading;

    if (success) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#0F1014', '#13151A']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Background Pattern */}
                <RNImage
                    source={require('@/assets/images/auth-bg-pattern.png')}
                    style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.05 }]}
                    resizeMode="cover"
                />

                <View style={[styles.successContent, { paddingTop: insets.top }]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="checkmark" size={32} color="#10B981" />
                    </View>
                    <Text style={styles.title}>Conta criada!</Text>
                    <Text style={styles.subtitle}>Enviámos um email de confirmação para{'\n'}{email}</Text>

                    <Pressable
                        style={({ pressed }) => [styles.loginButton, pressed && { opacity: 0.9 }]}
                        onPress={() => router.replace('/(auth)/login' as any)}
                    >
                        <Text style={styles.loginButtonText}>Ir para Login</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F1014', '#13151A']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Background Pattern */}
            <RNImage
                source={require('@/assets/images/auth-bg-pattern.png')}
                style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.05 }]}
                resizeMode="cover"
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableWithoutFeedback onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined}>
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            { minHeight: height }
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View style={[
                            styles.contentWrapper,
                            isDesktop && styles.desktopCard,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                            }
                        ]}>

                            <View style={styles.header}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="person-add" size={28} color="#FFF" />
                                </View>
                                <Text style={styles.title}>Criar conta</Text>
                                <Text style={styles.subtitle}>Junta-te à comunidade.</Text>
                            </View>

                            <View style={styles.form}>
                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={18} color="#EF4444" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                <View style={{ gap: 16 }}>
                                    <MinimalInput
                                        icon="mail-outline"
                                        placeholder="Email"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        returnKeyType="next"
                                        onSubmitEditing={() => passwordRef.current?.focus()}
                                    />

                                    <View>
                                        <MinimalInput
                                            icon="lock-closed-outline"
                                            placeholder="Password"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            returnKeyType="next"
                                            onSubmitEditing={() => confirmRef.current?.focus()}
                                            inputRef={passwordRef}
                                        />
                                        <PasswordStrength password={password} />
                                    </View>

                                    <MinimalInput
                                        icon="lock-closed-outline"
                                        placeholder="Confirmar Password"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                        returnKeyType="done"
                                        onSubmitEditing={handleRegister}
                                        inputRef={confirmRef}
                                        error={confirmPassword.length > 0 && password !== confirmPassword}
                                    />
                                </View>

                                <View style={{ height: 32 }} />

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.loginButton,
                                        !isValid && styles.loginButtonDisabled,
                                        pressed && { opacity: 0.9 }
                                    ]}
                                    onPress={handleRegister}
                                    disabled={!isValid || isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#000" size="small" />
                                    ) : (
                                        <Text style={styles.loginButtonText}>Criar conta</Text>
                                    )}
                                </Pressable>

                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>ou continua com</Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                <View style={styles.socialGrid}>
                                    <Pressable
                                        style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                                        onPress={() => handleSocialSignup('google')}
                                    >
                                        <Ionicons name="logo-google" size={20} color="#FFF" />
                                        <Text style={styles.socialBtnText}>Google</Text>
                                    </Pressable>

                                    <Pressable
                                        style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                                        onPress={() => handleSocialSignup('discord')}
                                    >
                                        <Ionicons name="logo-discord" size={20} color="#5865F2" />
                                        <Text style={styles.socialBtnText}>Discord</Text>
                                    </Pressable>
                                </View>
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Já tens conta?</Text>
                                <Link href="/(auth)/login" asChild>
                                    <Pressable hitSlop={10}>
                                        <Text style={styles.footerLink}>Entrar</Text>
                                    </Pressable>
                                </Link>
                            </View>

                            <Text style={styles.terms}>
                                Ao criar conta, aceitas os <Text style={styles.termsLink}>Termos de Serviço</Text> e <Text style={styles.termsLink}>Política de Privacidade</Text>.
                            </Text>

                        </Animated.View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1014',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    desktopCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 32,
        padding: 48,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },

    // Header
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.text.secondary,
        textAlign: 'center',
    },

    // Form
    form: {
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputFocused: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    inputFilled: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    inputError: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#FFF',
        height: '100%',
    },

    strengthContainer: {
        marginTop: 8,
        paddingHorizontal: 4,
    },
    strengthTrack: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
    },

    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        flex: 1,
    },

    loginButton: {
        backgroundColor: '#FFF',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },

    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
        gap: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
        fontSize: 12,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    socialGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    socialBtn: {
        flex: 1,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    socialBtnPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    socialBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        color: COLORS.text.tertiary,
    },
    footerLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },

    terms: {
        fontSize: 12,
        color: COLORS.text.muted,
        textAlign: 'center',
        marginTop: 24,
        maxWidth: 300,
        alignSelf: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: COLORS.text.secondary,
        textDecorationLine: 'underline',
    },

    successContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
});