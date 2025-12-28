/**
 * FloatingReactions Component
 * Animated emoji reactions that float up and fade out
 */

import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingEmoji {
    id: string;
    emoji: string;
    x: number;
}

interface FloatingReactionsProps {
    reactions: FloatingEmoji[];
    onAnimationComplete: (id: string) => void;
}

// Individual animated emoji
function AnimatedEmoji({ emoji, x, onComplete }: { emoji: string; x: number; onComplete: () => void }) {
    const opacity = useRef(new Animated.Value(1)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        // Animate: scale up, float up, fade out
        Animated.parallel([
            Animated.timing(scale, {
                toValue: 1.2,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: -200,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(1500),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            onComplete();
        });
    }, []);

    return (
        <Animated.Text
            style={[
                styles.emoji,
                {
                    left: x,
                    opacity,
                    transform: [{ translateY }, { scale }],
                },
            ]}
        >
            {emoji}
        </Animated.Text>
    );
}

export function FloatingReactions({ reactions, onAnimationComplete }: FloatingReactionsProps) {
    return (
        <View style={styles.container} pointerEvents="none">
            {reactions.map((r) => (
                <AnimatedEmoji
                    key={r.id}
                    emoji={r.emoji}
                    x={r.x}
                    onComplete={() => onAnimationComplete(r.id)}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    emoji: {
        position: 'absolute',
        bottom: 150,
        fontSize: 40,
    },
});
