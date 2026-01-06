/**
 * SupportModal - Premium Buy Me a Coffee Modal
 * Design inspirado em TripGlide com toque pessoal
 */

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';

// ============================================
// CONSTANTS
// ============================================

const BUYMEACOFFEE_URL = 'https://buymeacoffee.com/imperador1k';

// ============================================
// TYPES
// ============================================

interface SupportModalProps {
    visible: boolean;
    onClose: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SupportModal({ visible, onClose }: SupportModalProps) {
    const [loading, setLoading] = React.useState(false);
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const coffeeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    damping: 15,
                    stiffness: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Coffee steam animation loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(coffeeAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(coffeeAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const handleSupport = async () => {
        try {
            setLoading(true);
            await WebBrowser.openBrowserAsync(BUYMEACOFFEE_URL, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                controlsColor: '#FFDD00',
                toolbarColor: '#0C0C0E',
            });
        } catch (error) {
            console.error('Error opening browser:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const coffeeRotate = coffeeAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['-3deg', '3deg', '-3deg'],
    });

    const steamOpacity = coffeeAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.8, 0.3],
    });

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                >
                    {/* Header Gradient */}
                    <LinearGradient
                        colors={['#FFDD00', '#FF6B6B', '#C850C0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        {/* Close Button */}
                        <Pressable style={styles.closeButton} onPress={handleClose}>
                            <Ionicons name="close" size={24} color="rgba(0,0,0,0.6)" />
                        </Pressable>

                        {/* Animated Coffee Icon */}
                        <View style={styles.coffeeContainer}>
                            <Animated.View
                                style={[
                                    styles.steam,
                                    {
                                        opacity: steamOpacity,
                                        transform: [{
                                            translateY: coffeeAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, -8],
                                            })
                                        }],
                                    },
                                ]}
                            >
                                <Text style={styles.steamText}>~</Text>
                            </Animated.View>
                            <Animated.View style={{ transform: [{ rotate: coffeeRotate }] }}>
                                <Text style={styles.coffeeEmoji}>☕</Text>
                            </Animated.View>
                        </View>

                        <Text style={styles.headerTitle}>Apoiar o Projeto</Text>
                    </LinearGradient>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.tagline}>
                            Desenvolvido por Um Estudante,{'\n'}Para Estudantes.
                        </Text>

                        <Text style={styles.personalMessage}>
                            Olá! Sou o Imperador, o criador da Escola+. Esta app é mantida com muito café e código nas horas vagas.{'\n\n'}Se a app te ajuda nos estudos, paga-me um café! ☕ Isso ajuda a manter os servidores ligados e o projeto vivo.
                        </Text>

                        {/* Support Button */}
                        <Pressable
                            style={styles.supportButton}
                            onPress={handleSupport}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#FFDD00', '#FFBB00']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.supportButtonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <>
                                        <Text style={styles.supportButtonEmoji}>☕</Text>
                                        <Text style={styles.supportButtonText}>Apoiar com um Café</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </Pressable>

                        {/* Secondary Info */}
                        <View style={styles.infoRow}>
                            <Ionicons name="heart" size={14} color="#EF4444" />
                            <Text style={styles.infoText}>
                                Obrigado a todos os apoiantes! 💛
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: SPACING.xl,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    headerGradient: {
        paddingTop: SPACING.xl,
        paddingBottom: SPACING['2xl'],
        alignItems: 'center',
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coffeeContainer: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    steam: {
        position: 'absolute',
        top: -16,
    },
    steamText: {
        fontSize: 24,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '200',
    },
    coffeeEmoji: {
        fontSize: 64,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#000',
        textAlign: 'center',
    },
    content: {
        padding: SPACING.xl,
    },
    tagline: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
        lineHeight: 26,
    },
    personalMessage: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    supportButton: {
        marginBottom: SPACING.lg,
    },
    supportButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.xl,
        gap: SPACING.sm,
    },
    supportButtonEmoji: {
        fontSize: 20,
    },
    supportButtonText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#000',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
    },
    infoText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
});

export default SupportModal;
