/**
 * WeeklyScheduleGrid Component
 * Vista semanal do horário - Premium Dark Theme
 */

import { useSchedule } from '@/hooks/useSubjects';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
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

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5];
const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const TIME_COLUMN_WIDTH = 50;
const HEADER_HEIGHT = 48;
const HOUR_HEIGHT = 56;
const MIN_CLASS_HEIGHT = 28;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_COLUMN_WIDTH = (SCREEN_WIDTH - TIME_COLUMN_WIDTH - SPACING.lg * 2) / 5;

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
    if (!timeStr) {
        console.warn('⚠️ parseTimeToMinutes: empty timeStr');
        return 0;
    }

    // Remove any extra characters, get just HH:MM or HH:MM:SS
    const cleanTime = timeStr.trim();
    const parts = cleanTime.split(':');

    if (parts.length < 2) {
        console.warn(`⚠️ parseTimeToMinutes: invalid format "${timeStr}"`);
        return 0;
    }

    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;

    const totalMinutes = hours * 60 + minutes;

    console.log(`⏱️ parseTimeToMinutes: "${timeStr}" → ${hours}h ${minutes}m = ${totalMinutes} minutes`);

    return totalMinutes;
}

function getClassPosition(startTime: string, endTime: string) {
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    const startOffset = startMinutes - START_HOUR * 60; // START_HOUR = 8, so 8*60 = 480
    const duration = endMinutes - startMinutes;

    const top = (startOffset / 60) * HOUR_HEIGHT;
    const height = Math.max((duration / 60) * HOUR_HEIGHT - 2, MIN_CLASS_HEIGHT);

    console.log(`📍 getClassPosition: "${startTime}" → "${endTime}"`);
    console.log(`   startMinutes=${startMinutes}, endMinutes=${endMinutes}`);
    console.log(`   startOffset=${startOffset} (${startMinutes} - ${START_HOUR * 60})`);
    console.log(`   top=${top}px, height=${height}px`);

    return { top, height };
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
    const { schedule, getScheduleByDay } = useSchedule();
    const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

    const scheduleByDay = useMemo(() => getScheduleByDay(), [schedule]);

    // Debug: Log schedule data
    useEffect(() => {
        if (schedule.length > 0) {
            console.log('📅 WeeklyScheduleGrid - Schedule loaded:');
            schedule.forEach((s) => {
                console.log(`  - ${s.subject.name}: day=${s.day_of_week}, start=${s.start_time}, end=${s.end_time}`);
            });
        }
    }, [schedule]);

    useEffect(() => {
        const updateTime = () => setCurrentTimePosition(getCurrentTimePosition());
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            {/* Header row with days */}
            <View style={styles.headerRow}>
                <View style={styles.timeColumnHeader} />
                {DAYS.map((day, index) => (
                    <View key={day} style={[styles.dayHeader, isToday(day) && styles.dayHeaderToday]}>
                        <Text style={[styles.dayLabel, isToday(day) && styles.dayLabelToday]}>
                            {DAY_LABELS[index]}
                        </Text>
                        {isToday(day) && <View style={styles.todayDot} />}
                    </View>
                ))}
            </View>

            {/* Scrollable grid */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.gridContainer}>
                    {/* Time column */}
                    <View style={styles.timeColumn}>
                        {HOURS.map((hour) => (
                            <View key={hour} style={styles.timeSlot}>
                                <Text style={styles.timeText}>{hour.toString().padStart(2, '0')}:00</Text>
                            </View>
                        ))}
                    </View>

                    {/* Day columns with grid lines */}
                    <View style={styles.daysContainer}>
                        {/* Grid lines */}
                        {HOURS.map((hour) => (
                            <View key={`line-${hour}`} style={[styles.gridLine, { top: (hour - START_HOUR) * HOUR_HEIGHT }]} />
                        ))}

                        {/* Current time indicator */}
                        {currentTimePosition !== null && (
                            <View style={[styles.currentTimeIndicator, { top: currentTimePosition }]}>
                                <View style={styles.currentTimeDot} />
                                <View style={styles.currentTimeLine} />
                            </View>
                        )}

                        {/* Day columns */}
                        {DAYS.map((day) => {
                            const sessions = scheduleByDay[day] || [];
                            return (
                                <View key={day} style={[styles.dayColumn, isToday(day) && styles.dayColumnToday]}>
                                    {/* Tappable hour slots */}
                                    {HOURS.map((hour) => (
                                        <TouchableOpacity
                                            key={`slot-${day}-${hour}`}
                                            style={[
                                                styles.hourSlot,
                                                { transform: [{ translateY: (hour - START_HOUR) * HOUR_HEIGHT }] }
                                            ]}
                                            activeOpacity={0.7}
                                            onPress={() => onEmptySlotPress?.(day, hour)}
                                        >
                                            <View style={styles.hourSlotInner} />
                                        </TouchableOpacity>
                                    ))}

                                    {/* Class blocks - use transform for Android compatibility */}
                                    {sessions.map((session) => {
                                        const { top, height } = getClassPosition(session.start_time, session.end_time);
                                        const isCompact = height < 45;

                                        return (
                                            <View
                                                key={session.id}
                                                style={[
                                                    styles.classBlock,
                                                    {
                                                        height,
                                                        transform: [{ translateY: top }],
                                                        backgroundColor: `${session.subject.color}25`,
                                                        borderLeftColor: session.subject.color,
                                                    },
                                                ]}
                                            >
                                                <Pressable
                                                    style={({ pressed }) => [
                                                        styles.classBlockInner,
                                                        pressed && styles.classBlockPressed,
                                                    ]}
                                                    onPress={() => onClassPress?.(session)}
                                                >
                                                    <Text
                                                        style={[styles.classTitle, { color: session.subject.color }, isCompact && styles.classTitleCompact]}
                                                        numberOfLines={isCompact ? 1 : 2}
                                                    >
                                                        {session.subject.name}
                                                    </Text>
                                                    {!isCompact && (
                                                        <View style={styles.classDetails}>
                                                            <Text style={styles.classTime}>{session.start_time.slice(0, 5)}</Text>
                                                            <View style={[styles.classTypeBadge, { backgroundColor: `${session.subject.color}40` }]}>
                                                                <Text style={[styles.classTypeText, { color: session.subject.color }]}>
                                                                    {CLASS_TYPE_SHORT[session.type]}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                    {!isCompact && session.room && (
                                                        <Text style={styles.classRoom} numberOfLines={1}>📍 {session.room}</Text>
                                                    )}
                                                </Pressable>
                                            </View>
                                        );
                                    })}
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
// STYLES - PREMIUM DARK THEME
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.sm,
    },

    // Header
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        backgroundColor: COLORS.surface,
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
        borderLeftColor: 'rgba(255,255,255,0.05)',
    },
    dayHeaderToday: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
    },
    dayLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
    dayLabelToday: {
        color: '#6366F1',
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#6366F1',
        marginTop: 3,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: SPACING.xl,
    },

    // Grid
    gridContainer: {
        flexDirection: 'row',
    },

    // Time column
    timeColumn: {
        width: TIME_COLUMN_WIDTH,
        backgroundColor: COLORS.background,
    },
    timeSlot: {
        height: HOUR_HEIGHT,
        justifyContent: 'flex-start',
        paddingTop: 2,
        paddingRight: SPACING.sm,
    },
    timeText: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.tertiary,
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
        backgroundColor: 'rgba(255,255,255,0.05)',
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
        backgroundColor: '#EF4444',
        marginLeft: -5,
    },
    currentTimeLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#EF4444',
    },

    // Day column
    dayColumn: {
        width: DAY_COLUMN_WIDTH,
        height: HOURS.length * HOUR_HEIGHT,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
    },
    dayColumnToday: {
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },

    // Hour slot - now positioned absolutely for Android compatibility
    hourSlot: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: HOUR_HEIGHT,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)',
        backgroundColor: 'transparent',
    },
    hourSlotInner: {
        flex: 1,
        width: '100%',
    },

    // Class block - outer container uses transform
    classBlock: {
        position: 'absolute',
        top: 0, // Start from top, translateY moves it
        left: 2,
        right: 2,
        borderRadius: RADIUS.md,
        borderLeftWidth: 3,
        overflow: 'hidden',
        zIndex: 100,
        elevation: 5,
    },
    // Inner pressable fills the container
    classBlockInner: {
        flex: 1,
        padding: SPACING.xs,
    },
    classBlockPressed: {
        opacity: 0.8,
    },
    classTitle: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.weight.semibold,
        lineHeight: 13,
    },
    classTitleCompact: {
        fontSize: 10,
    },
    classDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: SPACING.xs,
    },
    classTime: {
        fontSize: 9,
        color: COLORS.text.tertiary,
    },
    classTypeBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    classTypeText: {
        fontSize: 8,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    classRoom: {
        fontSize: 9,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
});
