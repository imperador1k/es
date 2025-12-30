/**
 * Premium Pomodoro Timer
 * Design ultra-premium com animações e gamificação
 */

import { formatTime, getProgress, PomodoroMode, usePomodoro } from '@/hooks/usePomodoro';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// CONSTANTS
// ============================================

const CIRCLE_SIZE = SCREEN_WIDTH * 0.75;
const STROKE_WIDTH = 14;
const TIMER_RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

const MODE_CONFIG: Record<PomodoroMode, { label: string; emoji: string; color: string; gradient: [string, string]; bgGradient: [string, string] }> = {
    focus: {
        label: 'Foco',
        emoji: '🎯',
        color: '#EF4444',
        gradient: ['#EF4444', '#DC2626'],
        bgGradient: ['#EF444415', '#DC262605'],
    },
    shortBreak: {
        label: 'Pausa',
        emoji: '☕',
        color: '#10B981',
        gradient: ['#10B981', '#059669'],
        bgGradient: ['#10B98115', '#05966905'],
    },
    longBreak: {
        label: 'Descanso',
        emoji: '🌟',
        color: '#6366F1',
        gradient: ['#6366F1', '#4F46E5'],
        bgGradient: ['#6366F115', '#4F46E505'],
    },
};

// ============================================
// ANIMATED COMPONENTS
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// MAIN COMPONENT
// ============================================

export default function PomodoroScreen() {
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

    const modeConfig = MODE_CONFIG[mode];
    const totalDuration = modeDurations[mode];
    const progress = getProgress(timeRemaining, totalDuration);
    const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

    const openFocusSettings = useCallback(() => {
        if (Platform.OS === 'android') {
            Linking.openSettings();
        } else {
            Linking.openURL('App-Prefs:FOCUS').catch(() => Linking.openSettings());
        }
    }, []);

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={modeConfig.bgGradient}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.5 }}
            />

            {/* ========== HEADER ========== */}
            <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Modo Foco</Text>
                <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={16} color="#F59E0B" />
                    <Text style={styles.streakText}>{sessionsCompleted}</Text>
                </View>
            </Animated.View>

            {/* ========== MODE TABS ========== */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.modeTabs}>
                {(Object.keys(MODE_CONFIG) as PomodoroMode[]).map((m) => {
                    const isActive = mode === m;
                    return (
                        <Pressable
                            key={m}
                            style={[styles.modeTab, isActive && { backgroundColor: MODE_CONFIG[m].color }]}
                            onPress={() => changeMode(m)}
                            disabled={isRunning}
                        >
                            <Text style={styles.modeEmoji}>{MODE_CONFIG[m].emoji}</Text>
                            <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                                {MODE_CONFIG[m].label}
                            </Text>
                        </Pressable>
                    );
                })}
            </Animated.View>

            {/* ========== TIMER CIRCLE ========== */}
            <Animated.View entering={ZoomIn.delay(200).springify()} style={styles.timerContainer}>
                <View style={styles.timerOuter}>
                    {/* Glow Effect */}
                    <View style={[styles.timerGlow, { backgroundColor: modeConfig.color, opacity: isRunning ? 0.3 : 0.1 }]} />

                    {/* SVG Circle */}
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svgContainer}>
                        <Defs>
                            <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor={modeConfig.gradient[0]} />
                                <Stop offset="100%" stopColor={modeConfig.gradient[1]} />
                            </SvgGradient>
                        </Defs>
                        {/* Background Circle */}
                        <Circle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={TIMER_RADIUS}
                            stroke={COLORS.surfaceMuted}
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                        />
                        {/* Progress Circle */}
                        <Circle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={TIMER_RADIUS}
                            stroke="url(#progressGradient)"
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                            strokeLinecap="round"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={strokeDashoffset}
                            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                        />
                    </Svg>

                    {/* Timer Content */}
                    <View style={styles.timerContent}>
                        <Text style={[styles.timerText, { color: modeConfig.color }]}>
                            {formatTime(timeRemaining)}
                        </Text>
                        <View style={styles.modeIndicator}>
                            <Text style={styles.modeIndicatorEmoji}>{modeConfig.emoji}</Text>
                            <Text style={[styles.modeIndicatorText, { color: modeConfig.color }]}>{modeConfig.label}</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

            {/* ========== CONTROLS ========== */}
            <Animated.View entering={FadeInUp.delay(300)} style={styles.controls}>
                {/* Stop/Reset */}
                <Pressable
                    style={[styles.controlButton, styles.secondaryControl]}
                    onPress={isRunning || isPaused ? stopTimer : resetTimer}
                >
                    <Ionicons
                        name={isRunning || isPaused ? 'stop' : 'refresh'}
                        size={24}
                        color={isRunning || isPaused ? '#EF4444' : COLORS.text.secondary}
                    />
                </Pressable>

                {/* Play/Pause - Main */}
                <Pressable
                    style={styles.mainControl}
                    onPress={isRunning ? pauseTimer : isPaused ? resumeTimer : startTimer}
                >
                    <LinearGradient colors={modeConfig.gradient} style={styles.mainControlGradient}>
                        <Ionicons name={isRunning ? 'pause' : 'play'} size={40} color="#FFF" />
                    </LinearGradient>
                </Pressable>

                {/* Skip */}
                <Pressable style={[styles.controlButton, styles.secondaryControl]} onPress={skipToNext}>
                    <Ionicons name="play-forward" size={24} color={COLORS.text.secondary} />
                </Pressable>
            </Animated.View>

            {/* ========== FOCUS TOTAL (only for focus mode) ========== */}
            {mode === 'focus' && (
                <Animated.View entering={FadeInUp.delay(400)} style={styles.focusSection}>
                    <View style={styles.focusCard}>
                        <View style={styles.focusHeader}>
                            <View style={styles.focusLeft}>
                                <View style={[styles.focusIcon, { backgroundColor: focusTotalEnabled ? '#10B98120' : COLORS.surfaceMuted }]}>
                                    <Ionicons name="shield-checkmark" size={22} color={focusTotalEnabled ? '#10B981' : COLORS.text.tertiary} />
                                </View>
                                <View>
                                    <Text style={styles.focusTitle}>Foco Total</Text>
                                    <Text style={styles.focusSubtitle}>
                                        {focusTotalEnabled ? 'Bónus +20 XP ativo' : 'Ativa para bónus XP'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={focusTotalEnabled}
                                onValueChange={toggleFocusTotal}
                                trackColor={{ false: COLORS.surfaceMuted, true: '#10B981' }}
                                thumbColor="#FFF"
                                disabled={isRunning}
                            />
                        </View>

                        {focusTotalEnabled && (
                            <Pressable style={styles.dndButton} onPress={openFocusSettings}>
                                <Ionicons name="phone-portrait-outline" size={18} color="#6366F1" />
                                <Text style={styles.dndText}>Abrir Não Incomodar</Text>
                                <Ionicons name="open-outline" size={14} color="#6366F1" />
                            </Pressable>
                        )}
                    </View>
                </Animated.View>
            )}

            {/* ========== XP INFO ========== */}
            <Animated.View entering={FadeInUp.delay(500)} style={styles.xpSection}>
                <View style={styles.xpCard}>
                    <Ionicons name="flash" size={18} color="#FFD700" />
                    <Text style={styles.xpText}>
                        {mode === 'focus'
                            ? focusTotalEnabled
                                ? '+50 XP ao completar'
                                : '+30 XP ao completar'
                            : 'Pausas não dão XP'}
                    </Text>
                </View>
            </Animated.View>

            {/* ========== COMPLETION MODAL ========== */}
            <CompletionModal
                visible={showCompletionModal}
                xpEarned={lastSessionXP}
                focusTotalEnabled={focusTotalEnabled}
                sessionsCompleted={sessionsCompleted}
                modeColor={modeConfig.color}
                onDismiss={dismissCompletionModal}
            />
        </View>
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
    modeColor,
    onDismiss,
}: {
    visible: boolean;
    xpEarned: number;
    focusTotalEnabled: boolean;
    sessionsCompleted: number;
    modeColor: string;
    onDismiss: () => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <Animated.View entering={ZoomIn.springify()} style={styles.modalContent}>
                    {/* Celebration Emoji */}
                    <View style={styles.modalEmojiContainer}>
                        <Text style={styles.modalEmoji}>🎉</Text>
                    </View>

                    <Text style={styles.modalTitle}>Excelente!</Text>
                    <Text style={styles.modalSubtitle}>Sessão de foco concluída</Text>

                    {/* XP Badge */}
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.modalXpBadge}>
                        <Ionicons name="flash" size={28} color="#FFD700" />
                        <Text style={styles.modalXpText}>+{xpEarned} XP</Text>
                    </LinearGradient>

                    {focusTotalEnabled && (
                        <View style={styles.modalBonus}>
                            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                            <Text style={styles.modalBonusText}>Bónus Foco Total incluído!</Text>
                        </View>
                    )}

                    {/* Stats */}
                    <View style={styles.modalStats}>
                        <View style={styles.modalStat}>
                            <Text style={styles.modalStatValue}>{sessionsCompleted}</Text>
                            <Text style={styles.modalStatLabel}>Sessões</Text>
                        </View>
                        <View style={styles.modalStatDivider} />
                        <View style={styles.modalStat}>
                            <Text style={styles.modalStatValue}>{sessionsCompleted * 25}m</Text>
                            <Text style={styles.modalStatLabel}>Foco Total</Text>
                        </View>
                    </View>

                    {/* Continue Button */}
                    <Pressable style={styles.modalButton} onPress={onDismiss}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.modalButtonGradient}>
                            <Text style={styles.modalButtonText}>Continuar</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
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
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F59E0B20',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    streakText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#F59E0B',
    },

    // Mode Tabs
    modeTabs: {
        flexDirection: 'row',
        marginHorizontal: LAYOUT.screenPadding,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: 4,
        marginBottom: SPACING.xl,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.xl,
    },
    modeEmoji: {
        fontSize: 16,
    },
    modeLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    modeLabelActive: {
        color: '#FFF',
        fontWeight: TYPOGRAPHY.weight.bold,
    },

    // Timer
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: SPACING.xl,
    },
    timerOuter: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerGlow: {
        position: 'absolute',
        width: CIRCLE_SIZE + 40,
        height: CIRCLE_SIZE + 40,
        borderRadius: (CIRCLE_SIZE + 40) / 2,
    },
    svgContainer: {
        position: 'absolute',
    },
    timerContent: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 64,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: -2,
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    modeIndicatorEmoji: {
        fontSize: 18,
    },
    modeIndicatorText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },

    // Controls
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    controlButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryControl: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.surface,
        ...SHADOWS.sm,
    },
    mainControl: {
        ...SHADOWS.lg,
    },
    mainControlGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Focus Section
    focusSection: {
        paddingHorizontal: LAYOUT.screenPadding,
        marginBottom: SPACING.lg,
    },
    focusCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    focusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    focusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    focusIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    focusTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    focusSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    dndButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.lg,
        paddingVertical: SPACING.md,
        backgroundColor: '#6366F110',
        borderRadius: RADIUS.xl,
    },
    dndText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#6366F1',
    },

    // XP Section
    xpSection: {
        paddingHorizontal: LAYOUT.screenPadding,
    },
    xpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.full,
    },
    xpText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: LAYOUT.screenPadding,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['3xl'],
        padding: SPACING['2xl'],
        alignItems: 'center',
        width: '100%',
    },
    modalEmojiContainer: {
        marginBottom: SPACING.lg,
    },
    modalEmoji: {
        fontSize: 64,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    modalSubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xl,
    },
    modalXpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS['2xl'],
        marginBottom: SPACING.md,
    },
    modalXpText: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    modalBonus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: '#10B98120',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.xl,
    },
    modalBonusText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: '#10B981',
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    modalStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalStat: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    modalStatValue: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    modalStatLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    modalStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.surfaceMuted,
    },
    modalButton: {
        width: '100%',
    },
    modalButtonGradient: {
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
});
