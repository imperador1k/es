import { formatTime, PomodoroMode, usePomodoro } from '@/hooks/usePomodoro';
import { useProfile } from '@/providers/ProfileProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface FocusTask {
    id: string;
    title: string;
    estimate: number;
    completedPomodoros: number;
    done: boolean;
    createdAt: number;
}

interface PomodoroPrefs {
    autoStartBreaks: boolean;
    autoStartFocus: boolean;
}

const DEFAULT_PREFS: PomodoroPrefs = {
    autoStartBreaks: true,
    autoStartFocus: false,
};

interface PomodoroContextType {
    mode: PomodoroMode;
    isRunning: boolean;
    isPaused: boolean;
    timeRemaining: number;
    focusTotalEnabled: boolean;
    sessionsCompleted: number;
    showCompletionModal: boolean;
    lastSessionXP: number;
    startTimer: () => Promise<void>;
    pauseTimer: () => Promise<void>;
    resumeTimer: () => Promise<void>;
    stopTimer: () => Promise<void>;
    resetTimer: () => Promise<void>;
    skipToNext: () => Promise<void>;
    changeMode: (mode: PomodoroMode) => void;
    toggleFocusTotal: () => void;
    dismissCompletionModal: () => void;
    modeDurations: Record<PomodoroMode, number>;
    config: ReturnType<typeof usePomodoro>['config'];
    updateConfig: ReturnType<typeof usePomodoro>['updateConfig'];

    tasks: FocusTask[];
    activeTask: FocusTask | null;
    activeCount: number;
    activeTaskId: string | null;
    setActiveTaskId: (id: string | null) => void;
    addTask: (title: string) => void;
    deleteTask: (id: string) => void;
    toggleTaskDone: (id: string) => void;
    changeEstimate: (id: string, delta: number) => void;
    clearCompleted: () => void;

    prefs: PomodoroPrefs;
    setPrefs: (partial: Partial<PomodoroPrefs>) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

function tasksKey(userId?: string) {
    return `@pomodoro_tasks_${userId || 'guest'}`;
}

function prefsKey(userId?: string) {
    return `@pomodoro_prefs_${userId || 'guest'}`;
}

function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
    const { profile } = useProfile();
    const userId = profile?.id;

    const pomodoro = usePomodoro(userId);

    const [tasks, setTasks] = useState<FocusTask[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [prefs, setPrefsState] = useState<PomodoroPrefs>(DEFAULT_PREFS);

    const activeTaskIdRef = useRef<string | null>(null);
    const prevModeRef = useRef<PomodoroMode | null>(null);
    const prevRunningRef = useRef(false);

    const activeTask = useMemo(
        () => tasks.find(t => t.id === activeTaskId) || null,
        [tasks, activeTaskId]
    );
    const activeCount = useMemo(() => tasks.filter(t => !t.done).length, [tasks]);

    useEffect(() => {
        activeTaskIdRef.current = activeTaskId;
    }, [activeTaskId]);

    const persistTasks = useCallback(async (next: FocusTask[]) => {
        setTasks(next);
        try {
            await AsyncStorage.setItem(tasksKey(userId), JSON.stringify(next));
        } catch (err) {
            console.error('Erro ao guardar tarefas:', err);
        }
    }, [userId]);

    useEffect(() => {
        let mounted = true;
        const loadAll = async () => {
            try {
                const [rawTasks, rawPrefs] = await Promise.all([
                    AsyncStorage.getItem(tasksKey(userId)),
                    AsyncStorage.getItem(prefsKey(userId)),
                ]);
                if (!mounted) return;
                if (rawTasks) setTasks(JSON.parse(rawTasks));
                if (rawPrefs) setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(rawPrefs) });
            } catch (err) {
                console.error('Erro ao carregar dados do pomodoro:', err);
            }
        };
        loadAll();
        return () => {
            mounted = false;
        };
    }, [userId]);

    const setPrefs = useCallback((partial: Partial<PomodoroPrefs>) => {
        setPrefsState(prev => {
            const next = { ...prev, ...partial };
            AsyncStorage.setItem(prefsKey(userId), JSON.stringify(next)).catch(() => {});
            return next;
        });
    }, [userId]);

    const addTask = useCallback((title: string) => {
        const clean = title.trim();
        if (!clean) return;
        const task: FocusTask = {
            id: makeId(),
            title: clean,
            estimate: 1,
            completedPomodoros: 0,
            done: false,
            createdAt: Date.now(),
        };
        persistTasks([task, ...tasks]);
        setActiveTaskId(prev => prev || task.id);
    }, [tasks, persistTasks]);

    const deleteTask = useCallback((id: string) => {
        persistTasks(tasks.filter(t => t.id !== id));
        setActiveTaskId(prev => (prev === id ? null : prev));
    }, [tasks, persistTasks]);

    const toggleTaskDone = useCallback((id: string) => {
        persistTasks(tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
    }, [tasks, persistTasks]);

    const changeEstimate = useCallback((id: string, delta: number) => {
        persistTasks(tasks.map(t => {
            if (t.id !== id) return t;
            return { ...t, estimate: Math.max(0, Math.min(12, t.estimate + delta)) };
        }));
    }, [tasks, persistTasks]);

    const clearCompleted = useCallback(() => {
        persistTasks(tasks.filter(t => !t.done));
    }, [tasks, persistTasks]);

    const incrementTaskPomodoro = useCallback((id: string) => {
        persistTasks(tasks.map(t => {
            if (t.id !== id) return t;
            const next = t.completedPomodoros + 1;
            return { ...t, completedPomodoros: next, done: next >= t.estimate && t.estimate > 0 ? true : t.done };
        }));
    }, [tasks, persistTasks]);

    useEffect(() => {
        if (pomodoro.showCompletionModal && activeTaskIdRef.current) {
            incrementTaskPomodoro(activeTaskIdRef.current);
        }
    }, [pomodoro.showCompletionModal, incrementTaskPomodoro]);

    useEffect(() => {
        const wasRunning = prevRunningRef.current;
        const prevMode = prevModeRef.current;
        prevModeRef.current = pomodoro.mode;
        prevRunningRef.current = pomodoro.isRunning;

        if (prevMode && prevMode !== pomodoro.mode && wasRunning && !pomodoro.isRunning && !pomodoro.isPaused) {
            if (pomodoro.mode === 'focus' && prefs.autoStartFocus) {
                pomodoro.startTimer();
            } else if (pomodoro.mode !== 'focus' && prefs.autoStartBreaks) {
                pomodoro.startTimer();
            }
        }
    }, [
        pomodoro.mode,
        pomodoro.isRunning,
        pomodoro.isPaused,
        prefs.autoStartBreaks,
        prefs.autoStartFocus,
        pomodoro.startTimer,
    ]);

    const value = useMemo<PomodoroContextType>(() => ({
        mode: pomodoro.mode,
        isRunning: pomodoro.isRunning,
        isPaused: pomodoro.isPaused,
        timeRemaining: pomodoro.timeRemaining,
        focusTotalEnabled: pomodoro.focusTotalEnabled,
        sessionsCompleted: pomodoro.sessionsCompleted,
        showCompletionModal: pomodoro.showCompletionModal,
        lastSessionXP: pomodoro.lastSessionXP,
        startTimer: pomodoro.startTimer,
        pauseTimer: pomodoro.pauseTimer,
        resumeTimer: pomodoro.resumeTimer,
        stopTimer: pomodoro.stopTimer,
        resetTimer: pomodoro.resetTimer,
        skipToNext: pomodoro.skipToNext,
        changeMode: pomodoro.changeMode,
        toggleFocusTotal: pomodoro.toggleFocusTotal,
        dismissCompletionModal: pomodoro.dismissCompletionModal,
        modeDurations: pomodoro.modeDurations,
        config: pomodoro.config,
        updateConfig: pomodoro.updateConfig,

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
    }), [
        pomodoro,
        tasks,
        activeTask,
        activeCount,
        activeTaskId,
        prefs,
        setPrefs,
        addTask,
        deleteTask,
        toggleTaskDone,
        changeEstimate,
        clearCompleted,
    ]);

    return (
        <PomodoroContext.Provider value={value}>
            {children}
        </PomodoroContext.Provider>
    );
}

export function usePomodoroContext() {
    const context = useContext(PomodoroContext);
    if (!context) {
        throw new Error('usePomodoroContext must be used within PomodoroProvider');
    }
    return context;
}

export { formatTime };
