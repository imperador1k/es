import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

// ============================================
// CONTEXT & PROVIDER
// ============================================

type ToastContextType = {
    toast: {
        success: (msg: string) => void;
        error: (msg: string) => void;
        info: (msg: string) => void;
    }
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<{ visible: boolean; message: string; type: ToastType }>({
        visible: false,
        message: '',
        type: 'info'
    });

    const hide = useCallback(() => {
        setConfig(prev => ({ ...prev, visible: false }));
    }, []);

    const show = useCallback((message: string, type: ToastType) => {
        setConfig({ visible: true, message, type });
        // Auto hide handled by Toast component or here? 
        // Toast component handles timeout via useEffect, but logic is split.
        // It's safer to handle timeout here if we want queueing, but simple replacement is fine.
    }, []);

    const toastFuncs = {
        success: (msg: string) => show(msg, 'success'),
        error: (msg: string) => show(msg, 'error'),
        info: (msg: string) => show(msg, 'info')
    };

    return (
        <ToastContext.Provider value={{ toast: toastFuncs }}>
            {children}
            <Toast
                visible={config.visible}
                message={config.message}
                type={config.type}
                onHide={hide}
            />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

// ============================================
// UI COMPONENT
// ============================================

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
