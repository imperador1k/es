/**
 * 📝 Register Screen - V4 PREMIUM EXPERIENCE
 * Consistent with Login V4 - Stunning, minimal, premium
 */

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
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
    ScrollView,
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
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View
                style={[
                    styles.orb,
                    styles.orb1,
                    {
                        transform: [
                            { translateX: orb1.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) },
                            { translateY: orb1.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) },
                        ],
                        opacity: 0.35,
                    }
                ]}
            >
                <LinearGradient colors={['#10B981', '#06B6D4', '#3B82F6']} style={StyleSheet.absoluteFill} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.orb,
                    styles.orb2,
                    {
                        transform: [
                            { translateX: orb2.interpolate({ inputRange: [0, 1], outputRange: [30, -30] }) },
                        ],
                        opacity: 0.25,
                    }
                ]}
            >
                <LinearGradient colors={['#7C3AED', '#EC4899']} style={StyleSheet.absoluteFill} />
            </Animated.View>
        </View>
    );
}

// ============================================
// PASSWORD STRENGTH
// ============================================

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
    if (!password) return { level: 0, label: '', color: '#374151' };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Fraca', color: '#EF4444' };
    if (score <= 2) return { level: 2, label: 'Razoável', color: '#F59E0B' };
    if (score <= 3) return { level: 3, label: 'Boa', color: '#10B981' };
    return { level: 4, label: 'Forte', color: '#059669' };
}

// ============================================
// PREMIUM INPUT
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
    isValid?: boolean;
    showValidation?: boolean;
}

function PremiumInput({
    icon, placeholder, value, onChangeText,
    secureTextEntry, keyboardType, autoCapitalize,
    returnKeyType, onSubmitEditing, inputRef,
    isValid, showValidation
}: PremiumInputProps) {
    const [focused, setFocused] = useState(false);
    const [showText, setShowText] = useState(!secureTextEntry);
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(borderAnim, {
            toValue: focused ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [focused]);

    const getBorderColor = () => {
        if (showValidation && value.length > 0) {
            return isValid ? '#10B981' : '#EF4444';
        }
        return focused ? '#4F46E5' : 'rgba(255,255,255,0.08)';
    };

    return (
        <View style={styles.inputWrapper}>
            {focused && (
                <Animated.View
                    style={[styles.inputGlow, { opacity: borderAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]}
                />
            )}
            <BlurView intensity={25} tint="dark" style={[styles.inputBlur, { borderColor: getBorderColor() }]}>
                <View style={styles.inputInner}>
                    <Ionicons
                        name={(showValidation && value.length > 0 && isValid) ? 'checkmark-circle' : icon as any}
                        size={20}
                        color={
                            showValidation && value.length > 0
                                ? (isValid ? '#10B981' : '#EF4444')
                                : (focused ? '#818CF8' : 'rgba(255,255,255,0.4)')
                        }
                    />
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor="rgba(255,255,255,0.3)"
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
                            <Ionicons name={showText ? 'eye-off' : 'eye'} size={20} color="rgba(255,255,255,0.4)" />
                        </Pressable>
                    )}
                </View>
            </BlurView>
        </View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RegisterScreen() {
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

    const passwordStrength = getPasswordStrength(password);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;

    // Animations
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

    const handleRegister = async () => {
        if (!email.trim()) {
            setError('Introduz o teu email');
            return;
        }
        if (password.length < 6) {
            setError('Password deve ter pelo menos 6 caracteres');
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

    // Success Screen
    if (success) {
        return (
            <View style={styles.container}>
                <View style={styles.background}>
                    <AnimatedOrbs />
                </View>
                <View style={[styles.successContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <Animated.View style={styles.successIcon}>
                        <LinearGradient colors={['#10B981', '#06B6D4']} style={styles.successIconGradient}>
                            <Ionicons name="checkmark" size={48} color="#FFF" />
                        </LinearGradient>
                        <View style={styles.successIconGlow} />
                    </Animated.View>

                    <Text style={styles.successTitle}>Conta criada!</Text>
                    <Text style={styles.successSubtitle}>
                        Enviámos um email de confirmação para
                    </Text>
                    <Text style={styles.successEmail}>{email}</Text>

                    <Pressable
                        style={({ pressed }) => [styles.successButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                        onPress={() => router.replace('/(auth)/login')}
                    >
                        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.successButtonGradient}>
                            <Text style={styles.successButtonText}>Ir para Login</Text>
                            <Ionicons name="arrow-forward" size={18} color="#FFF" />
                        </LinearGradient>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.background}>
                <AnimatedOrbs />
            </View>

            <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 20 }]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Logo */}
                        <Animated.View
                            style={[
                                styles.logoSection,
                                {
                                    opacity: logoAnim,
                                    transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                                }
                            ]}
                        >
                            <View style={styles.logoContainer}>
                                <LinearGradient colors={['#10B981', '#06B6D4'] as [string, string]} style={styles.logo}>
                                    <Ionicons name="person-add" size={28} color="#FFF" />
                                </LinearGradient>
                                <View style={[styles.logoGlow, { backgroundColor: '#10B981' }]} />
                            </View>
                            <Text style={styles.appName}>Criar conta</Text>
                            <Text style={styles.tagline}>Junta-te a milhares de estudantes</Text>
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

                            <View style={{ height: 14 }} />

                            <PremiumInput
                                icon="lock-closed-outline"
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                                inputRef={passwordRef}
                            />

                            {/* Password Strength */}
                            {password.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBars}>
                                        {[1, 2, 3, 4].map((level) => (
                                            <View
                                                key={level}
                                                style={[
                                                    styles.strengthBar,
                                                    { backgroundColor: level <= passwordStrength.level ? passwordStrength.color : 'rgba(255,255,255,0.1)' }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label}
                                    </Text>
                                </View>
                            )}

                            <View style={{ height: 14 }} />

                            <PremiumInput
                                icon="lock-closed-outline"
                                placeholder="Confirmar Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                                inputRef={confirmRef}
                                isValid={!!passwordsMatch}
                                showValidation={confirmPassword.length > 0}
                            />
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
                                    styles.registerButton,
                                    !isValid && styles.registerButtonDisabled,
                                    pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                                ]}
                                onPress={handleRegister}
                                disabled={!isValid || isLoading}
                            >
                                <LinearGradient
                                    colors={isValid ? ['#10B981', '#06B6D4'] as [string, string] : ['#374151', '#374151'] as [string, string]}
                                    style={styles.registerButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.registerButtonText}>Criar conta</Text>
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
                                    style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                                    onPress={() => handleSocialSignup('google')}
                                >
                                    <BlurView intensity={20} tint="dark" style={styles.socialButtonBlur}>
                                        <Ionicons name="logo-google" size={20} color="#FFF" />
                                    </BlurView>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                                    onPress={() => handleSocialSignup('discord')}
                                >
                                    <BlurView intensity={20} tint="dark" style={styles.socialButtonBlur}>
                                        <Ionicons name="logo-discord" size={20} color="#5865F2" />
                                    </BlurView>
                                </Pressable>
                            </View>

                            {/* Terms */}
                            <Text style={styles.termsText}>
                                Ao criar conta, aceitas os{' '}
                                <Text style={styles.termsLink}>Termos</Text>
                                {' '}e{' '}
                                <Text style={styles.termsLink}>Privacidade</Text>
                            </Text>
                        </Animated.View>

                        {/* Login */}
                        <Animated.View style={[styles.loginSection, { opacity: buttonAnim }]}>
                            <Text style={styles.loginText}>Já tens conta?</Text>
                            <Link href="/(auth)/login" asChild>
                                <Pressable>
                                    <Text style={styles.loginLink}>Entrar</Text>
                                </Pressable>
                            </Link>
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
        backgroundColor: '#030712',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },

    orb: {
        position: 'absolute',
        borderRadius: 999,
        overflow: 'hidden',
    },
    orb1: {
        width: 350,
        height: 350,
        top: -80,
        right: -100,
    },
    orb2: {
        width: 280,
        height: 280,
        bottom: 50,
        left: -80,
    },

    keyboardView: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 28,
    },

    // Logo
    logoSection: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    logo: {
        width: 64,
        height: 64,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoGlow: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 18,
        opacity: 0.4,
        transform: [{ scale: 1.4 }],
        zIndex: -1,
    },
    appName: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },

    // Form
    formSection: {
        marginBottom: 28,
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
        borderWidth: 1.5,
    },
    inputInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 15 : 11,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#FFF',
    },

    // Strength
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingHorizontal: 4,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 6,
    },
    strengthBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: '600',
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
    registerButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    registerButtonDisabled: {
        opacity: 0.5,
    },
    registerButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    registerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },

    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginVertical: 22,
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
        marginBottom: 20,
    },
    socialButton: {
        borderRadius: 16,
        overflow: 'hidden',
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

    // Terms
    termsText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: '#818CF8',
    },

    // Login
    loginSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 24,
    },
    loginText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    loginLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#818CF8',
    },

    // Success
    successContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    successIcon: {
        position: 'relative',
        marginBottom: 28,
    },
    successIconGradient: {
        width: 96,
        height: 96,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successIconGlow: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 32,
        backgroundColor: '#10B981',
        opacity: 0.4,
        transform: [{ scale: 1.4 }],
        zIndex: -1,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },
    successEmail: {
        fontSize: 15,
        color: '#10B981',
        fontWeight: '600',
        marginTop: 4,
        marginBottom: 32,
    },
    successButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    successButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    successButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});