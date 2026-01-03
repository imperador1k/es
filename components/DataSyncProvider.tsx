/**
 * 🔄 DataSyncProvider - Componente que faz prefetch de dados ao login
 * Mostra loading enquanto carrega dados para cache offline
 */

import { usePrefetchData } from '@/hooks/usePrefetchData';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface DataSyncProviderProps {
    children: React.ReactNode;
    showLoadingScreen?: boolean; // Se true, mostra loading screen durante sync
}

export function DataSyncProvider({ children, showLoadingScreen = false }: DataSyncProviderProps) {
    const { isLoading, progress, currentTask, isComplete, error } = usePrefetchData();

    // Se não quer loading screen, só executa o prefetch em background
    if (!showLoadingScreen) {
        return <>{children}</>;
    }

    // Enquanto carrega, mostra loading screen
    if (isLoading && !isComplete) {
        return <DataSyncLoadingScreen progress={progress} currentTask={currentTask} />;
    }

    return <>{children}</>;
}

// ============================================
// LOADING SCREEN COMPONENT
// ============================================

function DataSyncLoadingScreen({ progress, currentTask }: { progress: number; currentTask: string }) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.background, COLORS.surface]}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                {/* Logo */}
                <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        style={styles.logo}
                    >
                        <Ionicons name="flash" size={40} color="#FFF" />
                    </LinearGradient>
                </Animated.View>

                <Text style={styles.title}>Escola+</Text>
                <Text style={styles.subtitle}>A sincronizar dados...</Text>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        >
                            <LinearGradient
                                colors={['#4F46E5', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                </View>

                {/* Current Task */}
                <View style={styles.taskContainer}>
                    <Ionicons name="sync" size={16} color={COLORS.accent.primary} />
                    <Text style={styles.taskText}>{currentTask}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },

    // Logo
    logoContainer: {
        marginBottom: SPACING.xl,
    },
    logo: {
        width: 88,
        height: 88,
        borderRadius: RADIUS['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
    },

    title: {
        fontSize: 28,
        fontWeight: '700' as const,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        marginBottom: SPACING['2xl'],
    },

    // Progress
    progressContainer: {
        width: '100%',
        maxWidth: 280,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    progressTrack: {
        flex: 1,
        height: 8,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '600' as const,
        color: COLORS.accent.primary,
        width: 40,
        textAlign: 'right',
    },

    // Task
    taskContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.xl,
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
    },
    taskText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
});

export default DataSyncProvider;
