/**
 * 🔐 Forgot Password Screen - PREMIUM EXPERIENCE
 * Consistent mechanism with Login screen
 */

import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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

// ============================================
// ANIMATED ORB BACKGROUND (Shared Logic)
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
                            { scale: orb1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
                        ],
                        opacity: 0.4,
                    }
                ]}
            >
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View
                style={[
                    styles.orb,
                    styles.orb2,
                    {
                        transform: [
                            { translateY: orb2.interpolate({ inputRange: [0, 1], outputRange: [20, -20] }) },
                        ],
                        opacity: 0.3,
                    }
                ]}
            >
                <LinearGradient colors={['#06B6D4', '#3B82F6']} style={StyleSheet.absoluteFill} />
            </Animated.View>
        </View>
    );
}

// ============================================
// PREMIUM INPUT COMPONENT
// ============================================

function PremiumInput({ icon, placeholder, value, onChangeText, keyboardType, autoCapitalize, returnKeyType, onSubmitEditing }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.inputWrapper}>
            <BlurView intensity={30} tint="dark" style={[styles.inputBlur, focused && styles.inputBlurFocused]}>
                <View style={styles.inputInner}>
                    <Ionicons name={icon} size={20} color={focused ? COLORS.accent.light : COLORS.text.tertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor={COLORS.text.muted}
                        value={value}
                        onChangeText={onChangeText}
                        keyboardType={keyboardType}
                        autoCapitalize={autoCapitalize}
                        returnKeyType={returnKeyType}
                        onSubmitEditing={onSubmitEditing}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                    />
                </View>
            </BlurView>
        </View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ForgotPasswordScreen() {
    const insets = useSafeAreaInsets();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const handleReset = async () => {
        if (!email.trim()) {
            toast.error('Introduz o teu email');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'escolaa://reset-password',
            });

            if (error) throw error;

            setSent(true);
            toast.success('Email de recuperação enviado!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.background}>
                <AnimatedOrbs />
                <View style={styles.noise} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <TouchableWithoutFeedback onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined}>
                    <View style={[styles.content, { paddingTop: insets.top + 20 }]}>

                        {/* Back Button */}
                        <Pressable style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </Pressable>

                        <Animated.View style={[styles.formSection, { opacity: fadeAnim }]}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Recuperar Password</Text>
                                <Text style={styles.subtitle}>
                                    {sent
                                        ? `Enviámos um email para ${email} com instruções para recuperar a tua password.`
                                        : 'Introduz o teu email para receberes as instruções de recuperação.'
                                    }
                                </Text>
                            </View>

                            {!sent ? (
                                <>
                                    <PremiumInput
                                        icon="mail-outline"
                                        placeholder="Email"
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        returnKeyType="done"
                                        onSubmitEditing={handleReset}
                                    />

                                    <Pressable
                                        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                                        onPress={handleReset}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={['#4F46E5', '#7C3AED']}
                                            style={styles.buttonGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Enviar Instruções</Text>}
                                        </LinearGradient>
                                    </Pressable>
                                </>
                            ) : (
                                <Pressable
                                    style={styles.button}
                                    onPress={() => router.back()}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#059669']}
                                        style={styles.buttonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.buttonText}>Voltar ao Login</Text>
                                    </LinearGradient>
                                </Pressable>
                            )}
                        </Animated.View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030712' },
    background: { ...StyleSheet.absoluteFillObject },
    noise: { ...StyleSheet.absoluteFillObject, opacity: 0.03, backgroundColor: '#FFF' },
    orb: { position: 'absolute', borderRadius: 999, overflow: 'hidden' },
    orb1: { width: 300, height: 300, top: -50, left: -50 },
    orb2: { width: 250, height: 250, bottom: 50, right: -50 },

    content: { flex: 1, paddingHorizontal: 28 },
    backButton: { marginBottom: 32, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

    formSection: { gap: 24 },
    header: { gap: 12, marginBottom: 12 },
    title: { fontSize: 32, fontWeight: '800', color: '#FFF' },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 24 },

    inputWrapper: {},
    inputBlur: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    inputBlurFocused: { borderColor: '#4F46E5' },
    inputInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    input: { flex: 1, fontSize: 16, color: '#FFF' },

    button: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
    buttonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    buttonGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    buttonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
