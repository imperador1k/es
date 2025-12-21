import { borderRadius, colors, shadows } from '@/lib/theme';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    children: ReactNode;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

/**
 * Button - Componente de botão estilizado
 */
export function Button({
    children,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
}: ButtonProps) {
    const isDisabled = disabled || loading;

    const buttonStyle = [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
    ];

    const buttonTextStyle = [
        styles.text,
        styles[`text_${variant}`],
        styles[`textSize_${size}`],
        isDisabled && styles.textDisabled,
        textStyle,
    ];

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [buttonStyle, pressed && !isDisabled && styles.pressed]}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.text.inverse}
                />
            ) : (
                <>
                    {leftIcon}
                    <Text style={buttonTextStyle}>{children}</Text>
                    {rightIcon}
                </>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.button,
        gap: 8,
    },

    // Variantes
    primary: {
        backgroundColor: colors.primary,
        ...shadows.button,
    },
    secondary: {
        backgroundColor: colors.secondary,
        ...shadows.button,
    },
    accent: {
        backgroundColor: colors.accent,
        ...shadows.button,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.border,
    },
    ghost: {
        backgroundColor: 'transparent',
    },

    // Tamanhos
    size_sm: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    size_md: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    size_lg: {
        paddingHorizontal: 28,
        paddingVertical: 16,
    },

    fullWidth: {
        width: '100%',
    },

    disabled: {
        opacity: 0.5,
    },

    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },

    // Texto
    text: {
        fontWeight: '600',
    },
    text_primary: {
        color: colors.text.inverse,
    },
    text_secondary: {
        color: colors.text.inverse,
    },
    text_accent: {
        color: colors.text.inverse,
    },
    text_outline: {
        color: colors.text.primary,
    },
    text_ghost: {
        color: colors.text.primary,
    },

    textSize_sm: {
        fontSize: 13,
    },
    textSize_md: {
        fontSize: 15,
    },
    textSize_lg: {
        fontSize: 17,
    },

    textDisabled: {
        color: colors.text.muted,
    },
});
