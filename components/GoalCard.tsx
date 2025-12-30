/**
 * Goal Card Component
 * Mostra um goal com barra de progresso
 */

import { getGoalProgress, getGoalTypeIcon, UserGoal } from '@/hooks/useGoals';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface GoalCardProps {
    goal: UserGoal;
    onPress?: () => void;
    compact?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function GoalCard({ goal, onPress, compact = false }: GoalCardProps) {
    const progress = getGoalProgress(goal);
    const iconName = getGoalTypeIcon(goal.goal_type) as keyof typeof Ionicons.glyphMap;

    // Format deadline
    const formatDeadline = (deadline?: string) => {
        if (!deadline) return null;
        const date = new Date(deadline);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Expirado';
        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Amanhã';
        if (diffDays < 7) return `${diffDays} dias`;
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    };

    if (compact) {
        return (
            <Pressable style={styles.compactCard} onPress={onPress}>
                <View style={styles.compactIcon}>
                    <Ionicons name={iconName} size={16} color={colors.accent.primary} />
                </View>
                <View style={styles.compactContent}>
                    <Text style={styles.compactTitle} numberOfLines={1}>{goal.title}</Text>
                    <View style={styles.compactProgressBar}>
                        <View style={[styles.compactProgressFill, { width: `${progress}%` }]} />
                    </View>
                </View>
                <Text style={styles.compactProgress}>{progress}%</Text>
            </Pressable>
        );
    }

    return (
        <Pressable style={styles.card} onPress={onPress}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name={iconName} size={20} color={colors.accent.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title} numberOfLines={1}>{goal.title}</Text>
                    {goal.deadline && (
                        <Text style={styles.deadline}>
                            <Ionicons name="calendar-outline" size={12} color={colors.text.tertiary} />
                            {' '}{formatDeadline(goal.deadline)}
                        </Text>
                    )}
                </View>
                {goal.is_completed && (
                    <View style={styles.completedBadge}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                    </View>
                )}
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${progress}%` },
                            goal.is_completed && styles.progressComplete,
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {goal.current_value} / {goal.target_value}
                </Text>
            </View>
        </Pressable>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    deadline: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    completedBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.success.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: 4,
    },
    progressComplete: {
        backgroundColor: colors.success.primary,
    },
    progressText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        minWidth: 50,
        textAlign: 'right',
    },

    // Compact styles
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginRight: spacing.md,
        width: 180,
        ...shadows.sm,
    },
    compactIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    compactContent: {
        flex: 1,
    },
    compactTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        marginBottom: 4,
    },
    compactProgressBar: {
        height: 4,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 2,
        overflow: 'hidden',
    },
    compactProgressFill: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: 2,
    },
    compactProgress: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
        marginLeft: spacing.sm,
    },
});
