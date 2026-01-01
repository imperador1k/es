/**
 * 📞 Incoming Call Modal - Premium Design
 * WhatsApp-style incoming call screen with Brutal aesthetics
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    Vibration,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IncomingCallModalProps {
    visible: boolean;
    callerName: string;
    callerAvatar?: string | null;
    onAccept: () => void;
    onDecline: () => void;
}

export function IncomingCallModal({
    visible,
    callerName,
    callerAvatar,
    onAccept,
    onDecline,
}: IncomingCallModalProps) {
    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideInAnim = useRef(new Animated.Value(100)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Vibrate pattern
            const vibrationPattern = [0, 500, 200, 500, 200, 500];
            Vibration.vibrate(vibrationPattern, true);

            // Fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Slide in buttons
            Animated.spring(slideInAnim, {
                toValue: 0,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }).start();

            // Pulse animation for avatar (all useNativeDriver: true)
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            Vibration.cancel();
            pulseAnim.stopAnimation();
            fadeAnim.setValue(0);
            slideInAnim.setValue(100);
            pulseAnim.setValue(1);
        }

        return () => {
            Vibration.cancel();
        };
    }, [visible]);

    const handleAccept = () => {
        Vibration.cancel();
        onAccept();
    };

    const handleDecline = () => {
        Vibration.cancel();
        onDecline();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={handleDecline}
        >
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                {/* Blurred Background */}
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

                {/* Gradient Overlay */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(99, 102, 241, 0.1)', 'rgba(0,0,0,0.5)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Content */}
                <View style={styles.content}>
                    {/* Top Label */}
                    <View style={styles.topSection}>
                        <View style={styles.callLabel}>
                            <Ionicons name="videocam" size={20} color="#10B981" />
                            <Text style={styles.callLabelText}>Videochamada</Text>
                        </View>
                    </View>

                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        {/* Glow Ring - uses pulseAnim for consistency */}
                        <Animated.View
                            style={[
                                styles.glowRing,
                                {
                                    opacity: 0.6,
                                    transform: [{ scale: pulseAnim }],
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.glowRing,
                                styles.glowRingInner,
                                {
                                    opacity: 0.4,
                                    transform: [{ scale: pulseAnim }],
                                },
                            ]}
                        />

                        {/* Avatar */}
                        <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                            {callerAvatar && callerAvatar.startsWith('http') ? (
                                <Image source={{ uri: callerAvatar }} style={styles.avatar} />
                            ) : (
                                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitial}>
                                        {callerName.charAt(0).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            )}
                        </Animated.View>

                        {/* Caller Name */}
                        <Text style={styles.callerName}>{callerName}</Text>
                        <Text style={styles.callingText}>A ligar...</Text>
                    </View>

                    {/* Action Buttons */}
                    <Animated.View
                        style={[
                            styles.actionsSection,
                            { transform: [{ translateY: slideInAnim }] },
                        ]}
                    >
                        {/* Decline Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                styles.declineButton,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={handleDecline}
                        >
                            <LinearGradient
                                colors={['#EF4444', '#DC2626']}
                                style={styles.actionButtonGradient}
                            >
                                <Ionicons name="close" size={36} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.actionLabel}>Recusar</Text>
                        </Pressable>

                        {/* Accept Button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                styles.acceptButton,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={handleAccept}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.actionButtonGradient}
                            >
                                <Ionicons name="videocam" size={36} color="#FFF" />
                            </LinearGradient>
                            <Text style={[styles.actionLabel, styles.acceptLabel]}>Atender</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: 80,
        paddingBottom: 60,
    },

    // Top Section
    topSection: {
        alignItems: 'center',
    },
    callLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    callLabelText: {
        color: '#10B981',
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        letterSpacing: 0.5,
    },

    // Avatar Section
    avatarSection: {
        alignItems: 'center',
        gap: SPACING.lg,
    },
    glowRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 3,
        borderColor: '#10B981',
        top: -10,
    },
    glowRingInner: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#6366F1',
        top: -20,
    },
    avatarContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        ...SHADOWS.xl,
    },
    avatar: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarFallback: {
        width: 160,
        height: 160,
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatarInitial: {
        fontSize: 64,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    callerName: {
        fontSize: 32,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginTop: SPACING.md,
    },
    callingText: {
        fontSize: TYPOGRAPHY.size.lg,
        color: COLORS.text.secondary,
        marginTop: SPACING.xs,
    },

    // Actions Section
    actionsSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 60,
        paddingHorizontal: SPACING.xl,
    },
    actionButton: {
        alignItems: 'center',
        gap: SPACING.sm,
    },
    actionButtonGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.lg,
    },
    declineButton: {},
    acceptButton: {},
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.95 }],
    },
    actionLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    acceptLabel: {
        color: '#10B981',
    },
});

export default IncomingCallModal;
