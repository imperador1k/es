import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    visible: boolean;
    message: string;
    type?: ToastType;
    onHide: () => void;
    duration?: number;
}

const TOAST_CONFIG = {
    success: {
        icon: 'checkmark-circle' as const,
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.2)',
    },
    error: {
        icon: 'alert-circle' as const,
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.2)',
    },
    info: {
        icon: 'information-circle' as const,
        color: '#6366F1',
        bg: 'rgba(99, 102, 241, 0.1)',
        border: 'rgba(99, 102, 241, 0.2)',
    },
};

export function Toast({ visible, message, type = 'info', onHide, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(onHide, duration);
            return () => clearTimeout(timer);
        }
    }, [visible, duration, onHide]);

    if (!visible) return null;

    const config = TOAST_CONFIG[type];

    return (
        <Animated.View
            entering={FadeInUp.springify()}
            exiting={FadeOutUp}
            style={styles.container}
        >
            <BlurView intensity={80} tint="dark" style={styles.blur}>
                <View style={[styles.content, { backgroundColor: config.bg, borderColor: config.border }]}>
                    <Ionicons name={config.icon} size={24} color={config.color} />
                    <Text style={styles.message}>{message}</Text>
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: SPACING.lg,
        right: SPACING.lg,
        zIndex: 9999,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    blur: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
        borderWidth: 1,
        borderRadius: RADIUS['2xl'],
    },
    message: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
});
