import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    centered?: boolean;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, centered = true }: EmptyStateProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(fadeAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 20,
            friction: 7
        }).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.container,
                centered && styles.centered,
                { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }
            ]}
        >
            <View style={styles.iconContainer}>
                {/* Glow Effect */}
                <View style={styles.glow} />

                <BlurView intensity={20} tint="dark" style={styles.iconBlur}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                        style={styles.iconGradient}
                    >
                        <Ionicons name={icon} size={32} color={COLORS.text.secondary} />
                    </LinearGradient>
                </BlurView>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {actionLabel && onAction && (
                <Pressable
                    style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                    onPress={onAction}
                >
                    <BlurView intensity={30} tint="dark" style={styles.buttonBlur}>
                        <Text style={styles.buttonText}>{actionLabel}</Text>
                        <Ionicons name="arrow-forward" size={16} color={COLORS.accent.primary} />
                    </BlurView>
                </Pressable>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: SPACING['2xl'],
        alignItems: 'center',
        maxWidth: 400,
        alignSelf: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
    },

    // Icon
    iconContainer: {
        width: 80,
        height: 80,
        marginBottom: SPACING.xl,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBlur: {
        width: 80,
        height: 80,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        ...SHADOWS.md,
    },
    iconGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.accent.primary,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
        zIndex: -1,
    },

    // Text
    title: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: TYPOGRAPHY.size.md,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },

    // Button
    button: {
        borderRadius: 100,
        overflow: 'hidden',
    },
    buttonPressed: {
        opacity: 0.8,
    },
    buttonBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    buttonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.accent.primary,
    },
});
