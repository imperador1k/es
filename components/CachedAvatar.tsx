import { COLORS } from '@/lib/theme.premium';
import { Image, ImageStyle } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

interface CachedAvatarProps {
    url?: string | null;
    size?: number;
    alt?: string;
    style?: StyleProp<ImageStyle>;
}

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0LMo}WB';

export default function CachedAvatar({
    url,
    size = 40,
    alt = '?',
    style
}: CachedAvatarProps) {
    const [error, setError] = useState(false);

    // Fallback se não houver URL ou se der erro no carregamento
    if (!url || error) {
        return <AvatarFallback size={size} alt={alt} style={style as StyleProp<ViewStyle>} />;
    }

    return (
        <Image
            source={{ uri: url }}
            style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
            placeholder={{ blurhash: BLURHASH }}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            onError={() => setError(true)}
        />
    );
}

function AvatarFallback({ size, alt, style }: { size: number, alt: string, style?: StyleProp<ViewStyle> }) {
    const fontSize = size * 0.4;

    return (
        <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={[
                styles.fallback,
                { width: size, height: size, borderRadius: size / 2 },
                style
            ]}
        >
            <Text style={[styles.initials, { fontSize }]}>
                {alt?.charAt(0)?.toUpperCase() || '?'}
            </Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface || '#1F2937',
    },
    initials: {
        color: '#FFF',
        fontWeight: 'bold',
    }
});
