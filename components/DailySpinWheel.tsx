/**
 * Daily Spin Wheel Component
 * Roda da sorte diária com animação suave
 * Usa react-native-reanimated para animações e SVG para desenho
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

// ============================================
// TYPES & CONFIG
// ============================================

interface Prize {
    label: string;
    color: string;
    textColor: string;
}

const PRIZES: Prize[] = [
    { label: '+5 XP', color: '#10B981', textColor: '#FFF' },       // Green - Comum
    { label: '+10 XP', color: '#3B82F6', textColor: '#FFF' },      // Blue - Comum
    { label: '+15 XP', color: '#8B5CF6', textColor: '#FFF' },      // Purple - Médio
    { label: '+20 XP', color: '#F59E0B', textColor: '#FFF' },      // Amber - Raro
    { label: '+30 XP', color: '#EC4899', textColor: '#FFF' },      // Pink - Muito Raro
    { label: '🎉 50 XP', color: '#EF4444', textColor: '#FFF' },    // Red - JACKPOT
];

const WHEEL_SIZE = 300;
const NUM_SLICES = PRIZES.length;
const SLICE_ANGLE = 360 / NUM_SLICES;

// ============================================
// WHEEL SVG COMPONENT
// ============================================

function WheelSVG() {
    const radius = WHEEL_SIZE / 2;
    const centerX = radius;
    const centerY = radius;

    // Create path for each slice
    const createSlicePath = (index: number) => {
        const startAngle = index * SLICE_ANGLE - 90; // Start from top
        const endAngle = startAngle + SLICE_ANGLE;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);

        const largeArcFlag = SLICE_ANGLE > 180 ? 1 : 0;

        return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    // Calculate text position for each slice
    const getTextPosition = (index: number) => {
        const angle = index * SLICE_ANGLE + SLICE_ANGLE / 2 - 90;
        const rad = (angle * Math.PI) / 180;
        const textRadius = radius * 0.65;

        return {
            x: centerX + textRadius * Math.cos(rad),
            y: centerY + textRadius * Math.sin(rad),
            rotation: angle + 90,
        };
    };

    return (
        <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            {/* Outer ring shadow effect */}
            <G>
                {PRIZES.map((prize, index) => (
                    <Path
                        key={`slice-${index}`}
                        d={createSlicePath(index)}
                        fill={prize.color}
                        stroke="#FFF"
                        strokeWidth={2}
                    />
                ))}
            </G>

            {/* Prize labels */}
            <G>
                {PRIZES.map((prize, index) => {
                    const pos = getTextPosition(index);
                    return (
                        <SvgText
                            key={`text-${index}`}
                            x={pos.x}
                            y={pos.y}
                            fill={prize.textColor}
                            fontSize={14}
                            fontWeight="bold"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                        >
                            {prize.label}
                        </SvgText>
                    );
                })}
            </G>

            {/* Center circle */}
            <G>
                <Path
                    d={`M ${centerX - 30} ${centerY} A 30 30 0 1 1 ${centerX + 30} ${centerY} A 30 30 0 1 1 ${centerX - 30} ${centerY}`}
                    fill={colors.accent.primary}
                    stroke="#FFF"
                    strokeWidth={3}
                />
            </G>
        </Svg>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface DailySpinWheelProps {
    visible: boolean;
    onClose: () => void;
    onSpinComplete?: (xpEarned: number) => void;
}

export default function DailySpinWheel({ visible, onClose, onSpinComplete }: DailySpinWheelProps) {
    const { user } = useAuthContext();
    const { refetchProfile } = useProfile();

    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<{ message: string; amount: number } | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const rotation = useSharedValue(0);
    const buttonScale = useSharedValue(1);
    const resultOpacity = useSharedValue(0);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            rotation.value = 0;
            setResult(null);
            setShowConfetti(false);
        }
    }, [visible]);

    const handleSpin = useCallback(async () => {
        if (spinning || !user?.id) return;

        setSpinning(true);
        setResult(null);

        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Call RPC immediately
            const { data, error } = await supabase.rpc('spin_daily_wheel');

            if (error) throw error;

            const spinResult = data as {
                success: boolean;
                prize_index?: number;
                prize_amount?: number;
                message?: string;
                next_spin_at?: string;
            };

            if (!spinResult.success) {
                setResult({ message: spinResult.message || 'Já rodaste hoje!', amount: 0 });
                setSpinning(false);
                return;
            }

            // Calculate final rotation
            // We want to land on the prize_index
            // Each slice is SLICE_ANGLE degrees (60° for 6 slices)
            // Add random offset within the slice for natural feel
            const prizeIndex = spinResult.prize_index || 0;
            const randomOffset = Math.random() * (SLICE_ANGLE * 0.6) - SLICE_ANGLE * 0.3;

            // Spin at least 5 full rotations + land on prize
            // We need to calculate so the TOP pointer lands on the prize
            // Prize 0 is at the top, so we need to calculate the offset
            const targetAngle = -(prizeIndex * SLICE_ANGLE) + randomOffset;
            const totalRotation = 360 * 5 + targetAngle; // 5 full spins + target

            // Animate the wheel
            rotation.value = withSequence(
                // Fast spin
                withTiming(totalRotation * 0.7, {
                    duration: 2000,
                    easing: Easing.out(Easing.quad),
                }),
                // Slow down to final position
                withTiming(totalRotation, {
                    duration: 1500,
                    easing: Easing.out(Easing.exp),
                })
            );

            // Wait for animation to complete
            setTimeout(() => {
                // Strong haptic on land
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                setResult({
                    message: spinResult.message || '+XP',
                    amount: spinResult.prize_amount || 0,
                });

                // Show confetti for jackpot
                if (prizeIndex === 5) {
                    setShowConfetti(true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                resultOpacity.value = withSpring(1);
                setSpinning(false);

                // Refresh profile to update XP
                refetchProfile();

                if (spinResult.prize_amount && onSpinComplete) {
                    onSpinComplete(spinResult.prize_amount);
                }
            }, 3500);

        } catch (err: any) {
            console.error('Spin error:', err);
            setResult({ message: err?.message || 'Erro ao girar', amount: 0 });
            setSpinning(false);
        }
    }, [spinning, user?.id, refetchProfile, onSpinComplete]);

    const animatedWheelStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const handlePressIn = () => {
        buttonScale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        buttonScale.value = withSpring(1);
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <BlurView intensity={50} style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>🎰 Roda da Sorte</Text>
                        <Text style={styles.subtitle}>Gira uma vez por dia!</Text>
                        <Pressable style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text.primary} />
                        </Pressable>
                    </View>

                    {/* Wheel Container */}
                    <View style={styles.wheelContainer}>
                        {/* Pointer */}
                        <View style={styles.pointer}>
                            <Ionicons name="caret-down" size={40} color={colors.accent.primary} />
                        </View>

                        {/* Animated Wheel */}
                        <Animated.View style={[styles.wheel, animatedWheelStyle]}>
                            <WheelSVG />
                        </Animated.View>

                        {/* Outer ring glow */}
                        <View style={styles.outerRing} />
                    </View>

                    {/* Result */}
                    {result && (
                        <View style={styles.resultContainer}>
                            <Text style={[
                                styles.resultText,
                                result.amount >= 150 && styles.resultTextBig
                            ]}>
                                {result.message}
                            </Text>
                            {result.amount > 0 && (
                                <Text style={styles.resultSubtext}>
                                    XP adicionado à tua conta!
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Spin Button */}
                    <Animated.View style={animatedButtonStyle}>
                        <Pressable
                            style={[
                                styles.spinButton,
                                (spinning || result) && styles.spinButtonDisabled,
                            ]}
                            onPress={handleSpin}
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            disabled={spinning || !!result}
                        >
                            <Text style={styles.spinButtonText}>
                                {spinning ? '🎡 A GIRAR...' : result ? '✅ CONCLUÍDO' : '🎯 GIRAR!'}
                            </Text>
                        </Pressable>
                    </Animated.View>

                    {/* Done button after result */}
                    {result && (
                        <Pressable style={styles.doneButton} onPress={onClose}>
                            <Text style={styles.doneButtonText}>Fechar</Text>
                        </Pressable>
                    )}
                </View>

                {/* Confetti for jackpot */}
                {showConfetti && (
                    <View style={styles.confettiContainer}>
                        {/* Simple confetti animation using multiple animated views */}
                        {[...Array(20)].map((_, i) => (
                            <ConfettiPiece key={i} index={i} />
                        ))}
                    </View>
                )}
            </BlurView>
        </Modal>
    );
}

// Simple confetti piece component
function ConfettiPiece({ index }: { index: number }) {
    const translateY = useSharedValue(-50);
    const translateX = useSharedValue((Math.random() - 0.5) * Dimensions.get('window').width);
    const rotate = useSharedValue(0);

    useEffect(() => {
        translateY.value = withTiming(Dimensions.get('window').height + 100, {
            duration: 2000 + Math.random() * 1000,
            easing: Easing.linear,
        });
        rotate.value = withTiming(360 * (Math.random() > 0.5 ? 1 : -1), {
            duration: 2000,
        });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotate.value}deg` },
        ],
    }));

    const confettiColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    const color = confettiColors[index % confettiColors.length];

    return (
        <Animated.View
            style={[
                styles.confettiPiece,
                { backgroundColor: color, left: `${(index / 20) * 100}%` },
                animatedStyle,
            ]}
        />
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        padding: spacing.xl,
        alignItems: 'center',
        width: '90%',
        maxWidth: 380,
        ...shadows.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.lg,
        width: '100%',
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },
    closeButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        padding: spacing.sm,
    },
    wheelContainer: {
        position: 'relative',
        width: WHEEL_SIZE + 20,
        height: WHEEL_SIZE + 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pointer: {
        position: 'absolute',
        top: 0,
        zIndex: 10,
    },
    wheel: {
        width: WHEEL_SIZE,
        height: WHEEL_SIZE,
    },
    outerRing: {
        position: 'absolute',
        width: WHEEL_SIZE + 10,
        height: WHEEL_SIZE + 10,
        borderRadius: (WHEEL_SIZE + 10) / 2,
        borderWidth: 5,
        borderColor: colors.accent.primary,
        opacity: 0.3,
    },
    resultContainer: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    resultText: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.success.primary,
    },
    resultTextBig: {
        fontSize: typography.size['3xl'],
        color: colors.warning.primary,
    },
    resultSubtext: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },
    spinButton: {
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing['2xl'],
        borderRadius: borderRadius.full,
        marginTop: spacing.lg,
        ...shadows.md,
    },
    spinButtonDisabled: {
        backgroundColor: colors.text.tertiary,
    },
    spinButtonText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    doneButton: {
        marginTop: spacing.md,
        padding: spacing.sm,
    },
    doneButtonText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },
    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'none',
    },
    confettiPiece: {
        position: 'absolute',
        width: 10,
        height: 20,
        borderRadius: 2,
    },
});
