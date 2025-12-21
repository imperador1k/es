import { colors, getTierColor } from '@/lib/theme';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
    source?: string | null;
    name?: string | null;
    size?: AvatarSize;
    tier?: string;
    showBadge?: boolean;
    badgeContent?: string;
    style?: ViewStyle;
}

const SIZES = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
};

const FONT_SIZES = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 20,
    xl: 28,
};

/**
 * Avatar - Componente de avatar com fallback para iniciais
 */
export function Avatar({
    source,
    name,
    size = 'md',
    tier,
    showBadge = false,
    badgeContent,
    style,
}: AvatarProps) {
    const dimension = SIZES[size];
    const fontSize = FONT_SIZES[size];
    const initial = name?.charAt(0).toUpperCase() || '?';
    const tierColor = tier ? getTierColor(tier) : null;

    const containerStyle = [
        styles.container,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        tierColor && { borderWidth: 2, borderColor: tierColor },
        style,
    ];

    return (
        <View style={containerStyle}>
            {source ? (
                <Image
                    source={{ uri: source }}
                    style={[styles.image, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
                />
            ) : (
                <View style={[styles.fallback, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}>
                    <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
                </View>
            )}

            {showBadge && (
                <View style={[styles.badge, size === 'xs' || size === 'sm' ? styles.badgeSmall : styles.badgeLarge]}>
                    {badgeContent ? (
                        <Text style={styles.badgeText}>{badgeContent}</Text>
                    ) : (
                        <View style={styles.badgeDot} />
                    )}
                </View>
            )}
        </View>
    );
}

interface AvatarGroupProps {
    avatars: Array<{ source?: string | null; name?: string | null }>;
    max?: number;
    size?: AvatarSize;
}

/**
 * AvatarGroup - Grupo de avatares empilhados
 */
export function AvatarGroup({ avatars, max = 4, size = 'sm' }: AvatarGroupProps) {
    const visible = avatars.slice(0, max);
    const remaining = avatars.length - max;
    const dimension = SIZES[size];
    const overlap = dimension * 0.3;

    return (
        <View style={styles.group}>
            {visible.map((avatar, index) => (
                <View
                    key={index}
                    style={[styles.groupItem, { marginLeft: index > 0 ? -overlap : 0, zIndex: visible.length - index }]}
                >
                    <Avatar source={avatar.source} name={avatar.name} size={size} />
                </View>
            ))}
            {remaining > 0 && (
                <View
                    style={[
                        styles.remaining,
                        { width: dimension, height: dimension, borderRadius: dimension / 2, marginLeft: -overlap }
                    ]}
                >
                    <Text style={[styles.remainingText, { fontSize: FONT_SIZES[size] - 2 }]}>+{remaining}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    image: {
        backgroundColor: colors.surfaceAlt,
    },
    fallback: {
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: {
        color: colors.text.secondary,
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeSmall: {
        right: -2,
        bottom: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    badgeLarge: {
        right: -4,
        bottom: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.text.inverse,
    },
    badgeText: {
        color: colors.text.inverse,
        fontSize: 10,
        fontWeight: '700',
    },
    group: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupItem: {
        borderWidth: 2,
        borderColor: colors.surface,
        borderRadius: 100,
    },
    remaining: {
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    remainingText: {
        color: colors.text.secondary,
        fontWeight: '600',
    },
});
