import { usePomodoroContext } from '@/providers/PomodoroProvider';
import { useAudioPlayerContext } from '@/providers/AudioPlayerProvider';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const MODE_CONFIG: Record<string, { label: string; emoji: string; color: string; gradient: [string, string] }> = {
    focus: { label: 'Foco', emoji: '🍅', color: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
    shortBreak: { label: 'Pausa Curta', emoji: '☕', color: '#10B981', gradient: ['#10B981', '#059669'] },
    longBreak: { label: 'Pausa Longa', emoji: '🌟', color: '#6366F1', gradient: ['#6366F1', '#4F46E5'] },
};

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function PomodoroMiniPlayer() {
    const {
        mode,
        isRunning,
        isPaused,
        timeRemaining,
        activeTask,
        tasks,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
    } = usePomodoroContext();
    const { currentStation: audioStation } = useAudioPlayerContext();
    const pathname = usePathname();

    if (!isRunning && !isPaused) return null;
    if (pathname === '/pomodoro') return null;

    const config = MODE_CONFIG[mode] || MODE_CONFIG.focus;
    const audioVisible = !!audioStation;
    const taskLabel = activeTask
        ? `#${tasks.findIndex(t => t.id === activeTask.id) + 1} · ${activeTask.title}`
        : 'Sem tarefa ativa';

    return (
        <Pressable
            style={[styles.container, { bottom: audioVisible ? 168 : 92 }]}
            onPress={() => router.push('/pomodoro')}
        >
            <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentBar}
            />

            <Text style={styles.emoji}>{config.emoji}</Text>

            <View style={styles.info}>
                <Text style={[styles.label, { color: config.color }]} numberOfLines={1}>
                    {config.label}
                </Text>
                <Text style={styles.taskName} numberOfLines={1}>
                    {taskLabel}
                </Text>
            </View>

            <Text style={styles.time}>{formatTime(timeRemaining)}</Text>

            <View style={styles.controls}>
                <Pressable
                    style={styles.playButton}
                    hitSlop={8}
                    onPress={(e) => {
                        e.stopPropagation();
                        if (isRunning) pauseTimer();
                        else if (isPaused) resumeTimer();
                        else startTimer();
                    }}
                >
                    <Ionicons name={isRunning ? 'pause' : 'play'} size={18} color="#FFF" />
                </Pressable>
                <Pressable
                    style={styles.stopButton}
                    hitSlop={8}
                    onPress={(e) => {
                        e.stopPropagation();
                        stopTimer();
                    }}
                >
                    <Ionicons name="stop" size={16} color="#EF4444" />
                </Pressable>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: SPACING.md,
        right: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        paddingHorizontal: SPACING.md,
        overflow: 'hidden',
        ...SHADOWS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceMuted,
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    emoji: {
        fontSize: 22,
        marginRight: SPACING.sm,
    },
    info: {
        flex: 1,
    },
    label: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    taskName: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginTop: 1,
    },
    time: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginRight: SPACING.md,
        fontVariant: ['tabular-nums'],
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
