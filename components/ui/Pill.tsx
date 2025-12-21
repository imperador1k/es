import { borderRadius, colors } from '@/lib/theme';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

interface PillProps {
    children: ReactNode;
    active?: boolean;
    onPress?: () => void;
    color?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

/**
 * Pill/Chip - Para filtros e categorias
 */
export function Pill({
    children,
    active = false,
    onPress,
    color,
    style,
    textStyle,
}: PillProps) {
    const pillStyle = [
        styles.base,
        active ? styles.active : styles.inactive,
        color && { backgroundColor: active ? color : `${color}20` },
        style,
    ];

    const pillTextStyle = [
        styles.text,
        active ? styles.textActive : styles.textInactive,
        color && active && { color: colors.text.inverse },
        color && !active && { color: color },
        textStyle,
    ];

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [pillStyle, pressed && styles.pressed]}
            >
                <Text style={pillTextStyle}>{children}</Text>
            </Pressable>
        );
    }

    return (
        <Pressable style={pillStyle} disabled>
            <Text style={pillTextStyle}>{children}</Text>
        </Pressable>
    );
}

interface PillGroupProps {
    children: ReactNode;
    style?: ViewStyle;
}

/**
 * PillGroup - Container horizontal para pills
 */
export function PillGroup({ children, style }: PillGroupProps) {
    return (
        <Pressable style={[styles.group, style]} disabled>
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: borderRadius.pill,
        marginRight: 8,
    },
    active: {
        backgroundColor: colors.primary,
    },
    inactive: {
        backgroundColor: colors.surfaceAlt,
    },
    pressed: {
        opacity: 0.8,
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
    },
    textActive: {
        color: colors.text.inverse,
    },
    textInactive: {
        color: colors.text.secondary,
    },
    group: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },
});
