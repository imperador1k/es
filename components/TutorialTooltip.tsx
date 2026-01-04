
import { RADIUS, SPACING } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCopilot } from 'react-native-copilot';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// STEP CONFIGURATION (8 Steps)
// ============================================

const STEP_CONFIG: Record<number, { emoji: string; title: string; color: string; route?: string; stepName?: string }> = {
    1: { emoji: '👋', title: 'Bem-vindo!', color: '#6366F1', stepName: 'home_welcome' },
    2: { emoji: '✨', title: 'Ações Rápidas', color: '#8B5CF6', stepName: 'home_fab' },
    3: { emoji: '💬', title: 'Social Hub', color: '#EC4899', stepName: 'tab_chat' },
    4: { emoji: '🏆', title: 'O Teu Perfil', color: '#F59E0B', stepName: 'tab_profile' },
    5: { emoji: '📅', title: 'Calendário', color: '#10B981', route: '/(tabs)/calendar', stepName: 'calendar_view' },
    6: { emoji: '📝', title: 'Planner', color: '#3B82F6', route: '/(tabs)/planner', stepName: 'planner_view' },
    7: { emoji: '⏰', title: 'Horário', color: '#F97316', route: '/(tabs)/schedule', stepName: 'schedule_view' },
    8: { emoji: '📚', title: 'Disciplinas', color: '#8B5CF6', route: '/(tabs)/subjects', stepName: 'subjects_view' },
};

const TOTAL_STEPS = Object.keys(STEP_CONFIG).length;

// ============================================
// TOOLTIP COMPONENT
// ============================================

export const TutorialTooltip = () => {
    const { isFirstStep, isLastStep, goToNext, goToPrev, goToNth, start, stop, currentStep, totalStepsNumber } = useCopilot();

    // Animations
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.5);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withSpring(1.02, { damping: 10 }),
                withSpring(1, { damping: 10 })
            ),
            -1,
            true
        );
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 1500 }),
                withTiming(0.4, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const animatedGlowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    if (!currentStep) return null;

    const stepOrder = currentStep.order || 1;
    const stepInfo = STEP_CONFIG[stepOrder] || STEP_CONFIG[1];
    const total = TOTAL_STEPS; // Use our constant, not copilot's count (which only sees mounted steps)
    const progress = (stepOrder / total) * 100;
    const isLast = stepOrder >= TOTAL_STEPS;

    // Handle next with navigation
    const handleNext = () => {
        const nextStepOrder = stepOrder + 1;
        const nextConfig = STEP_CONFIG[nextStepOrder];

        if (nextConfig?.route) {
            // Navigate to the page first
            router.push(nextConfig.route as any);

            // Wait for page to mount, then restart tour from that step
            setTimeout(() => {
                // start() with step name to begin from specific step
                start(nextConfig.stepName);
            }, 800);
        } else {
            goToNext();
        }
    };

    const handleFinish = () => {
        stop();
        router.push('/(tabs)');
    };

    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.wrapper}>
            {/* Outer Glow */}
            <Animated.View style={[styles.glowOuter, animatedGlowStyle, { shadowColor: stepInfo.color }]} />

            {/* Main Container */}
            <LinearGradient
                colors={['#0f0f1a', '#1a1a2e', '#16213e']}
                style={styles.container}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Corner Accents */}
                <View style={[styles.cornerAccent, styles.topLeft, { backgroundColor: stepInfo.color }]} />
                <View style={[styles.cornerAccent, styles.topRight, { backgroundColor: stepInfo.color }]} />

                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={[stepInfo.color, `${stepInfo.color}AA`]}
                        style={styles.stepBadge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.stepBadgeText}>PASSO {stepOrder}/{total}</Text>
                    </LinearGradient>

                    <TouchableOpacity onPress={stop} style={styles.closeBtn}>
                        <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.content}>
                    <View style={styles.emojiRow}>
                        <View style={[styles.emojiGlow, { backgroundColor: `${stepInfo.color}30` }]}>
                            <View style={[styles.emojiCircle, { borderColor: stepInfo.color }]}>
                                <Text style={styles.emoji}>{stepInfo.emoji}</Text>
                            </View>
                        </View>

                        <View style={styles.titleBlock}>
                            <Text style={styles.title}>{stepInfo.title}</Text>
                        </View>
                    </View>

                    <Text style={styles.description}>{currentStep.text}</Text>
                </Animated.View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                        <LinearGradient
                            colors={[stepInfo.color, `${stepInfo.color}CC`]}
                            style={[styles.progressFill, { width: `${progress}%` }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {!isFirstStep ? (
                        <TouchableOpacity onPress={goToPrev} style={styles.backBtn}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                style={styles.backBtnInner}
                            >
                                <Ionicons name="chevron-back" size={22} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 50 }} />
                    )}

                    <Animated.View style={[{ flex: 1 }, animatedButtonStyle]}>
                        <TouchableOpacity onPress={isLast ? handleFinish : handleNext} activeOpacity={0.8}>
                            <LinearGradient
                                colors={isLast ? ['#10B981', '#059669'] : [stepInfo.color, `${stepInfo.color}CC`]}
                                style={styles.nextBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.nextBtnText}>
                                    {isLast ? '🎉 Começar!' : 'Próximo'}
                                </Text>
                                {!isLast && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    wrapper: {
        width: 320,
        maxWidth: SCREEN_WIDTH - 40,
    },
    glowOuter: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 24,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 25,
        shadowOpacity: 1,
        elevation: 15,
    },
    container: {
        borderRadius: 20,
        padding: 18,
        overflow: 'hidden',
    },
    cornerAccent: {
        position: 'absolute',
        width: 35,
        height: 3,
        borderRadius: 2,
    },
    topLeft: { top: 0, left: 18 },
    topRight: { top: 0, right: 18 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    stepBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    stepBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        marginBottom: SPACING.md,
    },
    emojiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        gap: 12,
    },
    emojiGlow: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiCircle: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 22,
    },
    titleBlock: {
        flex: 1,
    },
    title: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    description: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        lineHeight: 20,
    },
    progressContainer: {
        marginBottom: SPACING.md,
    },
    progressTrack: {
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    backBtn: {
        width: 46,
        height: 46,
    },
    backBtnInner: {
        width: '100%',
        height: '100%',
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    nextBtn: {
        flexDirection: 'row',
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.lg,
        gap: 6,
    },
    nextBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
