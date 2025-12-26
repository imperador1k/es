/**
 * ActivityChart Component
 * Gráfico de barras mostrando XP ganho nos últimos 7 dias
 * Usa react-native-gifted-charts
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

// ============================================
// TYPES
// ============================================

interface DayXP {
    label: string;
    value: number;
    frontColor: string;
    topLabelComponent?: () => React.ReactNode;
}

interface WeeklyData {
    data: DayXP[];
    total: number;
    average: number;
    bestDay: string;
}

// ============================================
// HELPERS
// ============================================

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getGradientColor(value: number, maxValue: number): string {
    if (maxValue === 0) return colors.accent.primary;
    const intensity = value / maxValue;
    if (intensity > 0.8) return '#10B981'; // Green for high
    if (intensity > 0.5) return colors.accent.primary; // Purple for medium
    if (intensity > 0.2) return '#6366F1'; // Blue for low
    return colors.text.tertiary + '80'; // Gray for very low
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// ============================================
// COMPONENT
// ============================================

interface ActivityChartProps {
    height?: number;
}

export function ActivityChart({ height = 180 }: ActivityChartProps) {
    const { user } = useAuthContext();
    const [loading, setLoading] = useState(true);
    const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWeeklyXP();
    }, [user?.id]);

    const fetchWeeklyXP = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            setError(null);

            // Get last 7 days
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);

            // Query xp_history grouped by day
            const { data, error: fetchError } = await supabase
                .from('xp_history')
                .select('amount, created_at')
                .eq('user_id', user.id)
                .gte('created_at', formatDate(sevenDaysAgo))
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            // Group by day
            const dayMap: Record<string, number> = {};

            // Initialize all 7 days with 0
            for (let i = 0; i < 7; i++) {
                const date = new Date(sevenDaysAgo);
                date.setDate(sevenDaysAgo.getDate() + i);
                dayMap[formatDate(date)] = 0;
            }

            // Sum XP per day
            data?.forEach((entry) => {
                const dateKey = entry.created_at.split('T')[0];
                if (dayMap[dateKey] !== undefined) {
                    dayMap[dateKey] += entry.amount;
                }
            });

            // Convert to chart data
            const maxValue = Math.max(...Object.values(dayMap), 1);
            const chartData: DayXP[] = Object.entries(dayMap).map(([dateStr, xp]) => {
                const date = new Date(dateStr);
                const dayIndex = date.getDay();
                const isToday = formatDate(date) === formatDate(today);

                return {
                    label: DAY_LABELS[dayIndex],
                    value: xp,
                    frontColor: isToday
                        ? '#10B981' // Green for today
                        : getGradientColor(xp, maxValue),
                    topLabelComponent: xp > 0 ? () => (
                        <Text style={styles.barLabel}>+{xp}</Text>
                    ) : undefined,
                };
            });

            // Calculate stats
            const total = Object.values(dayMap).reduce((sum, v) => sum + v, 0);
            const average = Math.round(total / 7);
            const bestDayEntry = Object.entries(dayMap).reduce(
                (best, [date, xp]) => xp > best.xp ? { date, xp } : best,
                { date: '', xp: 0 }
            );
            const bestDayDate = new Date(bestDayEntry.date);
            const bestDay = DAY_LABELS[bestDayDate.getDay()];

            setWeeklyData({
                data: chartData,
                total,
                average,
                bestDay: bestDayEntry.xp > 0 ? bestDay : '-',
            });
        } catch (err) {
            console.error('Error fetching weekly XP:', err);
            setError('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { height }]}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
        );
    }

    if (error || !weeklyData) {
        return (
            <View style={[styles.container, { height }]}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.text.tertiary} />
                <Text style={styles.errorText}>{error || 'Sem dados'}</Text>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Atividade Semanal</Text>
                    <Text style={styles.subtitle}>XP ganho nos últimos 7 dias</Text>
                </View>
                <View style={styles.totalBadge}>
                    <Text style={styles.totalValue}>+{weeklyData.total}</Text>
                    <Text style={styles.totalLabel}>XP</Text>
                </View>
            </View>

            {/* Chart */}
            <View style={styles.chartContainer}>
                <BarChart
                    data={weeklyData.data}
                    width={280}
                    height={height}
                    barWidth={28}
                    spacing={12}
                    roundedTop
                    roundedBottom
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: colors.text.tertiary, fontSize: 10 }}
                    xAxisLabelTextStyle={styles.xAxisLabel}
                    noOfSections={4}
                    maxValue={Math.max(...weeklyData.data.map(d => d.value), 100)}
                    isAnimated
                    animationDuration={800}
                    backgroundColor="transparent"
                    hideRules
                    barBorderRadius={6}
                    frontColor={colors.accent.primary}
                    gradientColor={colors.accent.light}
                    showGradient
                />
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{weeklyData.average}</Text>
                    <Text style={styles.statLabel}>Média/Dia</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{weeklyData.bestDay}</Text>
                    <Text style={styles.statLabel}>Melhor Dia</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{weeklyData.data.filter(d => d.value > 0).length}</Text>
                    <Text style={styles.statLabel}>Dias Ativos</Text>
                </View>
            </View>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    totalBadge: {
        backgroundColor: colors.success.light,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        alignItems: 'center',
    },
    totalValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.success.primary,
    },
    totalLabel: {
        fontSize: typography.size.xs,
        color: colors.success.primary,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: spacing.sm,
    },
    barLabel: {
        fontSize: 10,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    xAxisLabel: {
        color: colors.text.secondary,
        fontSize: 11,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    stat: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: colors.divider,
    },
    errorText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.sm,
    },
});
