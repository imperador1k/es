import { borderRadius, colors, shadows } from '@/lib/theme';
import { ReactNode } from 'react';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
    children: ReactNode;
    className?: string;
    style?: ViewStyle;
    onPress?: () => void;
    variant?: 'default' | 'elevated' | 'outline';
}

/**
 * Card Base - Componente reutilizável para cards
 */
export function Card({ children, className = '', style, onPress, variant = 'default' }: CardProps) {
    const cardStyle = [
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'outline' && styles.outline,
        style,
    ];

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
                className={`bg-surface rounded-card ${className}`}
            >
                {children}
            </Pressable>
        );
    }

    return (
        <View style={cardStyle} className={`bg-surface rounded-card ${className}`}>
            {children}
        </View>
    );
}

interface HeroCardProps {
    children: ReactNode;
    imageSource: ImageSourcePropType | { uri: string };
    className?: string;
    onPress?: () => void;
}

/**
 * Hero Card - Card com imagem de fundo e gradiente
 */
export function HeroCard({ children, imageSource, className = '', onPress }: HeroCardProps) {
    const content = (
        <View style={styles.heroContainer} className={`rounded-card overflow-hidden ${className}`}>
            <Image
                source={imageSource}
                style={styles.heroImage}
                resizeMode="cover"
            />
            <View style={styles.heroGradient} />
            <View style={styles.heroContent}>
                {children}
            </View>
        </View>
    );

    if (onPress) {
        return (
            <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
                {content}
            </Pressable>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.card,
        padding: 16,
        ...shadows.card,
    },
    elevated: {
        ...shadows.cardHover,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
        shadowOpacity: 0,
        elevation: 0,
    },
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    heroContainer: {
        height: 200,
        position: 'relative',
        ...shadows.card,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        backgroundColor: 'transparent',
        // Gradient via LinearGradient se precisar
    },
    heroContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
});
