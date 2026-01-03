/**
 * 🔐 Reset Password Screen - PREMIUM EXPERIENCE
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

function PremiumInput({ icon, placeholder, value, onChangeText, secureTextEntry, returnKeyType, onSubmitEditing }: any) {
    const [focused, setFocused] = useState(false);
    const [showText, setShowText] = useState(!secureTextEntry);

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
                        secureTextEntry={secureTextEntry && !showText}
                        returnKeyType={returnKeyType}
                        onSubmitEditing={onSubmitEditing}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                    />
                    {secureTextEntry && (
                        <Pressable onPress={() => setShowText(!showText)}>
                            <Ionicons name={showText ? 'eye-off' : 'eye'} size={20} color={COLORS.text.tertiary} />
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

export default function ResetPasswordScreen() {
    const insets = useSafeAreaInsets();
    const { toast } = useToast();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const handleUpdate = async () => {
        if (!password.trim() || !confirm.trim()) {
            toast.error('Preenche todos os campos');
            return;
        }

        if (password !== confirm) {
            toast.error('As passwords não coincidem');
            return;
        }

        if (password.length < 6) {
            toast.error('A password deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password.trim() });

            if (error) throw error;

            toast.success('Password atualizada com sucesso!');
            // Delay redirect to show success
            setTimeout(() => {
                router.replace('/(auth)/login');
            }, 1500);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar password');
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
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={[styles.content, { paddingTop: insets.top + 20 }]}>

                        <Animated.View style={[styles.formSection, { opacity: fadeAnim }]}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Nova Password</Text>
                                <Text style={styles.subtitle}>
                                    Define a tua nova password segura.
                                </Text>
                            </View>

                            <PremiumInput
                                icon="lock-closed-outline"
                                placeholder="Nova password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                returnKeyType="next"
                            />

                            <PremiumInput
                                icon="lock-closed-outline"
                                placeholder="Confirmar password"
                                value={confirm}
                                onChangeText={setConfirm}
                                secureTextEntry
                                returnKeyType="done"
                                onSubmitEditing={handleUpdate}
                            />

                            <Pressable
                                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                                onPress={handleUpdate}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={['#4F46E5', '#7C3AED']}
                                    style={styles.buttonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Atualizar Password</Text>}
                                </LinearGradient>
                            </Pressable>
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

    content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },

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
