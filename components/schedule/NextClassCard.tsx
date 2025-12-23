/**
 * Componente NextClassCard
 * Mostra a próxima aula do utilizador com countdown
 * Escola+ App
 */

import { useSchedule } from '@/hooks/useSubjects';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { ClassSessionWithSubject, DAY_NAMES_SHORT, DayOfWeek } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import {
    differenceInMinutes,
    setHours,
    setMinutes
} from 'date-fns';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// ============================================
// HELPERS
// ============================================

/**
 * Converte uma string 'HH:MM' ou 'HH:MM:SS' para um Date de hoje
 */
function parseTimeToDate(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    return setMinutes(setHours(now, hours), minutes);
}

/**
 * Formata o tempo relativo de forma amigável
 */
function formatRelativeTime(minutes: number): string {
    if (minutes < 0) return 'Agora';
    if (minutes === 0) return 'Agora mesmo!';
    if (minutes === 1) return 'Em 1 minuto';
    if (minutes < 60) return `Em ${minutes} minutos`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 1 && remainingMinutes === 0) return 'Em 1 hora';
    if (hours === 1) return `Em 1h ${remainingMinutes}min`;
    if (remainingMinutes === 0) return `Em ${hours} horas`;
    return `Em ${hours}h ${remainingMinutes}min`;
}

/**
 * Formata quando é a próxima aula (hoje, amanhã, ou dia da semana)
 */
function formatNextClassDay(session: ClassSessionWithSubject): string {
    const now = new Date();
    const currentDay = now.getDay() as DayOfWeek;

    if (session.day_of_week === currentDay) {
        return 'Hoje';
    }

    // Calcular quantos dias faltam
    let daysUntil = session.day_of_week - currentDay;
    if (daysUntil <= 0) daysUntil += 7;

    if (daysUntil === 1) return 'Amanhã';
    return DAY_NAMES_SHORT[session.day_of_week];
}

// ============================================
// PROPS
// ============================================

interface NextClassCardProps {
    onPress?: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NextClassCard({ onPress }: NextClassCardProps) {
    const { schedule, loading, getNextSession, getTodaySessions } = useSchedule();
    const [countdown, setCountdown] = useState<string>('');
    const [nextClass, setNextClass] = useState<ClassSessionWithSubject | null>(null);
    const [isHappeningNow, setIsHappeningNow] = useState(false);

    // Atualizar próxima aula e countdown
    useEffect(() => {
        const updateNextClass = () => {
            const next = getNextSession();
            setNextClass(next);

            if (next) {
                const now = new Date();
                const currentDay = now.getDay() as DayOfWeek;

                // Verificar se é hoje
                if (next.day_of_week === currentDay) {
                    const startTime = parseTimeToDate(next.start_time);
                    const endTime = parseTimeToDate(next.end_time);
                    const minutesUntilStart = differenceInMinutes(startTime, now);

                    // Verificar se está a decorrer
                    if (now >= startTime && now <= endTime) {
                        const minutesRemaining = differenceInMinutes(endTime, now);
                        setCountdown(`Termina em ${minutesRemaining} min`);
                        setIsHappeningNow(true);
                    } else {
                        setCountdown(formatRelativeTime(minutesUntilStart));
                        setIsHappeningNow(false);
                    }
                } else {
                    // Não é hoje, mostrar o dia
                    setCountdown(formatNextClassDay(next));
                    setIsHappeningNow(false);
                }
            }
        };

        updateNextClass();

        // Atualizar a cada minuto
        const interval = setInterval(updateNextClass, 60000);
        return () => clearInterval(interval);
    }, [schedule, getNextSession]);

    // Estado de loading ou sem dados
    if (loading && schedule.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingCard}>
                    <Text style={styles.loadingText}>A carregar horário...</Text>
                </View>
            </View>
        );
    }

    // Sem aulas configuradas
    if (schedule.length === 0) {
        return (
            <Pressable onPress={onPress} style={styles.container}>
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="calendar-outline" size={32} color={colors.text.tertiary} />
                    </View>
                    <View style={styles.emptyContent}>
                        <Text style={styles.emptyTitle}>Sem horário</Text>
                        <Text style={styles.emptyText}>
                            Configura o teu horário no ecrã "Aulas"
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                </View>
            </Pressable>
        );
    }

    // Sem próxima aula (dia livre ou fim de semana)
    if (!nextClass) {
        return (
            <View style={styles.container}>
                <View style={styles.freeCard}>
                    <View style={styles.freeIconContainer}>
                        <Text style={styles.freeEmoji}>🎉</Text>
                    </View>
                    <View style={styles.freeContent}>
                        <Text style={styles.freeTitle}>Dia Livre!</Text>
                        <Text style={styles.freeText}>
                            Aproveita para estudar ou descansar
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    // Card da próxima aula
    const subject = nextClass.subject;
    const startFormatted = nextClass.start_time.slice(0, 5);
    const endFormatted = nextClass.end_time.slice(0, 5);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>
                    {isHappeningNow ? 'A decorrer' : 'Próxima Aula'}
                </Text>
                {isHappeningNow && (
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                )}
            </View>

            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    { borderLeftColor: subject.color },
                    isHappeningNow && styles.cardLive,
                    pressed && styles.cardPressed,
                ]}
            >
                {/* Countdown Badge */}
                <View style={[styles.countdownBadge, isHappeningNow && styles.countdownBadgeLive]}>
                    <Text style={[styles.countdownText, isHappeningNow && styles.countdownTextLive]}>
                        {countdown}
                    </Text>
                </View>

                {/* Subject Info */}
                <View style={styles.subjectContainer}>
                    <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                    <Text style={styles.subjectName} numberOfLines={1}>
                        {subject.name}
                    </Text>
                </View>

                {/* Time */}
                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                    <Text style={styles.timeText}>
                        {startFormatted} - {endFormatted}
                    </Text>
                </View>

                {/* Details Row */}
                <View style={styles.detailsRow}>
                    {(nextClass.room || subject.room) && (
                        <View style={styles.detailItem}>
                            <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
                            <Text style={styles.detailText}>
                                {nextClass.room || subject.room}
                            </Text>
                        </View>
                    )}
                    {subject.teacher_name && (
                        <View style={styles.detailItem}>
                            <Ionicons name="person-outline" size={14} color={colors.text.tertiary} />
                            <Text style={styles.detailText} numberOfLines={1}>
                                {subject.teacher_name}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Live Indicator
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success.primary,
    },
    liveText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.success.primary,
    },

    // Card
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderLeftWidth: 4,
        ...shadows.md,
    },
    cardLive: {
        backgroundColor: colors.success.subtle,
        borderWidth: 1,
        borderColor: colors.success.primary + '30',
    },
    cardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },

    // Countdown
    countdownBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.accent.subtle,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
        marginBottom: spacing.sm,
    },
    countdownBadgeLive: {
        backgroundColor: colors.success.primary,
    },
    countdownText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    countdownTextLive: {
        color: colors.text.inverse,
    },

    // Subject
    subjectContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    subjectDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    subjectName: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        flex: 1,
    },

    // Time
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    timeText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },

    // Details
    detailsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    detailText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Empty State
    emptyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.md,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContent: {
        flex: 1,
    },
    emptyTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Free Day
    freeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success.subtle,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.md,
    },
    freeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    freeEmoji: {
        fontSize: 24,
    },
    freeContent: {
        flex: 1,
    },
    freeTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.success.primary,
    },
    freeText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },

    // Loading
    loadingCard: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
});
