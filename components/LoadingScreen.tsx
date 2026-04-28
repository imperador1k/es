import { COLORS, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
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

export function LoadingScreen({ message = 'A carregar o teu sucesso...' }: LoadingScreenProps) {
    const scale = useSharedValue(1);
    const progress = useSharedValue(0);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1200 }),
                withTiming(1, { duration: 1200 })
            ),
            -1,
            true
        );
        progress.value = withTiming(1, { duration: 2500 });
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#050505', '#0A0A0F', '#050505']}
                style={StyleSheet.absoluteFill}
            />
            
            <Animated.View entering={FadeIn.duration(800)} style={styles.content}>
                <Animated.View style={[styles.logoContainer, logoStyle]}>
                    <LinearGradient
                        colors={['#6366F1', '#4F46E5']}
                        style={styles.logoGradient}
                    >
                        <Ionicons name="school" size={40} color="#FFF" />
                    </LinearGradient>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.textContainer}>
                    <Text style={styles.title}>Escola+</Text>
                    <Text style={styles.subtitle}>{message}</Text>
                </Animated.View>

                <View style={styles.loaderContainer}>
                    <View style={styles.loaderTrack}>
                        <Animated.View style={[styles.loaderFill, progressStyle]} />
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 20,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    logoGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontFamily: TYPOGRAPHY.family.bold,
        color: '#FFF',
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: TYPOGRAPHY.family.medium,
        marginTop: 4,
    },
    loaderContainer: {
        width: 120,
        alignItems: 'center',
    },
    loaderTrack: {
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    loaderFill: {
        height: '100%',
        backgroundColor: '#6366F1',
    }
});
