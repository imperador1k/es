/**
 * Pomodoro Timer Screen
 * Timer gamificado com Foco Total e recompensas XP
 */

import { formatTime, getProgress, PomodoroMode, usePomodoro } from '@/hooks/usePomodoro';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

// ============================================
// CONSTANTS
// ============================================

const CIRCLE_SIZE = 280;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MODE_CONFIG: Record<PomodoroMode, { label: string; emoji: string; color: string; gradient: [string, string] }> = {
    focus: {
        label: 'Foco',
        emoji: '🎯',
        color: '#EF4444',
        gradient: ['#EF4444', '#DC2626'],
    },
    shortBreak: {
        label: 'Pausa Curta',
        emoji: '☕',
        color: '#10B981',
        gradient: ['#10B981', '#059669'],
    },
    longBreak: {
        label: 'Pausa Longa',
        emoji: '🌟',
        color: '#6366F1',
        gradient: ['#6366F1', '#4F46E5'],
    },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function PomodoroScreen() {
    // Keep screen awake while on this screen
    useKeepAwake();

    const { profile } = useProfile();
    const userId = profile?.id;

    const {
        mode,
        isRunning,
        isPaused,
        timeRemaining,
        focusTotalEnabled,
        sessionsCompleted,
        showCompletionModal,
        lastSessionXP,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        skipToNext,
        changeMode,
        toggleFocusTotal,
        dismissCompletionModal,
        modeDurations,
    } = usePomodoro(userId);

    // Mode configuration
    const modeConfig = MODE_CONFIG[mode];
    const totalDuration = modeDurations[mode];
    const progress = getProgress(timeRemaining, totalDuration);
    const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

    // Open system focus/DND settings
    const openFocusSettings = useCallback(() => {
        if (Platform.OS === 'android') {
            // Open Do Not Disturb settings on Android
            Linking.openSettings();
        } else {
            // iOS - try to open Focus settings (may not work on all versions)
            Linking.openURL('App-Prefs:FOCUS').catch(() => {
                Linking.openSettings();
            });
        }
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Pomodoro</Text>
                <View style={styles.sessionsCounter}>
                    <Ionicons name="flame" size={18} color={colors.warning.primary} />
                    <Text style={styles.sessionsText}>{sessionsCompleted}</Text>
                </View>
            </View>

            {/* Mode Tabs */}
            <View style={styles.modeTabs}>
                {(Object.keys(MODE_CONFIG) as PomodoroMode[]).map((m) => (
                    <Pressable
                        key={m}
                        style={[
                            styles.modeTab,
                            mode === m && { backgroundColor: MODE_CONFIG[m].color + '20' },
                        ]}
                        onPress={() => changeMode(m)}
                        disabled={isRunning}
                    >
                        <Text style={styles.modeEmoji}>{MODE_CONFIG[m].emoji}</Text>
                        <Text
                            style={[
                                styles.modeLabel,
                                mode === m && { color: MODE_CONFIG[m].color, fontWeight: typography.weight.semibold },
                            ]}
                        >
                            {MODE_CONFIG[m].label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Timer Circle */}
            <View style={styles.timerContainer}>
                <View style={styles.timerCircle}>
                    {/* Background Circle */}
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svgContainer}>
                        <Circle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            stroke={colors.surfaceSubtle}
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                        />
                        {/* Progress Circle */}
                        <Circle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            stroke={modeConfig.color}
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                            strokeLinecap="round"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={strokeDashoffset}
                            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                        />
                    </Svg>

                    {/* Timer Text */}
                    <View style={styles.timerTextContainer}>
                        <Text style={[styles.timerText, { color: modeConfig.color }]}>
                            {formatTime(timeRemaining)}
                        </Text>
                        <Text style={styles.modeIndicator}>
                            {modeConfig.emoji} {modeConfig.label}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                {/* Stop Button */}
                <Pressable
                    style={[styles.controlButton, styles.secondaryButton, (isRunning || isPaused) && styles.dangerButton]}
                    onPress={isRunning || isPaused ? stopTimer : resetTimer}
                >
                    <Ionicons
                        name={isRunning || isPaused ? 'stop' : 'refresh'}
                        size={24}
                        color={isRunning || isPaused ? colors.danger.primary : colors.text.secondary}
                    />
                </Pressable>

                {/* Play/Pause Button */}
                <Pressable
                    style={[styles.controlButton, styles.primaryButton]}
                    onPress={isRunning ? pauseTimer : isPaused ? resumeTimer : startTimer}
                >
                    <LinearGradient
                        colors={modeConfig.gradient}
                        style={styles.primaryButtonGradient}
                    >
                        <Ionicons
                            name={isRunning ? 'pause' : 'play'}
                            size={36}
                            color="#FFFFFF"
                        />
                    </LinearGradient>
                </Pressable>

                {/* Skip Button */}
                <Pressable
                    style={[styles.controlButton, styles.secondaryButton]}
                    onPress={skipToNext}
                >
                    <Ionicons name="play-forward" size={24} color={colors.text.secondary} />
                </Pressable>
            </View>

            {/* Focus Total Section */}
            {mode === 'focus' && (
                <View style={styles.focusTotalSection}>
                    <View style={styles.focusTotalCard}>
                        <View style={styles.focusTotalHeader}>
                            <View style={styles.focusTotalLeft}>
                                <Ionicons
                                    name="shield-checkmark"
                                    size={24}
                                    color={focusTotalEnabled ? colors.success.primary : colors.text.tertiary}
                                />
                                <View>
                                    <Text style={styles.focusTotalTitle}>Foco Total</Text>
                                    <Text style={styles.focusTotalSubtitle}>
                                        {focusTotalEnabled ? '+20 XP bónus' : 'Ativa para bónus XP'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={focusTotalEnabled}
                                onValueChange={toggleFocusTotal}
                                trackColor={{ false: colors.surfaceSubtle, true: colors.success.light }}
                                thumbColor={focusTotalEnabled ? colors.success.primary : '#f4f3f4'}
                                disabled={isRunning}
                            />
                        </View>

                        {focusTotalEnabled && (
                            <Pressable style={styles.focusSettingsButton} onPress={openFocusSettings}>
                                <Ionicons name="phone-portrait-outline" size={20} color={colors.accent.primary} />
                                <Text style={styles.focusSettingsText}>
                                    Abrir Modo Não Incomodar
                                </Text>
                                <Ionicons name="open-outline" size={16} color={colors.accent.primary} />
                            </Pressable>
                        )}
                    </View>
                </View>
            )}

            {/* XP Info */}
            <View style={styles.xpInfo}>
                <View style={styles.xpCard}>
                    <Ionicons name="flash" size={20} color={colors.accent.primary} />
                    <Text style={styles.xpText}>
                        {mode === 'focus'
                            ? focusTotalEnabled
                                ? '+50 XP ao completar'
                                : '+30 XP ao completar'
                            : 'Pausas não dão XP'}
                    </Text>
                </View>
            </View>

            {/* Completion Modal */}
            <CompletionModal
                visible={showCompletionModal}
                xpEarned={lastSessionXP}
                focusTotalEnabled={focusTotalEnabled}
                sessionsCompleted={sessionsCompleted}
                onDismiss={dismissCompletionModal}
            />
        </SafeAreaView>
    );
}

// ============================================
// COMPLETION MODAL
// ============================================

function CompletionModal({
    visible,
    xpEarned,
    focusTotalEnabled,
    sessionsCompleted,
    onDismiss,
}: {
    visible: boolean;
    xpEarned: number;
    focusTotalEnabled: boolean;
    sessionsCompleted: number;
    onDismiss: () => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalEmoji}>
                        <Text style={styles.bigEmoji}>🎉</Text>
                    </View>

                    <Text style={styles.modalTitle}>Sessão Completa!</Text>
                    <Text style={styles.modalSubtitle}>Excelente foco, continua assim!</Text>

                    <View style={styles.modalXPContainer}>
                        <LinearGradient
                            colors={['#6366F1', '#4F46E5']}
                            style={styles.modalXPBadge}
                        >
                            <Ionicons name="flash" size={24} color="#FFFFFF" />
                            <Text style={styles.modalXPText}>+{xpEarned} XP</Text>
                        </LinearGradient>

                        {focusTotalEnabled && (
                            <View style={styles.bonusBadge}>
                                <Ionicons name="shield-checkmark" size={14} color={colors.success.primary} />
                                <Text style={styles.bonusText}>Bónus Foco Total!</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.modalStats}>
                        <View style={styles.modalStat}>
                            <Text style={styles.modalStatValue}>{sessionsCompleted}</Text>
                            <Text style={styles.modalStatLabel}>Sessões hoje</Text>
                        </View>
                        <View style={styles.modalStatDivider} />
                        <View style={styles.modalStat}>
                            <Text style={styles.modalStatValue}>{sessionsCompleted * 25}</Text>
                            <Text style={styles.modalStatLabel}>Minutos de foco</Text>
                        </View>
                    </View>

                    <Pressable style={styles.modalButton} onPress={onDismiss}>
                        <Text style={styles.modalButtonText}>Fazer uma Pausa ☕</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    sessionsCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.warning.light,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    sessionsText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.warning.dark,
    },

    // Mode Tabs
    modeTabs: {
        flexDirection: 'row',
        marginHorizontal: spacing.xl,
        marginBottom: spacing['2xl'],
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.xs,
        ...shadows.sm,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    modeEmoji: {
        fontSize: 16,
    },
    modeLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },

    // Timer
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: spacing['2xl'],
    },
    timerCircle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        position: 'relative',
    },
    svgContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    timerTextContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 56,
        fontWeight: typography.weight.bold,
        fontVariant: ['tabular-nums'],
    },
    modeIndicator: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        marginTop: spacing.sm,
    },

    // Controls
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
        marginBottom: spacing['2xl'],
    },
    controlButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.surface,
        ...shadows.md,
    },
    primaryButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        ...shadows.lg,
    },
    dangerButton: {
        borderWidth: 2,
        borderColor: colors.danger.light,
        backgroundColor: colors.danger.light,
    },
    primaryButtonGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Focus Total
    focusTotalSection: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
    },
    focusTotalCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.sm,
    },
    focusTotalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    focusTotalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    focusTotalTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    focusTotalSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    focusSettingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.accent.light,
        borderRadius: borderRadius.md,
    },
    focusSettingsText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
    },

    // XP Info
    xpInfo: {
        paddingHorizontal: spacing.xl,
    },
    xpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.light,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    xpText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.accent.dark,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        padding: spacing['3xl'],
        alignItems: 'center',
    },
    modalEmoji: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.warning.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    bigEmoji: {
        fontSize: 40,
    },
    modalTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
    },
    modalXPContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalXPBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.full,
    },
    modalXPText: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: '#FFFFFF',
    },
    bonusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        backgroundColor: colors.success.light,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    bonusText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.success.dark,
    },
    modalStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalStat: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    modalStatValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    modalStatLabel: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },
    modalStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.divider,
    },
    modalButton: {
        width: '100%',
        backgroundColor: colors.success.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFFFFF',
    },
});
