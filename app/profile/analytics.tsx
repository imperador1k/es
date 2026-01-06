/**
 * Premium Analytics Page
 * Página de estatísticas com gráficos bonitos usando react-native-gifted-charts
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { fetchAnalytics, WeeklyAnalytics } from '@/services/analytics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

type Period = 'week' | 'month';

interface StatCardProps {
    icon?: string;
    emoji?: string;
    title: string;
    value: string | number;
    subtitle?: string;
    gradient: [string, string];
    delay?: number;
}

// ============================================
// SKELETON LOADER
// ============================================

function SkeletonLoader({ height = 180 }: { height?: number }) {
    return (
        <View style={[styles.skeletonContainer, { height }]}>
            <View style={styles.skeletonPulse}>
                <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
        </View>
    );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({ icon, emoji, title, value, subtitle, gradient, delay = 0 }: StatCardProps) {
    return (
        <Animated.View entering={FadeInUp.delay(delay).springify()} style={styles.statCard}>
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
            >
                <View style={styles.statCardIcon}>
                    {emoji ? (
                        <Text style={styles.statCardEmoji}>{emoji}</Text>
                    ) : (
                        <Ionicons name={icon as any} size={24} color="#FFF" />
                    )}
                </View>
                <Text style={styles.statCardValue}>{value}</Text>
                <Text style={styles.statCardTitle}>{title}</Text>
                {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
            </LinearGradient>
        </Animated.View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AnalyticsPage() {
    const { user } = useAuthContext();
    const [period, setPeriod] = useState<Period>('week');
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<WeeklyAnalytics | null>(null);

    const loadAnalytics = useCallback(async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const data = await fetchAnalytics(user.id, period);
            setAnalytics(data);
        } catch (err) {
            console.error('Erro ao carregar analytics:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, period]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    // Preparar dados para o gráfico de barras (Focus Minutes)
    const focusChartData = analytics?.focusData.map((day, index) => ({
        value: day.minutes,
        label: day.dayLabel,
        frontColor: index === analytics.focusData.length - 1 ? '#10B981' : '#8B5CF6',
        gradientColor: '#6366F1',
        topLabelComponent: day.minutes > 0 ? () => (
            <Text style={styles.barTopLabel}>{day.minutes}m</Text>
        ) : undefined,
    })) || [];

    // Preparar dados para o gráfico de linha (XP Evolution)
    const xpChartData = analytics?.xpData.map((day) => ({
        value: day.xp,
        label: day.dayLabel,
        dataPointText: day.xp > 0 ? `+${day.xp}` : '',
    })) || [];

    // Calcular máximos para os gráficos
    const maxFocus = Math.max(...focusChartData.map(d => d.value), 30);
    const maxXP = Math.max(...xpChartData.map(d => d.value), 50);

    // Formatar horas totais
    const totalHours = Math.floor((analytics?.summary.totalFocusMinutes || 0) / 60);
    const totalMins = (analytics?.summary.totalFocusMinutes || 0) % 60;
    const formattedTime = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>O Teu Desempenho</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* Period Selector */}
            <View style={styles.periodSelector}>
                <Pressable
                    style={[styles.periodButton, period === 'week' && styles.periodButtonActive]}
                    onPress={() => setPeriod('week')}
                >
                    <Text style={[styles.periodButtonText, period === 'week' && styles.periodButtonTextActive]}>
                        Semana
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
                    onPress={() => setPeriod('month')}
                >
                    <Text style={[styles.periodButtonText, period === 'month' && styles.periodButtonTextActive]}>
                        Mês
                    </Text>
                </Pressable>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Focus Minutes Chart */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>⏱️ Minutos de Foco</Text>
                            <Text style={styles.chartSubtitle}>
                                Tempo de estudo {period === 'week' ? 'esta semana' : 'este mês'}
                            </Text>
                        </View>
                        <View style={styles.chartBadge}>
                            <Text style={styles.chartBadgeText}>
                                {analytics?.focusData.reduce((sum, d) => sum + d.minutes, 0) || 0}m
                            </Text>
                        </View>
                    </View>

                    {loading ? (
                        <SkeletonLoader height={200} />
                    ) : (
                        <View style={styles.chartContainer}>
                            <BarChart
                                data={focusChartData}
                                width={period === 'week' ? 280 : 260}
                                height={180}
                                barWidth={period === 'week' ? 28 : 8}
                                spacing={period === 'week' ? 14 : 4}
                                roundedTop
                                roundedBottom
                                xAxisThickness={0}
                                yAxisThickness={0}
                                yAxisTextStyle={styles.axisLabel}
                                xAxisLabelTextStyle={styles.axisLabel}
                                noOfSections={4}
                                maxValue={maxFocus}
                                isAnimated
                                animationDuration={800}
                                backgroundColor="transparent"
                                hideRules
                                barBorderRadius={6}
                                showGradient
                                gradientColor="#6366F130"
                            />
                        </View>
                    )}
                </Animated.View>

                {/* Summary Cards Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        emoji="🔥"
                        title="Streak"
                        value={analytics?.summary.streakDays || 0}
                        subtitle="dias seguidos"
                        gradient={['#F59E0B', '#D97706']}
                        delay={150}
                    />
                    <StatCard
                        emoji="⏱️"
                        title="Total Focado"
                        value={formattedTime}
                        subtitle="horas de estudo"
                        gradient={['#8B5CF6', '#6366F1']}
                        delay={200}
                    />
                    <StatCard
                        emoji="⚡"
                        title="XP Ganho"
                        value={(analytics?.summary.totalXP || 0).toLocaleString()}
                        subtitle="pontos totais"
                        gradient={['#10B981', '#059669']}
                        delay={250}
                    />
                    <StatCard
                        emoji="💬"
                        title="Mensagens"
                        value={(analytics?.summary.totalMessages || 0).toLocaleString()}
                        subtitle="enviadas"
                        gradient={['#EC4899', '#DB2777']}
                        delay={300}
                    />
                </View>

                {/* XP Evolution Chart */}
                <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>📈 Evolução de XP</Text>
                            <Text style={styles.chartSubtitle}>
                                Ganho de XP {period === 'week' ? 'nos últimos 7 dias' : 'nos últimos 30 dias'}
                            </Text>
                        </View>
                    </View>

                    {loading ? (
                        <SkeletonLoader height={180} />
                    ) : (
                        <View style={styles.chartContainer}>
                            <LineChart
                                data={xpChartData}
                                width={period === 'week' ? 280 : 260}
                                height={160}
                                spacing={period === 'week' ? 40 : 10}
                                initialSpacing={20}
                                endSpacing={20}
                                thickness={3}
                                color="#10B981"
                                hideDataPoints={false}
                                dataPointsColor="#10B981"
                                dataPointsRadius={5}
                                curved
                                areaChart
                                startFillColor="#10B98140"
                                endFillColor="#10B98110"
                                startOpacity={0.9}
                                endOpacity={0.2}
                                xAxisThickness={0}
                                yAxisThickness={0}
                                yAxisTextStyle={styles.axisLabel}
                                xAxisLabelTextStyle={styles.axisLabel}
                                noOfSections={4}
                                maxValue={maxXP}
                                isAnimated
                                animationDuration={1000}
                                hideRules
                                showVerticalLines={false}
                            />
                        </View>
                    )}
                </Animated.View>

                {/* Activity Summary */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.activityCard}>
                    <Text style={styles.activityTitle}>📊 Resumo de Atividade</Text>
                    <View style={styles.activityRow}>
                        <View style={styles.activityItem}>
                            <View style={[styles.activityDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.activityLabel}>Dias Ativos</Text>
                            <Text style={styles.activityValue}>{analytics?.summary.activeDays || 0}</Text>
                        </View>
                        <View style={styles.activityDivider} />
                        <View style={styles.activityItem}>
                            <View style={[styles.activityDot, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={styles.activityLabel}>Média Diária</Text>
                            <Text style={styles.activityValue}>
                                {Math.round((analytics?.summary.totalFocusMinutes || 0) / 7)}m
                            </Text>
                        </View>
                        <View style={styles.activityDivider} />
                        <View style={styles.activityItem}>
                            <View style={[styles.activityDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.activityLabel}>Melhor Streak</Text>
                            <Text style={styles.activityValue}>{analytics?.summary.streakDays || 0}d</Text>
                        </View>
                    </View>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },

    // Period Selector
    periodSelector: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        padding: SPACING.xs,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
    },
    periodButton: {
        flex: 1,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: COLORS.accent.primary,
    },
    periodButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
    periodButtonTextActive: {
        color: '#FFF',
    },

    scrollView: {
        flex: 1,
    },

    // Chart Card
    chartCard: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        ...SHADOWS.md,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    chartTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    chartSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    chartBadge: {
        backgroundColor: COLORS.accent.subtle,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.full,
    },
    chartBadgeText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.accent.primary,
    },
    chartContainer: {
        alignItems: 'center',
        paddingTop: SPACING.sm,
    },
    barTopLabel: {
        fontSize: 10,
        color: COLORS.text.secondary,
        marginBottom: 4,
    },
    axisLabel: {
        color: COLORS.text.tertiary,
        fontSize: 10,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg - SPACING.xs,
        marginBottom: SPACING.md,
    },
    statCard: {
        width: '50%',
        padding: SPACING.xs,
    },
    statCardGradient: {
        padding: SPACING.lg,
        borderRadius: RADIUS.xl,
        alignItems: 'flex-start',
    },
    statCardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    statCardEmoji: {
        fontSize: 22,
    },
    statCardValue: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    statCardTitle: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    statCardSubtitle: {
        fontSize: TYPOGRAPHY.size.xs,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },

    // Activity Summary
    activityCard: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        ...SHADOWS.md,
    },
    activityTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityItem: {
        flex: 1,
        alignItems: 'center',
    },
    activityDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginBottom: SPACING.xs,
    },
    activityLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginBottom: 2,
    },
    activityValue: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    activityDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.surfaceElevated,
    },

    // Skeleton
    skeletonContainer: {
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.surfaceMuted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonPulse: {
        opacity: 0.5,
    },
});
