import Slider from '@react-native-community/slider';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { formatTime, getProgress, PomodoroMode } from '@/hooks/usePomodoro';
import { useCustomTracks } from '@/hooks/useCustomTracks';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useProfile } from '@/providers/ProfileProvider';
import { useAudioPlayerContext } from '@/providers/AudioPlayerProvider';
import { FocusTask, usePomodoroContext } from '@/providers/PomodoroProvider';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STROKE_WIDTH = 12;

const MODE_CONFIG: Record<PomodoroMode, { label: string; emoji: string; color: string; gradient: [string, string]; bgGradient: [string, string] }> = {
    focus: {
        label: 'Foco',
        emoji: '🍅',
        color: '#EF4444',
        gradient: ['#EF4444', '#DC2626'],
        bgGradient: ['#EF444415', '#DC262605'],
    },
    shortBreak: {
        label: 'Pausa Curta',
        emoji: '☕',
        color: '#10B981',
        gradient: ['#10B981', '#059669'],
        bgGradient: ['#10B98115', '#05966905'],
    },
    longBreak: {
        label: 'Pausa Longa',
        emoji: '🌟',
        color: '#6366F1',
        gradient: ['#6366F1', '#4F46E5'],
        bgGradient: ['#6366F115', '#4F46E505'],
    },
};

export default function PomodoroScreen() {
    useKeepAwake();

    const { profile } = useProfile();
    const userId = profile?.id;
    const { isDesktop, width } = useBreakpoints();

    const {
        mode,
        isRunning,
        isPaused,
        timeRemaining,
        focusTotalEnabled,
        sessionsCompleted,
        showCompletionModal,
        lastSessionXP,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        resetTimer,
        skipToNext,
        changeMode,
        toggleFocusTotal,
        dismissCompletionModal,
        modeDurations,
        config,
        updateConfig,
        tasks,
        activeTask,
        activeCount,
        activeTaskId,
        setActiveTaskId,
        addTask,
        deleteTask,
        toggleTaskDone,
        changeEstimate,
        clearCompleted,
        prefs,
        setPrefs,
    } = usePomodoroContext();

    const {
        isPlaying: audioPlaying,
        isLoading: audioLoading,
        currentStation,
        volume,
        playStation,
        stop: stopAudio,
        setVolume,
        stations,
    } = useAudioPlayerContext();

    const { tracks: customTracks, loading: tracksLoading, pickAndUpload, deleteTrack } = useCustomTracks(userId);

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [uploading, setUploading] = useState(false);

    const CIRCLE_SIZE = isDesktop ? 330 : Math.min(width * 0.72, 300);
    const TIMER_RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

    const modeConfig = MODE_CONFIG[mode];
    const totalDuration = modeDurations[mode];
    const progress = getProgress(timeRemaining, totalDuration);
    const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

    const customStations = customTracks.map(t => ({
        id: `custom-${t.id}`,
        name: t.name,
        emoji: '🎵',
        streamUrl: t.url,
        description: 'A tua música',
        loop: true,
        isCustom: true,
    }));

    const allStations = [...stations, ...customStations];

    const handleUpload = useCallback(async () => {
        setUploading(true);
        const track = await pickAndUpload();
        setUploading(false);
        if (track) {
            await playStation({
                id: `custom-${track.id}`,
                name: track.name,
                emoji: '🎵',
                streamUrl: track.url,
                description: 'A tua música',
                loop: true,
                isCustom: true,
            });
        }
    }, [pickAndUpload, playStation]);

    const handleDeleteTrack = useCallback(async (trackId: string) => {
        const track = customTracks.find(t => t.id === trackId);
        if (!track) return;
        if (currentStation?.id === `custom-${trackId}`) {
            await stopAudio();
        }
        await deleteTrack(track);
    }, [customTracks, currentStation, deleteTrack, stopAudio]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={modeConfig.bgGradient}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.5 }}
            />

            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={[
                    styles.scrollContent,
                    isDesktop && styles.scrollContentDesktop,
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* ========== HEADER ========== */}
                <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Pomodoro</Text>
                    <Pressable style={styles.settingsButton} onPress={() => setShowSettings(true)}>
                        <Ionicons name="settings-outline" size={20} color={COLORS.text.primary} />
                    </Pressable>
                </Animated.View>

                <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
                    {/* ========== LEFT: TASK LIST ========== */}
                    <Animated.View entering={FadeInDown.delay(100)} style={[styles.tasksColumn, isDesktop && styles.tasksColumnDesktop]}>
                        <View style={styles.tasksCard}>
                            <View style={styles.tasksHeader}>
                                <View style={styles.tasksTitleRow}>
                                    <Text style={styles.tasksTitle}>Tarefas</Text>
                                    <View style={styles.tasksCountBadge}>
                                        <Text style={styles.tasksCountText}>{activeCount}</Text>
                                    </View>
                                </View>
                                {tasks.some(t => t.done) && (
                                    <Pressable onPress={clearCompleted}>
                                        <Text style={styles.clearDone}>Limpar concluídas</Text>
                                    </Pressable>
                                )}
                            </View>

                            <ScrollView style={styles.tasksList} showsVerticalScrollIndicator={false}>
                                {tasks.map(task => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        isActive={task.id === activeTaskId}
                                        onPress={() => setActiveTaskId(task.id)}
                                        onToggleDone={() => toggleTaskDone(task.id)}
                                        onDelete={() => deleteTask(task.id)}
                                        onChangeEstimate={(delta) => changeEstimate(task.id, delta)}
                                    />
                                ))}
                                {tasks.length === 0 && (
                                    <View style={styles.emptyTasks}>
                                        <Text style={styles.emptyTasksEmoji}>🍅</Text>
                                        <Text style={styles.emptyTasksTitle}>Sem tarefas</Text>
                                        <Text style={styles.emptyTasksSubtitle}>Cada 🍅 vale um ciclo de foco completo (ex.: 25min). Estimativa = nº de ciclos para terminar a tarefa.</Text>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={styles.addTaskRow}>
                                <Ionicons name="add" size={20} color={COLORS.text.tertiary} />
                                <TextInput
                                    style={styles.addTaskInput}
                                    placeholder="Adicionar tarefa..."
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={newTaskTitle}
                                    onChangeText={setNewTaskTitle}
                                    onSubmitEditing={() => { addTask(newTaskTitle); setNewTaskTitle(''); }}
                                    returnKeyType="done"
                                    maxLength={60}
                                />
                                {newTaskTitle.trim().length > 0 && (
                                    <Pressable style={styles.addTaskButton} onPress={() => { addTask(newTaskTitle); setNewTaskTitle(''); }}>
                                        <Ionicons name="checkmark" size={16} color="#FFF" />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {isDesktop && (
                            <Animated.View entering={FadeInUp.delay(400)} style={styles.statsCard}>
                                <Text style={styles.statsSectionTitle}>📊 Estatísticas</Text>
                                <View style={styles.statsGrid}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{sessionsCompleted}</Text>
                                        <Text style={styles.statLabel}>Sessões</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statValue}>{sessionsCompleted * config.focusDuration}m</Text>
                                        <Text style={styles.statLabel}>Foco Total</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={[styles.statValue, { color: '#FFD700' }]}>
                                            {sessionsCompleted * (focusTotalEnabled ? config.xpBase + config.xpFocusBonus : config.xpBase)}
                                        </Text>
                                        <Text style={styles.statLabel}>XP</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        )}
                    </Animated.View>

                    {/* ========== RIGHT: TIMER ========== */}
                    <View style={[styles.timerColumn, isDesktop && styles.timerColumnDesktop]}>
                        <Animated.View entering={FadeInUp.delay(150)} style={styles.modeTabs}>
                            {(Object.keys(MODE_CONFIG) as PomodoroMode[]).map((m) => {
                                const isActive = mode === m;
                                return (
                                    <Pressable
                                        key={m}
                                        style={[styles.modeTab, isActive && { backgroundColor: MODE_CONFIG[m].color }]}
                                        onPress={() => changeMode(m)}
                                        disabled={isRunning || isPaused}
                                    >
                                        <Text style={styles.modeEmoji}>{MODE_CONFIG[m].emoji}</Text>
                                        <Text style={[styles.modeLabel, isActive && styles.modeLabelActive]}>
                                            {MODE_CONFIG[m].label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </Animated.View>

                        <View style={styles.taskLabelRow}>
                            <Text style={styles.taskLabelText} numberOfLines={1}>
                                {activeTask ? `#${tasks.findIndex(t => t.id === activeTask.id) + 1} · ${activeTask.title}` : 'Sem tarefa ativa'}
                            </Text>
                        </View>

                        <Animated.View entering={FadeInUp.delay(200)} style={styles.timerWrap}>
                            <View style={[styles.timerOuter, { width: CIRCLE_SIZE + 40, height: CIRCLE_SIZE + 40 }]}>
                                <View style={[
                                    styles.timerGlow,
                                    {
                                        backgroundColor: modeConfig.color,
                                        opacity: isRunning ? 0.25 : 0.08,
                                        width: CIRCLE_SIZE + 40,
                                        height: CIRCLE_SIZE + 40,
                                        borderRadius: (CIRCLE_SIZE + 40) / 2,
                                    }
                                ]} />
                                <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
                                        <Defs>
                                            <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <Stop offset="0%" stopColor={modeConfig.gradient[0]} />
                                                <Stop offset="100%" stopColor={modeConfig.gradient[1]} />
                                            </SvgGradient>
                                        </Defs>
                                        <Circle
                                            cx={CIRCLE_SIZE / 2}
                                            cy={CIRCLE_SIZE / 2}
                                            r={TIMER_RADIUS}
                                            stroke={COLORS.surfaceMuted}
                                            strokeWidth={STROKE_WIDTH}
                                            fill="transparent"
                                        />
                                        <Circle
                                            cx={CIRCLE_SIZE / 2}
                                            cy={CIRCLE_SIZE / 2}
                                            r={TIMER_RADIUS}
                                            stroke="url(#progressGradient)"
                                            strokeWidth={STROKE_WIDTH}
                                            fill="transparent"
                                            strokeLinecap="round"
                                            strokeDasharray={CIRCUMFERENCE}
                                            strokeDashoffset={strokeDashoffset}
                                            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                                        />
                                    </Svg>
                                </View>
                                <View style={[styles.timerContent, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}>
                                    <Text style={[styles.timerText, { color: modeConfig.color }]}>
                                        {formatTime(timeRemaining)}
                                    </Text>
                                    <View style={styles.modeIndicator}>
                                        <Text style={styles.modeIndicatorEmoji}>{modeConfig.emoji}</Text>
                                        <Text style={[styles.modeIndicatorText, { color: modeConfig.color }]}>{modeConfig.label}</Text>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInUp.delay(300)} style={styles.controls}>
                            <Pressable
                                style={[styles.controlButton, styles.secondaryControl]}
                                onPress={isRunning || isPaused ? stopTimer : resetTimer}
                            >
                                <Ionicons
                                    name={isRunning || isPaused ? 'stop' : 'refresh'}
                                    size={22}
                                    color={isRunning || isPaused ? '#EF4444' : COLORS.text.secondary}
                                />
                            </Pressable>

                            <Pressable
                                style={styles.mainControl}
                                onPress={isRunning ? pauseTimer : isPaused ? resumeTimer : startTimer}
                            >
                                <LinearGradient colors={modeConfig.gradient} style={[styles.mainControlGradient, isDesktop && styles.mainControlGradientDesktop]}>
                                    <Ionicons name={isRunning ? 'pause' : 'play'} size={44} color="#FFF" />
                                </LinearGradient>
                            </Pressable>

                            <Pressable style={[styles.controlButton, styles.secondaryControl]} onPress={skipToNext}>
                                <Ionicons name="play-forward" size={22} color={COLORS.text.secondary} />
                            </Pressable>
                        </Animated.View>

                        {/* ========== AMBIENT SOUNDS ========== */}
                        <Animated.View entering={FadeInUp.delay(350)} style={styles.soundsCard}>
                            <View style={styles.soundsHeader}>
                                <View style={styles.soundsTitleRow}>
                                    <Ionicons name="musical-notes" size={16} color="#10B981" />
                                    <Text style={styles.soundsTitle}>Sons de Fundo</Text>
                                </View>
                                {currentStation && audioPlaying && (
                                    <View style={styles.playingBadge}>
                                        <View style={styles.playingDot} />
                                        <Text style={styles.playingText}>a tocar</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.stationGrid}>
                                {allStations.map((s) => {
                                    const isCurrent = currentStation?.id === s.id;
                                    const isPlaying = isCurrent && audioPlaying;
                                    const isCustom = !!s.isCustom;
                                    return (
                                        <View key={s.id} style={styles.stationWrap}>
                                            <Pressable
                                                style={[styles.stationChip, isCurrent && { borderColor: '#10B981', backgroundColor: '#10B98115' }]}
                                                onPress={() => {
                                                    if (isCurrent && audioPlaying) {
                                                        stopAudio();
                                                    } else {
                                                        playStation(s);
                                                    }
                                                }}
                                            >
                                                <Text style={styles.stationEmoji}>{s.emoji}</Text>
                                                <Text style={[styles.stationName, isCurrent && { color: '#10B981' }]} numberOfLines={1}>
                                                    {s.name}
                                                </Text>
                                                {isPlaying && <Ionicons name="volume-high" size={12} color="#10B981" />}
                                                {audioLoading && isCurrent && <ActivityIndicator size="small" color="#10B981" />}
                                            </Pressable>
                                            {isCustom && (
                                                <Pressable
                                                    style={styles.stationDelete}
                                                    hitSlop={6}
                                                    onPress={() => {
                                                        const customId = s.id.replace('custom-', '');
                                                        handleDeleteTrack(customId);
                                                    }}
                                                >
                                                    <Ionicons name="close-circle" size={16} color={COLORS.text.tertiary} />
                                                </Pressable>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>

                            <Pressable style={styles.uploadRow} onPress={handleUpload} disabled={uploading}>
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#6366F1" />
                                ) : (
                                    <Ionicons name="cloud-upload-outline" size={16} color="#6366F1" />
                                )}
                                <Text style={styles.uploadText}>
                                    {uploading ? 'A enviar...' : 'Carregar a tua música'}
                                </Text>
                            </Pressable>

                            <View style={styles.volumeRow}>
                                <Ionicons name="volume-low" size={16} color={COLORS.text.tertiary} />
                                <Slider
                                    style={styles.volumeSlider}
                                    minimumValue={0}
                                    maximumValue={1}
                                    value={volume}
                                    onValueChange={setVolume}
                                    minimumTrackTintColor="#10B981"
                                    maximumTrackTintColor={COLORS.surfaceMuted}
                                    thumbTintColor="#10B981"
                                />
                                <Ionicons name="volume-high" size={16} color={COLORS.text.tertiary} />
                            </View>
                        </Animated.View>

                        {/* ========== FOCUS TOTAL / XP ========== */}
                        <Animated.View entering={FadeInUp.delay(400)} style={styles.focusSection}>
                            {mode === 'focus' ? (
                                <Pressable
                                    style={[styles.focusCard, focusTotalEnabled && { borderColor: '#10B981' }]}
                                    onPress={toggleFocusTotal}
                                    disabled={isRunning}
                                >
                                    <View style={[styles.focusIcon, { backgroundColor: focusTotalEnabled ? '#10B98120' : COLORS.surfaceMuted }]}>
                                        <Ionicons name="shield-checkmark" size={20} color={focusTotalEnabled ? '#10B981' : COLORS.text.tertiary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.focusTitle}>Foco Total</Text>
                                        <Text style={styles.focusSubtitle}>
                                            {focusTotalEnabled
                                                ? `Bónus +${config.xpFocusBonus} XP ativo`
                                                : `Toque para ativar (bónus +${config.xpFocusBonus} XP)`}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={focusTotalEnabled}
                                        onValueChange={toggleFocusTotal}
                                        trackColor={{ false: COLORS.surfaceMuted, true: '#10B981' }}
                                        thumbColor="#FFF"
                                        disabled={isRunning}
                                    />
                                </Pressable>
                            ) : (
                                <View style={styles.xpCard}>
                                    <Ionicons name="flash" size={16} color="#FFD700" />
                                    <Text style={styles.xpText}>As pausas não dão XP — descansa bem! 🎯</Text>
                                </View>
                            )}
                        </Animated.View>
                    </View>
                </View>
            </ScrollView>

            {/* ========== SETTINGS MODAL ========== */}
            <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.settingsModal}>
                        <View style={styles.modalHandle} />
                        <View style={styles.settingsHeader}>
                            <Text style={styles.settingsTitle}>Definições</Text>
                            <Pressable onPress={() => setShowSettings(false)} style={styles.settingsClose}>
                                <Ionicons name="close" size={22} color={COLORS.text.primary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.settingsSectionLabel}>Durações (minutos)</Text>
                            <DurationRow
                                label="Foco"
                                value={config.focusDuration}
                                color="#EF4444"
                                onMinus={() => updateConfig({ focusDuration: Math.max(1, config.focusDuration - 1) })}
                                onPlus={() => updateConfig({ focusDuration: Math.min(120, config.focusDuration + 1) })}
                            />
                            <DurationRow
                                label="Pausa Curta"
                                value={config.shortBreakDuration}
                                color="#10B981"
                                onMinus={() => updateConfig({ shortBreakDuration: Math.max(1, config.shortBreakDuration - 1) })}
                                onPlus={() => updateConfig({ shortBreakDuration: Math.min(60, config.shortBreakDuration + 1) })}
                            />
                            <DurationRow
                                label="Pausa Longa"
                                value={config.longBreakDuration}
                                color="#6366F1"
                                onMinus={() => updateConfig({ longBreakDuration: Math.max(1, config.longBreakDuration - 1) })}
                                onPlus={() => updateConfig({ longBreakDuration: Math.min(90, config.longBreakDuration + 1) })}
                            />

                            <Text style={styles.settingsSectionLabel}>Intervalos</Text>
                            <DurationRow
                                label="Sessões antes da pausa longa"
                                value={config.sessionsBeforeLongBreak}
                                color="#F59E0B"
                                onMinus={() => updateConfig({ sessionsBeforeLongBreak: Math.max(2, config.sessionsBeforeLongBreak - 1) })}
                                onPlus={() => updateConfig({ sessionsBeforeLongBreak: Math.min(12, config.sessionsBeforeLongBreak + 1) })}
                            />

                            <Text style={styles.settingsSectionLabel}>Início automático</Text>
                            <View style={styles.autoStartRow}>
                                <View>
                                    <Text style={styles.autoStartLabel}>Iniciar intervalos</Text>
                                    <Text style={styles.autoStartHint}>Começa a pausa automaticamente após cada foco</Text>
                                </View>
                                <Switch
                                    value={prefs.autoStartBreaks}
                                    onValueChange={(v) => setPrefs({ autoStartBreaks: v })}
                                    trackColor={{ false: COLORS.surfaceMuted, true: '#10B981' }}
                                    thumbColor="#FFF"
                                />
                            </View>
                            <View style={styles.autoStartRow}>
                                <View>
                                    <Text style={styles.autoStartLabel}>Iniciar focos</Text>
                                    <Text style={styles.autoStartHint}>Começa o foco automaticamente após cada pausa</Text>
                                </View>
                                <Switch
                                    value={prefs.autoStartFocus}
                                    onValueChange={(v) => setPrefs({ autoStartFocus: v })}
                                    trackColor={{ false: COLORS.surfaceMuted, true: '#10B981' }}
                                    thumbColor="#FFF"
                                />
                            </View>

                            <Pressable style={styles.settingsDone} onPress={() => setShowSettings(false)}>
                                <LinearGradient colors={modeConfig.gradient} style={styles.settingsDoneGradient}>
                                    <Text style={styles.settingsDoneText}>Guardar</Text>
                                </LinearGradient>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <CompletionModal
                visible={showCompletionModal}
                xpEarned={lastSessionXP}
                focusTotalEnabled={focusTotalEnabled}
                sessionsCompleted={sessionsCompleted}
                modeColor={modeConfig.color}
                onDismiss={dismissCompletionModal}
            />
        </View>
    );
}

function TaskRow({
    task,
    isActive,
    onPress,
    onToggleDone,
    onDelete,
    onChangeEstimate,
}: {
    task: FocusTask;
    isActive: boolean;
    onPress: () => void;
    onToggleDone: () => void;
    onDelete: () => void;
    onChangeEstimate: (delta: number) => void;
}) {
    return (
        <Pressable style={[styles.taskRow, isActive && styles.taskRowActive]} onPress={onPress}>
            <Pressable style={[styles.taskCheckbox, task.done && styles.taskCheckboxDone]} onPress={onToggleDone}>
                {task.done && <Ionicons name="checkmark" size={13} color="#FFF" />}
            </Pressable>

            <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]} numberOfLines={1}>
                {task.title}
            </Text>

            <View style={styles.taskPomodoros}>
                {Array.from({ length: Math.min(task.estimate, 5) }).map((_, i) => (
                    <Text key={i} style={[styles.taskTomato, { opacity: i < task.completedPomodoros ? 1 : 0.25 }]}>
                        🍅
                    </Text>
                ))}
                {task.estimate > 5 && (
                    <Text style={styles.taskEstimateMore}>+{task.estimate - 5}</Text>
                )}
            </View>

            <View style={styles.taskActions}>
                <Pressable style={styles.estimateButton} onPress={() => onChangeEstimate(-1)}>
                    <Ionicons name="remove" size={14} color={COLORS.text.secondary} />
                </Pressable>
                <Text style={styles.estimateText}>{task.completedPomodoros}/{task.estimate}</Text>
                <Pressable style={styles.estimateButton} onPress={() => onChangeEstimate(1)}>
                    <Ionicons name="add" size={14} color={COLORS.text.secondary} />
                </Pressable>
                <Pressable style={styles.deleteButton} onPress={onDelete}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.text.tertiary} />
                </Pressable>
            </View>
        </Pressable>
    );
}

function DurationRow({
    label,
    value,
    color,
    onMinus,
    onPlus,
}: {
    label: string;
    value: number;
    color: string;
    onMinus: () => void;
    onPlus: () => void;
}) {
    return (
        <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>{label}</Text>
            <View style={styles.durationControls}>
                <Pressable style={[styles.durationButton, { borderColor: color }]} onPress={onMinus}>
                    <Ionicons name="remove" size={16} color={color} />
                </Pressable>
                <Text style={styles.durationValue}>{value}</Text>
                <Pressable style={[styles.durationButton, { borderColor: color }]} onPress={onPlus}>
                    <Ionicons name="add" size={16} color={color} />
                </Pressable>
            </View>
        </View>
    );
}

function CompletionModal({
    visible,
    xpEarned,
    focusTotalEnabled,
    sessionsCompleted,
    modeColor,
    onDismiss,
}: {
    visible: boolean;
    xpEarned: number;
    focusTotalEnabled: boolean;
    sessionsCompleted: number;
    modeColor: string;
    onDismiss: () => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <Animated.View entering={ZoomIn.springify()} style={styles.modalContent}>
                    <View style={styles.modalEmojiContainer}>
                        <Text style={styles.modalEmoji}>🎉</Text>
                    </View>

                    <Text style={styles.modalTitle}>Excelente!</Text>
                    <Text style={styles.modalSubtitle}>Sessão de foco concluída</Text>

                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.modalXpBadge}>
                        <Ionicons name="flash" size={26} color="#FFD700" />
                        <Text style={styles.modalXpText}>+{xpEarned} XP</Text>
                    </LinearGradient>

                    {focusTotalEnabled && (
                        <View style={styles.modalBonus}>
                            <Ionicons name="shield-checkmark" size={15} color="#10B981" />
                            <Text style={styles.modalBonusText}>Bónus Foco Total incluído!</Text>
                        </View>
                    )}

                    <View style={styles.modalStats}>
                        <View style={styles.modalStat}>
                            <Text style={styles.modalStatValue}>{sessionsCompleted}</Text>
                            <Text style={styles.modalStatLabel}>Sessões</Text>
                        </View>
                        <View style={styles.modalStatDivider} />
                        <View style={styles.modalStat}>
                            <Text style={styles.modalStatValue}>{sessionsCompleted * 25}m</Text>
                            <Text style={styles.modalStatLabel}>Foco Total</Text>
                        </View>
                    </View>

                    <Pressable style={styles.modalButton} onPress={onDismiss}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.modalButtonGradient}>
                            <Text style={styles.modalButtonText}>Continuar</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    settingsButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    scrollContent: {
        flexGrow: 1,
        paddingBottom: SPACING['2xl'],
    },
    scrollContentDesktop: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.sm,
    },

    mainLayout: {
        flex: 1,
    },
    mainLayoutDesktop: {
        flexDirection: 'row',
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        gap: SPACING['2xl'],
        alignItems: 'flex-start',
    },

    // ============ TASKS ============
    tasksColumn: {
        width: '100%',
    },
    tasksColumnDesktop: {
        flex: 0.42,
        minWidth: 360,
    },
    tasksCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    tasksHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.surfaceMuted,
    },
    tasksTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    tasksTitle: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    tasksCountBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    tasksCountText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    clearDone: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    tasksList: {
        maxHeight: 340,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.xs,
    },
    taskRowActive: {
        backgroundColor: COLORS.surfaceElevated,
    },
    taskCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: COLORS.text.tertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskCheckboxDone: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    taskTitle: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    taskTitleDone: {
        textDecorationLine: 'line-through',
        color: COLORS.text.tertiary,
    },
    taskPomodoros: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginRight: SPACING.xs,
    },
    taskTomato: {
        fontSize: 11,
    },
    taskEstimateMore: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },
    taskActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    estimateButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    estimateText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.weight.semibold,
        minWidth: 28,
        textAlign: 'center',
    },
    deleteButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addTaskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        margin: SPACING.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
    },
    addTaskInput: {
        flex: 1,
        paddingVertical: SPACING.sm,
        color: COLORS.text.primary,
        fontSize: TYPOGRAPHY.size.base,
    },
    addTaskButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTasks: {
        alignItems: 'center',
        paddingVertical: SPACING['3xl'],
    },
    emptyTasksEmoji: {
        fontSize: 36,
        marginBottom: SPACING.sm,
    },
    emptyTasksTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
    emptyTasksSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 4,
        textAlign: 'center',
        paddingHorizontal: SPACING.xl,
        lineHeight: 18,
    },

    // ============ TIMER ============
    timerColumn: {
        width: '100%',
        alignItems: 'center',
        paddingTop: SPACING.lg,
    },
    timerColumnDesktop: {
        flex: 0.58,
        alignItems: 'center',
        paddingTop: 0,
    },
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: 6,
        gap: SPACING.sm,
        width: '100%',
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.xl,
    },
    modeEmoji: {
        fontSize: 15,
    },
    modeLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    modeLabelActive: {
        color: '#FFF',
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    taskLabelRow: {
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.lg,
    },
    taskLabelText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    timerWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerOuter: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerGlow: {
        position: 'absolute',
        borderRadius: 9999,
    },
    timerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 60,
        fontWeight: TYPOGRAPHY.weight.bold,
        letterSpacing: -2,
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    modeIndicatorEmoji: {
        fontSize: 16,
    },
    modeIndicatorText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },

    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xl,
        marginVertical: SPACING.lg,
    },
    controlButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryControl: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.surface,
        ...SHADOWS.sm,
    },
    mainControl: {
        ...SHADOWS.lg,
    },
    mainControlGradient: {
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainControlGradientDesktop: {
        width: 92,
        height: 92,
        borderRadius: 46,
    },

    // ============ SOUNDS ============
    soundsCard: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        ...SHADOWS.sm,
    },
    soundsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    soundsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    soundsTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    playingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B98120',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    playingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    playingText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: '#10B981',
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    stationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    stationWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    stationEmoji: {
        fontSize: 14,
    },
    stationName: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        maxWidth: 100,
    },
    stationDelete: {
        marginLeft: -6,
        marginTop: -18,
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: '#6366F110',
        borderRadius: RADIUS.xl,
    },
    uploadText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#6366F1',
    },
    volumeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    volumeSlider: {
        flex: 1,
        height: 32,
    },

    // ============ FOCUS / XP ============
    focusSection: {
        width: '100%',
        marginTop: SPACING.md,
    },
    focusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'transparent',
        ...SHADOWS.sm,
    },
    focusIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    focusTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    focusSubtitle: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    xpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.full,
    },
    xpText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },

    // ============ STATS ============
    statsCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.xl,
        marginTop: SPACING.md,
        ...SHADOWS.sm,
    },
    statsSectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 4,
    },

    // ============ SETTINGS MODAL ============
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: LAYOUT.screenPadding,
    },
    settingsModal: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '85%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['3xl'],
        padding: SPACING.xl,
        paddingTop: SPACING.lg,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.surfaceMuted,
        alignSelf: 'center',
        marginBottom: SPACING.lg,
    },
    settingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    settingsTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    settingsClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsSectionLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
        marginTop: SPACING.lg,
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        marginBottom: SPACING.sm,
    },
    durationLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    durationControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    durationButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationValue: {
        fontSize: TYPOGRAPHY.size.md,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        minWidth: 32,
        textAlign: 'center',
    },
    autoStartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        marginBottom: SPACING.sm,
    },
    autoStartLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    autoStartHint: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
        maxWidth: 260,
    },
    settingsDone: {
        marginTop: SPACING.lg,
    },
    settingsDoneGradient: {
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
    },
    settingsDoneText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // ============ COMPLETION MODAL ============
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['3xl'],
        padding: SPACING['2xl'],
        alignItems: 'center',
        width: '100%',
        maxWidth: 420,
    },
    modalEmojiContainer: {
        marginBottom: SPACING.lg,
    },
    modalEmoji: {
        fontSize: 60,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    modalSubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xl,
    },
    modalXpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS['2xl'],
        marginBottom: SPACING.md,
    },
    modalXpText: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    modalBonus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: '#10B98120',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.xl,
    },
    modalBonusText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: '#10B981',
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    modalStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalStat: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    modalStatValue: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    modalStatLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    modalStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.surfaceMuted,
    },
    modalButton: {
        width: '100%',
    },
    modalButtonGradient: {
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
});
