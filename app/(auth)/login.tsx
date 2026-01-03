/**
 * 🔐 Login Screen - V4 PREMIUM EXPERIENCE
 * Inspired by Linear, Arc Browser, Raycast, Vercel
 * Absolutely stunning, minimal, premium
 */

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// ANIMATED ORB BACKGROUND
// ============================================

function AnimatedOrbs() {
    const orb1 = useRef(new Animated.Value(0)).current;
    const orb2 = useRef(new Animated.Value(0)).current;
    const orb3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (anim: Animated.Value, duration: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            ).start();
        };
        animate(orb1, 8000);
        animate(orb2, 10000);
        animate(orb3, 12000);
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Main gradient orb */}
            <Animated.View
                style={[
                    styles.orb,
                    styles.orb1,
                    {
                        transform: [
                            { translateX: orb1.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) },
                            { translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) },
                            { scale: orb1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] }) },
                        ],
                        opacity: 0.4,
                    }
                ]}
            >
                <LinearGradient
                    colors={['#4F46E5', '#7C3AED', '#EC4899']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </Animated.View>

            {/* Secondary orb */}
            <Animated.View
                style={[
                    styles.orb,
                    styles.orb2,
                    {
                        transform: [
                            { translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [30, -30] }) },
                            { translateY: orb2.interpolate({ inputRange: [0, 1], outputRange: [20, -20] }) },
                        ],
                        opacity: 0.3,
                    }
                ]}
            >
                <LinearGradient
                    colors={['#06B6D4', '#3B82F6']}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            {/* Accent orb */}
            <Animated.View
                style={[
                    styles.orb,
                    styles.orb3,
                    {
                        transform: [
                            { translateX: orb3.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
                            { scale: orb3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.05, 0.9] }) },
                        ],
                        opacity: 0.2,
                    }
                ]}
            >
                <LinearGradient
                    colors={['#F59E0B', '#EF4444']}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
}

// ============================================
// PREMIUM INPUT COMPONENT
// ============================================

interface PremiumInputProps {
    icon: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address';
    autoCapitalize?: 'none' | 'sentences';
    returnKeyType?: 'next' | 'done';
    onSubmitEditing?: () => void;
    inputRef?: React.RefObject<TextInput | null>;
}

function PremiumInput({
    icon, placeholder, value, onChangeText,
    secureTextEntry, keyboardType, autoCapitalize,
    returnKeyType, onSubmitEditing, inputRef
}: PremiumInputProps) {
    const [focused, setFocused] = useState(false);
    const [showText, setShowText] = useState(!secureTextEntry);
    const borderAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(borderAnim, {
                toValue: focused ? 1 : 0,
                duration: 200,
                useNativeDriver: false,
            }),
            Animated.spring(scaleAnim, {
                toValue: focused ? 1.02 : 1,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();
    }, [focused]);

    return (
        <Animated.View
            style={[
                styles.inputWrapper,
                { transform: [{ scale: scaleAnim }] }
            ]}
        >
            <Animated.View
                style={[
                    styles.inputGlow,
                    {
                        opacity: borderAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
                    }
                ]}
            />
            <BlurView intensity={30} tint="dark" style={styles.inputBlur}>
                <View style={styles.inputInner}>
                    <Ionicons
                        name={icon as any}
                        size={20}
                        color={focused ? COLORS.accent.light : COLORS.text.tertiary}
                    />
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
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
                        <Pressable onPress={() => setShowText(!showText)} hitSlop={12}>
                            <Ionicons
                                name={showText ? 'eye-off' : 'eye'}
                                size={20}
                                color={COLORS.text.tertiary}
                            />
                        </Pressable>
                    )}
                </View>
            </BlurView>
        </Animated.View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const { isLoading: authLoading } = useAuthContext();
    const { signInWithGoogle, signInWithDiscord, loading: oauthLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const passwordRef = useRef<TextInput>(null);

    // Entrance animations
    const logoAnim = useRef(new Animated.Value(0)).current;
    const formAnim = useRef(new Animated.Value(0)).current;
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(150, [
            Animated.spring(logoAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
            Animated.spring(formAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.spring(buttonAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
        ]).start();
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
                setError(result.error.message);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        }
    };

    const isValid = email.trim().length > 0 && password.trim().length > 0;
    const isLoading = loading || authLoading || oauthLoading;

    return (
        <View style={styles.container}>
            {/* Animated Background */}
            <View style={styles.background}>
                <AnimatedOrbs />
                <View style={styles.noise} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>

                        {/* Logo */}
                        <Animated.View
                            style={[
                                styles.logoSection,
                                {
                                    opacity: logoAnim,
                                    transform: [
                                        { translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                                        { scale: logoAnim },
                                    ],
                                }
                            ]}
                        >
                            <View style={styles.logoContainer}>
                                <LinearGradient
                                    colors={['#4F46E5', '#7C3AED'] as [string, string]}
                                    style={styles.logo}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.logoText}>E+</Text>
                                </LinearGradient>
                                <View style={styles.logoGlow} />
                            </View>
                            <Text style={styles.appName}>Escola+</Text>
                            <Text style={styles.tagline}>Estuda de forma inteligente</Text>
                        </Animated.View>

                        {/* Form */}
                        <Animated.View
                            style={[
                                styles.formSection,
                                {
                                    opacity: formAnim,
                                    transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                                }
                            ]}
                        >
                            {/* Error */}
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="warning" size={16} color="#EF4444" />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            <PremiumInput
                                icon="mail-outline"
                                placeholder="Email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />

                            <View style={{ height: 16 }} />

                            <PremiumInput
                                icon="lock-closed-outline"
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                                inputRef={passwordRef}
                            />

                            <Pressable
                                style={styles.forgotLink}
                                onPress={() => router.push('/(auth)/forgot-password' as any)}
                            >
                                <Text style={styles.forgotText}>Esqueceste a password?</Text>
                            </Pressable>
                        </Animated.View>

                        {/* Button */}
                        <Animated.View
                            style={[
                                styles.buttonSection,
                                {
                                    opacity: buttonAnim,
                                    transform: [{ translateY: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
                                }
                            ]}
                        >
                            <Pressable
                                style={({ pressed }) => [
                                    styles.loginButton,
                                    !isValid && styles.loginButtonDisabled,
                                    pressed && styles.loginButtonPressed,
                                ]}
                                onPress={handleLogin}
                                disabled={!isValid || isLoading}
                            >
                                <LinearGradient
                                    colors={isValid ? ['#4F46E5', '#7C3AED'] as [string, string] : ['#374151', '#374151'] as [string, string]}
                                    style={styles.loginButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.loginButtonText}>Continuar</Text>
                                            <Ionicons name="arrow-forward" size={18} color="#FFF" />
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>

                            {/* Divider */}
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>ou</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* Social */}
                            <View style={styles.socialRow}>
                                <Pressable
                                    style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                                    onPress={() => handleSocialLogin('google')}
                                >
                                    <BlurView intensity={20} tint="dark" style={styles.socialButtonBlur}>
                                        <Ionicons name="logo-google" size={20} color="#FFF" />
                                    </BlurView>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                                    onPress={() => handleSocialLogin('discord')}
                                >
                                    <BlurView intensity={20} tint="dark" style={styles.socialButtonBlur}>
                                        <Ionicons name="logo-discord" size={20} color="#5865F2" />
                                    </BlurView>
                                </Pressable>
                            </View>
                        </Animated.View>

                        {/* Register */}
                        <Animated.View style={[styles.registerSection, { opacity: buttonAnim }]}>
                            <Text style={styles.registerText}>Não tens conta?</Text>
                            <Link href="/(auth)/register" asChild>
                                <Pressable>
                                    <Text style={styles.registerLink}>Criar conta</Text>
                                </Pressable>
                            </Link>
                        </Animated.View>

                    </View>
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
        backgroundColor: '#030712',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    noise: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.03,
        backgroundColor: '#FFF',
    },

    // Orbs
    orb: {
        position: 'absolute',
        borderRadius: 999,
        overflow: 'hidden',
    },
    orb1: {
        width: 400,
        height: 400,
        top: -100,
        left: -100,
    },
    orb2: {
        width: 300,
        height: 300,
        bottom: 100,
        right: -80,
    },
    orb3: {
        width: 200,
        height: 200,
        bottom: -50,
        left: 50,
    },

    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
    },

    // Logo
    logoSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    logo: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -1,
    },
    logoGlow: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: '#4F46E5',
        opacity: 0.5,
        transform: [{ scale: 1.3 }],
        zIndex: -1,
    },
    appName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },

    // Form
    formSection: {
        marginBottom: 32,
    },
    inputWrapper: {
        position: 'relative',
    },
    inputGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: 18,
        backgroundColor: '#4F46E5',
    },
    inputBlur: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    inputInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 16 : 12,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#FFF',
    },
    forgotLink: {
        alignSelf: 'flex-end',
        marginTop: 12,
    },
    forgotText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        flex: 1,
    },

    // Button
    buttonSection: {},
    loginButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    loginButtonDisabled: {
        opacity: 0.5,
    },
    loginButtonPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },
    loginButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },

    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dividerText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
    },

    // Social
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    socialButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    socialButtonPressed: {
        transform: [{ scale: 0.95 }],
        opacity: 0.8,
    },
    socialButtonBlur: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
    },

    // Register
    registerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 32,
    },
    registerText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    registerLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#818CF8',
    },
});