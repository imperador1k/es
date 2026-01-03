import { SPACING } from '@/lib/theme.premium';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';

export interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

export interface CustomAlertProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
    onDismiss?: () => void;
}

export function CustomAlert({ visible, title, message, buttons = [], onDismiss }: CustomAlertProps) {
    if (!visible) return null;

    // Default button if none provided
    const actions = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onDismiss }];

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
            <View style={styles.overlay}>
                {/* Backdrop Blur */}
                <Animated.View entering={FadeIn} exiting={FadeOut} style={StyleSheet.absoluteFill}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
                </Animated.View>

                {/* Alert Card */}
                <Animated.View
                    entering={FadeInDown.springify().damping(20).mass(0.8).stiffness(150)}
                    exiting={FadeOutDown.duration(150)}
                    style={styles.alertContainer}
                >
                    <View style={styles.content}>
                        <Text style={styles.title}>{title}</Text>
                        {message && <Text style={styles.message}>{message}</Text>}
                    </View>

                    <View style={[styles.actions, actions.length > 2 && styles.actionsVertical]}>
                        {actions.map((btn, index) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';

                            return (
                                <Pressable
                                    key={index}
                                    style={({ pressed }) => [
                                        styles.button,
                                        pressed && styles.buttonPressed,
                                        isDestructive && styles.buttonDestructive,
                                        isCancel && styles.buttonCancel,
                                        actions.length > 2 && styles.buttonVertical
                                    ]}
                                    onPress={() => {
                                        if (btn.onPress) btn.onPress();
                                        else if (onDismiss) onDismiss();
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            isDestructive && styles.textDestructive,
                                            isCancel && styles.textCancel,
                                        ]}
                                    >
                                        {btn.text}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker backdrop
        padding: SPACING.xl,
    },
    alertContainer: {
        width: '100%',
        maxWidth: 300, // Slightly narrower
        backgroundColor: '#1C1C1E', // Apple-like dark grey
        borderRadius: 14, // Classic iOS-like rounded corners but slightly more modern
        overflow: 'hidden',
        // Subtle border instead of heavy glow
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.12)',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16,
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: 0.3, // Slight letter spacing
    },
    message: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 0,
        gap: 12, // Space between buttons
    },
    actionsVertical: {
        flexDirection: 'column',
    },
    button: {
        flex: 1,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)', // Subtle nice button bg
    },
    buttonVertical: {
        height: 48,
        width: '100%',
    },
    buttonPressed: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    buttonDestructive: {
        backgroundColor: 'rgba(255,69,58,0.15)', // Subtle Red bg
    },
    buttonCancel: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    textDestructive: {
        color: '#FF453A',
        fontWeight: '600',
    },
    textCancel: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
});
