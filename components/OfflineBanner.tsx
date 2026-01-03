/**
 * 📶 OfflineBanner - Banner que aparece quando não há internet
 * Discreto, estilo TripGlide Premium
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
    const { isConnected, isInternetReachable } = useNetworkStatus();
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-100)).current;

    const isOffline = !isConnected || !isInternetReachable;

    useEffect(() => {
        Animated.spring(translateY, {
            toValue: isOffline ? 0 : -100,
            useNativeDriver: true,
            tension: 60,
            friction: 10,
        }).start();
    }, [isOffline]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + SPACING.xs,
                    transform: [{ translateY }],
                },
            ]}
            pointerEvents={isOffline ? 'auto' : 'none'}
        >
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={18} color="#FFF" />
                <Text style={styles.text}>Modo Offline — A ver dados guardados</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#F59E0B', // Warning orange
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    text: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
});

export default OfflineBanner;
