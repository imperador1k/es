/**
 * WeeklyScheduleGrid Component
 * Vista semanal do horário escolar estilo Google Calendar
 * Premium design com indicador de hora atual
 */

import { useSchedule } from '@/hooks/useSubjects';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { ClassSessionWithSubject, ClassType, DayOfWeek } from '@/types/database.types';
import { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ============================================
// CONSTANTS
// ============================================

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5]; // Segunda a Sexta
const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

// Horário escolar típico
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// Layout
const TIME_COLUMN_WIDTH = 48;
const HEADER_HEIGHT = 44;
const HOUR_HEIGHT = 60; // Pixels por hora
const MIN_CLASS_HEIGHT = 30;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_COLUMN_WIDTH = (SCREEN_WIDTH - TIME_COLUMN_WIDTH - spacing.lg * 2) / 5;

const CLASS_TYPE_SHORT: Record<ClassType, string> = {
    'T': 'T',
    'P': 'P',
    'TP': 'TP',
    'S': 'S',
    'PL': 'PL',
};

// ============================================
// HELPERS
// ============================================

function parseTimeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function getClassPosition(startTime: string, endTime: string) {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    const startOffset = startMinutes - START_HOUR * 60;
    const duration = endMinutes - startMinutes;

    return {
        top: (startOffset / 60) * HOUR_HEIGHT,
        height: Math.max((duration / 60) * HOUR_HEIGHT - 2, MIN_CLASS_HEIGHT),
    };
}

function getCurrentTimePosition(): number | null {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < START_HOUR || hours >= END_HOUR) return null;

    const offset = (hours - START_HOUR) * 60 + minutes;
    return (offset / 60) * HOUR_HEIGHT;
}

function isToday(dayOfWeek: DayOfWeek): boolean {
    const today = new Date().getDay();
    // JS: 0 = Sunday, our system: 1 = Monday
    return today === dayOfWeek;
}

// ============================================
// PROPS
// ============================================

interface WeeklyScheduleGridProps {
    onClassPress?: (session: ClassSessionWithSubject) => void;
    onEmptySlotPress?: (day: DayOfWeek, hour: number) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WeeklyScheduleGrid({ onClassPress, onEmptySlotPress }: WeeklyScheduleGridProps) {
    const { schedule, loading, getScheduleByDay } = useSchedule();
    const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

    const scheduleByDay = useMemo(() => getScheduleByDay(), [schedule]);

    // Debug log
    useEffect(() => {
        console.log('📅 WeeklyScheduleGrid mounted, schedule count:', schedule.length);
    }, [schedule.length]);

    // Update current time indicator
    useEffect(() => {
        const updateTime = () => {
            setCurrentTimePosition(getCurrentTimePosition());
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    // Note: Always show the grid so users can tap on empty slots to add classes
    // The empty state is only shown inside the grid as an overlay if needed

    return (
        <View style={styles.container}>
            {/* Header row with days */}
            <View style={styles.headerRow}>
                <View style={styles.timeColumnHeader} />
                {DAYS.map((day, index) => (
                    <View
                        key={day}
                        style={[
                            styles.dayHeader,
                            isToday(day) && styles.dayHeaderToday,
                        ]}
                    >
                        <Text style={[
                            styles.dayLabel,
                            isToday(day) && styles.dayLabelToday,
                        ]}>
                            {DAY_LABELS[index]}
                        </Text>
                        {isToday(day) && (
                            <View style={styles.todayDot} />
                        )}
                    </View>
                ))}
            </View>

            {/* Scrollable grid */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.gridContainer}>
                    {/* Time column */}
                    <View style={styles.timeColumn}>
                        {HOURS.map((hour) => (
                            <View key={hour} style={styles.timeSlot}>
                                <Text style={styles.timeText}>
                                    {hour.toString().padStart(2, '0')}:00
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Day columns with grid lines */}
                    <View style={styles.daysContainer}>
                        {/* Grid lines (horizontal) */}
                        {HOURS.map((hour) => (
                            <View
                                key={`line-${hour}`}
                                style={[
                                    styles.gridLine,
                                    { top: (hour - START_HOUR) * HOUR_HEIGHT },
                                ]}
                            />
                        ))}

                        {/* Current time indicator */}
                        {currentTimePosition !== null && (
                            <View
                                style={[
                                    styles.currentTimeIndicator,
                                    { top: currentTimePosition },
                                ]}
                            >
                                <View style={styles.currentTimeDot} />
                                <View style={styles.currentTimeLine} />
                            </View>
                        )}

                        {/* Day columns */}
                        {DAYS.map((day, dayIndex) => {
                            const sessions = scheduleByDay[day] || [];
                            return (
                                <View
                                    key={day}
                                    style={[
                                        styles.dayColumn,
                                        isToday(day) && styles.dayColumnToday,
                                    ]}
                                >
                                    {/* Tappable hour slots - using flex layout */}
                                    {HOURS.map((hour) => (
                                        <TouchableOpacity
                                            key={`slot-${day}-${hour}`}
                                            style={styles.hourSlot}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                console.log(`🕐 Slot pressed: Day ${day}, Hour ${hour}`);
                                                onEmptySlotPress?.(day, hour);
                                            }}
                                        >
                                            <View style={styles.hourSlotInner} />
                                        </TouchableOpacity>
                                    ))}

                                    {/* Absolute overlay for class blocks */}
                                    <View style={styles.classBlocksOverlay} pointerEvents="box-none">
                                        {sessions.map((session) => {
                                            const { top, height } = getClassPosition(
                                                session.start_time,
                                                session.end_time
                                            );
                                            const isCompact = height < 50;

                                            return (
                                                <Pressable
                                                    key={session.id}
                                                    style={({ pressed }) => [
                                                        styles.classBlock,
                                                        {
                                                            top,
                                                            height,
                                                            backgroundColor: session.subject.color + '20',
                                                            borderLeftColor: session.subject.color,
                                                        },
                                                        pressed && styles.classBlockPressed,
                                                    ]}
                                                    onPress={() => onClassPress?.(session)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.classTitle,
                                                            { color: session.subject.color },
                                                            isCompact && styles.classTitleCompact,
                                                        ]}
                                                        numberOfLines={isCompact ? 1 : 2}
                                                    >
                                                        {session.subject.name}
                                                    </Text>
                                                    {!isCompact && (
                                                        <View style={styles.classDetails}>
                                                            <Text style={styles.classTime}>
                                                                {session.start_time.slice(0, 5)}
                                                            </Text>
                                                            <View style={[
                                                                styles.classTypeBadge,
                                                                { backgroundColor: session.subject.color + '30' }
                                                            ]}>
                                                                <Text style={[
                                                                    styles.classTypeText,
                                                                    { color: session.subject.color }
                                                                ]}>
                                                                    {CLASS_TYPE_SHORT[session.type]}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    {!isCompact && session.room && (
                                                        <Text style={styles.classRoom} numberOfLines={1}>
                                                            📍 {session.room}
                                                        </Text>
                                                    )}
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Header
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: colors.surface,
    },
    timeColumnHeader: {
        width: TIME_COLUMN_WIDTH,
    },
    dayHeader: {
        width: DAY_COLUMN_WIDTH,
        height: HEADER_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderLeftColor: colors.divider,
    },
    dayHeaderToday: {
        backgroundColor: colors.accent.light,
    },
    dayLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
    },
    dayLabelToday: {
        color: colors.accent.primary,
        fontWeight: typography.weight.bold,
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.accent.primary,
        marginTop: 2,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },

    // Grid
    gridContainer: {
        flexDirection: 'row',
    },

    // Time column
    timeColumn: {
        width: TIME_COLUMN_WIDTH,
        backgroundColor: colors.background,
    },
    timeSlot: {
        height: HOUR_HEIGHT,
        justifyContent: 'flex-start',
        paddingTop: 2,
        paddingRight: spacing.sm,
    },
    timeText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        textAlign: 'right',
    },

    // Days container
    daysContainer: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
    },

    // Grid lines
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.divider,
    },

    // Current time indicator
    currentTimeIndicator: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
    },
    currentTimeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.danger.primary,
        marginLeft: -5,
    },
    currentTimeLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.danger.primary,
    },

    // Day column
    dayColumn: {
        width: DAY_COLUMN_WIDTH,
        height: HOURS.length * HOUR_HEIGHT,
        borderLeftWidth: 1,
        borderLeftColor: colors.divider,
        position: 'relative',
    },
    dayColumnToday: {
        backgroundColor: colors.accent.light + '30',
    },

    // Hour slot (tappable cells - using flex layout, NOT absolute)
    hourSlot: {
        height: HOUR_HEIGHT,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider + '50',
        backgroundColor: 'transparent',
    },
    hourSlotInner: {
        flex: 1,
        width: '100%',
    },

    // Overlay container for class blocks - absolute positioned to cover entire column
    classBlocksOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    // Class block (absolute positioned on top of flex slots)
    classBlock: {
        position: 'absolute',
        left: 2,
        right: 2,
        borderRadius: borderRadius.sm,
        borderLeftWidth: 3,
        padding: spacing.xs,
        overflow: 'hidden',
        zIndex: 100, // High z-index to be above hour slots
        elevation: 5, // Android elevation for proper stacking
    },
    classBlockPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    classTitle: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        lineHeight: 14,
    },
    classTitleCompact: {
        fontSize: 10,
    },
    classDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: spacing.xs,
    },
    classTime: {
        fontSize: 9,
        color: colors.text.tertiary,
    },
    classTypeBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    classTypeText: {
        fontSize: 8,
        fontWeight: typography.weight.bold,
    },
    classRoom: {
        fontSize: 9,
        color: colors.text.tertiary,
        marginTop: 2,
    },
});
