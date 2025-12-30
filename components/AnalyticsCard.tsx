/**
 * Analytics Card Component
 * Design moderno com glassmorphism
 */

import { borderRadius, shadows, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    gradient?: [string, string];
    size?: 'small' | 'large';
}

// ============================================
// COMPONENT
// ============================================

export function AnalyticsCard({
    title,
    value,
    icon,
    trend,
    gradient = ['#6366F1', '#8B5CF6'],
    size = 'small',
}: AnalyticsCardProps) {
    return (
        <View style={[styles.container, size === 'large' && styles.containerLarge]}>
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={size === 'large' ? 28 : 22} color="rgba(255,255,255,0.9)" />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={[styles.value, size === 'large' && styles.valueLarge]}>
                        {value}
                    </Text>
                    <Text style={styles.title}>{title}</Text>
                </View>

                {/* Trend indicator */}
                {trend && (
                    <View style={[styles.trend, trend.isPositive ? styles.trendPositive : styles.trendNegative]}>
                        <Ionicons
                            name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
                            size={10}
                            color={trend.isPositive ? '#10B981' : '#EF4444'}
                        />
                        <Text style={[styles.trendText, trend.isPositive ? styles.trendTextPositive : styles.trendTextNegative]}>
                            {trend.value}%
                        </Text>
                    </View>
                )}

                {/* Glassmorphism overlay */}
                <View style={styles.glassOverlay} />
            </LinearGradient>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minWidth: '47%',
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.md,
    },
    containerLarge: {
        minWidth: '100%',
    },
    gradient: {
        padding: spacing.lg,
        minHeight: 100,
        justifyContent: 'space-between',
        position: 'relative',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    content: {
        flex: 1,
    },
    value: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    valueLarge: {
        fontSize: typography.size['3xl'],
    },
    title: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: 'rgba(255,255,255,0.8)',
    },
    trend: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        gap: 2,
    },
    trendPositive: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
    },
    trendNegative: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    trendText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },
    trendTextPositive: {
        color: '#10B981',
    },
    trendTextNegative: {
        color: '#EF4444',
    },
    glassOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.05)',
        pointerEvents: 'none',
    },
});
