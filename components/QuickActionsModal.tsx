/**
 * QuickActionsModal - Ultra Modern with Smooth Gestures
 * Uses native PanResponder for smooth dragging
 */

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 520;

// ============================================
// TYPES
// ============================================

interface QuickActionsModalProps {
    visible: boolean;
    onClose: () => void;
}

// ============================================
// DATA
// ============================================

const ACTIONS = [
    {
        id: 'task',
        icon: 'checkmark-circle',
        label: 'Tarefas',
        gradient: ['#6366F1', '#8B5CF6'],
        route: '/(tabs)/planner',
    },
    {
        id: 'subjects',
        icon: 'book',
        label: 'Disciplinas',
        gradient: ['#EC4899', '#F472B6'],
        route: '/(tabs)/subjects',
    },
    {
        id: 'focus',
        icon: 'flash',
        label: 'Foco',
        gradient: ['#10B981', '#34D399'],
        route: '/pomodoro',
    },
    {
        id: 'ai',
        icon: 'sparkles',
        label: 'AI Tutor',
        gradient: ['#F59E0B', '#FBBF24'],
        route: '/(app)/ai-tutor',
    },
];

const QUICK_LINKS = [
    { id: 'calendar', icon: 'calendar-outline', label: 'Calendário', route: '/(tabs)/calendar' },
    { id: 'messages', icon: 'chatbubble-outline', label: 'Mensagens', route: '/(tabs)/messages' },
    { id: 'shop', icon: 'diamond-outline', label: 'Loja', route: '/shop' },
    { id: 'settings', icon: 'settings-outline', label: 'Config', route: '/settings' },
];

// ============================================
// ACTION BUTTON
// ============================================

function ActionButton({
    action,
    onPress,
}: {
    action: (typeof ACTIONS)[0];
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.92,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
                <LinearGradient
                    colors={action.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionGradient}
                >
                    <Ionicons name={action.icon as any} size={28} color="#FFF" />
                </LinearGradient>
                <Text style={styles.actionLabel}>{action.label}</Text>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// QUICK LINK
// ============================================

function QuickLink({
    item,
    onPress,
}: {
    item: (typeof QUICK_LINKS)[0];
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.9,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.quickLinkButton, { transform: [{ scale }] }]}>
                <View style={styles.quickLinkIcon}>
                    <Ionicons name={item.icon as any} size={20} color={COLORS.text.secondary} />
                </View>
                <Text style={styles.quickLinkLabel}>{item.label}</Text>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function QuickActionsModal({ visible, onClose }: QuickActionsModalProps) {
    const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Open animation
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const closeWithAnimation = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SHEET_HEIGHT,
                duration: 200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const handleAction = (route: string) => {
        closeWithAnimation();
        setTimeout(() => {
            router.push(route as any);
        }, 200);
    };

    // Pan responder for smooth dragging
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to vertical gestures
                return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 5;
            },
            onPanResponderGrant: () => {
                // Get current value and stop any animations
                translateY.stopAnimation();
            },
            onPanResponderMove: (_, gestureState) => {
                // Follow finger - only allow positive (downward) values
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                    // Also update backdrop opacity based on drag
                    const opacity = 1 - gestureState.dy / SHEET_HEIGHT;
                    backdropOpacity.setValue(Math.max(0, opacity));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // If dragged more than 30% or velocity is high, close
                if (gestureState.dy > SHEET_HEIGHT * 0.3 || gestureState.vy > 0.5) {
                    closeWithAnimation();
                } else {
                    // Snap back to open
                    Animated.parallel([
                        Animated.spring(translateY, {
                            toValue: 0,
                            damping: 20,
                            stiffness: 150,
                            useNativeDriver: true,
                        }),
                        Animated.spring(backdropOpacity, {
                            toValue: 1,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            },
        })
    ).current;

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeWithAnimation} statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation} />
            </Animated.View>

            {/* Bottom Sheet */}
            <View style={styles.sheetWrapper}>
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    {/* Drag Handle Area */}
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={styles.handle} />
                    </View>

                    {/* Main Actions Grid */}
                    <View style={styles.actionsGrid}>
                        {ACTIONS.map((action) => (
                            <ActionButton key={action.id} action={action} onPress={() => handleAction(action.route)} />
                        ))}
                    </View>

                    {/* Separator */}
                    <View style={styles.separator} />

                    {/* Quick Links */}
                    <View style={styles.quickLinksRow}>
                        {QUICK_LINKS.map((item) => (
                            <QuickLink key={item.id} item={item} onPress={() => handleAction(item.route)} />
                        ))}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheetWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        height: SHEET_HEIGHT,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        paddingBottom: 40,
    },

    // Handle
    handleArea: {
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
    },

    // Actions Grid
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
        gap: SPACING.md,
    },
    actionButton: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2 - 4,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    actionGradient: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    actionLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        textAlign: 'center',
    },

    // Separator
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginHorizontal: SPACING.xl,
    },

    // Quick Links
    quickLinksRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
    },
    quickLinkButton: {
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.xs,
    },
    quickLinkIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    quickLinkLabel: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.tertiary,
    },
});

export default QuickActionsModal;
