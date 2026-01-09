/**
 * 🔐 Login Screen - Ultra Minimalist
 * Premium, Responsive, Clean.
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
    returnKeyType, onSubmitEditing, inputRef
}: any) {
    const [focused, setFocused] = useState(false);
    const [showText, setShowText] = useState(!secureTextEntry);

    return (
        <View style={[
            styles.inputContainer,
            focused && styles.inputFocused,
            !focused && value.length > 0 && styles.inputFilled
        ]}>
            <Ionicons
                name={icon}
                size={20}
                color={focused ? '#FFF' : COLORS.text.tertiary}
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isDesktop = width > 768;

    const { isLoading: authLoading } = useAuthContext();
    const { signInWithGoogle, signInWithDiscord, loading: oauthLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const passwordRef = useRef<TextInput>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Preenche todos os campos');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                setError(signInError.message === 'Invalid login credentials'
                    ? 'Email ou password incorretos'
                    : signInError.message);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'discord') => {
        setError(null);
        try {
            const result = provider === 'google'
                ? await signInWithGoogle()
                : await signInWithDiscord();

            if (!result.success && result.error) {
                // Check if it looks like a network blocking issue
                if (result.error.message.includes('monitor') || result.error.message.includes('extension')) {
                    setError('O login foi bloqueado por uma extensão (ex: AdBlock). Tente desativá-la.');
                } else {
                    setError(result.error.message);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        }
    };

    const isValid = email.trim().length > 0 && password.trim().length > 0;
    const isLoading = loading || authLoading || oauthLoading;

    return (
        <View style={styles.container}>
            {/* Background */}
            <LinearGradient
                colors={['#0F1014', '#13151A']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Background Pattern */}
            <RNImage
                source={require('@/assets/images/auth-bg-pattern.png')}
                style={[StyleSheet.absoluteFill, { opacity: 0.05 }]}
                resizeMode="repeat"
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="school" size={32} color="#FFF" />
                                </View>
                                <Text style={styles.title}>Bem-vindo de volta</Text>
                                <Text style={styles.subtitle}>Entra para continuares a tua jornada.</Text>
                            </View>

                            {/* Form */}
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

                                    <MinimalInput
                                        icon="lock-closed-outline"
                                        placeholder="Password"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        returnKeyType="done"
                                        onSubmitEditing={handleLogin}
                                        inputRef={passwordRef}
                                    />
                                </View>

                                <Pressable
                                    onPress={() => router.push('/(auth)/forgot-password' as any)}
                                    style={styles.forgotLink}
                                >
                                    <Text style={styles.forgotText}>Esqueceste-te da password?</Text>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.loginButton,
                                        !isValid && styles.loginButtonDisabled,
                                        pressed && { opacity: 0.9 }
                                    ]}
                                    onPress={handleLogin}
                                    disabled={!isValid || isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#000" size="small" />
                                    ) : (
                                        <Text style={styles.loginButtonText}>Entrar</Text>
                                    )}
                                </Pressable>

                                {/* Divider */}
                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>ou continua com</Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                {/* Social Login - Simplified */}
                                <View style={styles.socialGrid}>
                                    <Pressable
                                        style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                                        onPress={() => handleSocialLogin('google')}
                                    >
                                        <Ionicons name="logo-google" size={20} color="#FFF" />
                                        <Text style={styles.socialBtnText}>Google</Text>
                                    </Pressable>

                                    <Pressable
                                        style={({ pressed }) => [styles.socialBtn, pressed && styles.socialBtnPressed]}
                                        onPress={() => handleSocialLogin('discord')}
                                    >
                                        <Ionicons name="logo-discord" size={20} color="#5865F2" />
                                        <Text style={styles.socialBtnText}>Discord</Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Ainda não tens conta?</Text>
                                <Link href="/(auth)/register" asChild>
                                    <Pressable hitSlop={10}>
                                        <Text style={styles.footerLink}>Criar conta</Text>
                                    </Pressable>
                                </Link>
                            </View>

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
    ambientGlow: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        backgroundColor: '#4F46E5',
        opacity: 0.08, // Reduced opacity
        borderRadius: 150,
        transform: [{ scale: 1.5 }], // Reduced scale
        zIndex: 0,
        pointerEvents: 'none',
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
        // flex: 0 removed
    },

    // Header
    header: {
        alignItems: 'center',
        marginBottom: 40,
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
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        width: '100%',
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    inputFocused: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        transform: [{ scale: 1.01 }],
    },
    inputFilled: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    input: {
        flex: 1,
        height: '100%',
        width: '100%',
        fontSize: 16,
        color: '#FFF',
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

    forgotLink: {
        alignSelf: 'flex-end',
        marginTop: 12,
        marginBottom: 24,
    },
    forgotText: {
        fontSize: 13,
        color: COLORS.text.tertiary,
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

    // Divider
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

    // Social
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

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
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
});