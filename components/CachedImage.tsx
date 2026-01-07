/**
 * CachedImage Component
 * High-performance image component with aggressive caching
 * Uses expo-image for memory-disk caching and smooth transitions
 */

import { Image, ImageContentFit, ImageStyle } from 'expo-image';
import { StyleProp } from 'react-native';

// ============================================
// TYPES
// ============================================

interface CachedImageProps {
    uri: string | null | undefined;
    style?: StyleProp<ImageStyle>;
    placeholder?: string;
    contentFit?: ImageContentFit;
    transition?: number;
}

// ============================================
// BLURHASH PLACEHOLDER
// ============================================

// Generic blurhash for avatars (subtle gray gradient)
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0LMo}WB';

// ============================================
// COMPONENT
// ============================================

export function CachedImage({
    uri,
    style,
    placeholder = DEFAULT_BLURHASH,
    contentFit = 'cover',
    transition = 500,
}: CachedImageProps) {
    // Handle null/undefined URIs
    if (!uri) {
        return (
            <Image
                source={null}
                style={style}
                placeholder={{ blurhash: placeholder }}
                contentFit={contentFit}
            />
        );
    }

    return (
        <Image
            source={{ uri }}
            style={style}
            placeholder={{ blurhash: placeholder }}
            contentFit={contentFit}
            transition={transition}
            cachePolicy="memory-disk"
        />
    );
}

// ============================================
// AVATAR VARIANT
// ============================================

interface CachedAvatarProps {
    uri: string | null | undefined;
    size?: number;
    style?: StyleProp<ImageStyle>;
}

export function CachedAvatar({
    uri,
    size = 40,
    style,
}: CachedAvatarProps) {
    return (
        <CachedImage
            uri={uri}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
                style,
            ]}
            contentFit="cover"
            transition={300}
        />
    );
}

export default CachedImage;
