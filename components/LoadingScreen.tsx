import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ImageBackground, Dimensions } from 'react-native';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withRepeat, 
    withSequence, 
    withTiming,
    FadeIn,
    FadeInDown
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface LoadingScreenProps {
    message?: string;
}

export function LoadingScreen({ message = 'A preparar o teu espaço...' }: LoadingScreenProps) {
    const scale = useSharedValue(1);
    const progress = useSharedValue(0);
    const glowOpacity = useSharedValue(0.4);

    useEffect(() => {
        // Logo pulse
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1500 }),
                withTiming(1, { duration: 1500 })
            ),
            -1,
            true
        );

        // Progress bar simulation
        progress.value = withTiming(1, { duration: 3000 });

        // Glow pulse
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 2000 }),
                withTiming(0.4, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <View style={styles.container}>
            <ImageBackground 
                source={require('../assets/images/premium_loading_bg.png')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
            >
                <View style={styles.overlay} />
                
                <Animated.View entering={FadeIn.duration(1000)} style={styles.content}>
                    <BlurView intensity={20} tint="dark" style={styles.glassCard}>
                        <View style={styles.logoWrapper}>
                            <Animated.View style={[styles.glow, glowStyle]} />
                            <Animated.View style={[styles.logoContainer, logoStyle]}>
                                <Ionicons name="school" size={44} color="#FFF" />
                            </Animated.View>
                        </View>

                        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.textContainer}>
                            <Text style={styles.title}>Escola+</Text>
                            <Text style={styles.subtitle}>{message}</Text>
                        </Animated.View>

                        <View style={styles.loaderContainer}>
                            <View style={styles.loaderTrack}>
                                <Animated.View style={[styles.loaderFill, progressStyle]} />
                            </View>
                            <Text style={styles.percentage}>
                                A carregar módulos seguros...
                            </Text>
                        </View>
                    </BlurView>
                </Animated.View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    glassCard: {
        width: width * 0.85,
        maxWidth: 400,
        padding: 40,
        borderRadius: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    logoWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    glow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.accent.primary,
        filter: 'blur(30px)',
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontFamily: TYPOGRAPHY.family.bold,
        color: '#FFF',
        letterSpacing: 2,
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: TYPOGRAPHY.family.medium,
        textAlign: 'center',
    },
    loaderContainer: {
        width: '100%',
        alignItems: 'center',
    },
    loaderTrack: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
    },
    loaderFill: {
        height: '100%',
        backgroundColor: COLORS.accent.primary,
        borderRadius: 3,
        shadowColor: COLORS.accent.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    percentage: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: TYPOGRAPHY.family.regular,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
