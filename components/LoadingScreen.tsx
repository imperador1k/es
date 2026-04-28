import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withRepeat, 
    withSequence, 
    withTiming,
    FadeIn
} from 'react-native-reanimated';

interface LoadingScreenProps {
    message?: string;
}

export function LoadingScreen({ message = 'A preparar o teu espaço...' }: LoadingScreenProps) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.5);
    const rotation = useSharedValue(0);
    const loaderMove = useSharedValue(-60);

    useEffect(() => {
        // Logo pulse
        scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            true
        );

        // Text opacity
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500 }),
                withTiming(0.5, { duration: 1500 })
            ),
            -1,
            true
        );

        // Ring rotation
        rotation.value = withRepeat(
            withTiming(360, { duration: 3000 }),
            -1,
            false
        );

        // Progress bar move
        loaderMove.value = withRepeat(
            withTiming(140, { duration: 1500 }),
            -1,
            false
        );
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }));

    const loaderStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: loaderMove.value }]
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0A0A0F', '#13151A', '#0F1014']}
                style={StyleSheet.absoluteFill}
            />

            <Animated.View entering={FadeIn.duration(800)} style={styles.content}>
                <View style={styles.logoWrapper}>
                    <Animated.View style={[styles.outerRing, ringStyle]} />
                    <Animated.View style={[styles.logoContainer, logoStyle]}>
                        <LinearGradient
                            colors={COLORS.brand.gradient as [string, string]}
                            style={styles.logoGradient}
                        >
                            <Ionicons name="sparkles" size={40} color="#FFF" />
                        </LinearGradient>
                    </Animated.View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Escola+</Text>
                    <Animated.Text style={[styles.subtitle, { opacity: opacity }]}>
                        {message}
                    </Animated.Text>
                </View>

                <View style={styles.loaderTrack}>
                    <Animated.View style={[styles.loaderFill, loaderStyle]} />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0F',
    },
    content: {
        alignItems: 'center',
    },
    logoWrapper: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    outerRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        borderStyle: 'dashed',
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: COLORS.accent.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    logoGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 28,
        fontFamily: TYPOGRAPHY.family.bold,
        color: '#FFF',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: TYPOGRAPHY.family.medium,
    },
    loaderTrack: {
        width: 140,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        marginTop: 40,
        overflow: 'hidden',
    },
    loaderFill: {
        width: '40%',
        height: '100%',
        backgroundColor: COLORS.accent.primary,
        borderRadius: 2,
    }
});
