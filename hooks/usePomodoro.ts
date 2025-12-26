/**
 * usePomodoro Hook v2
 * Timer Pomodoro com Foreground Service (Notifee) e persistência
 */

import { supabase } from '@/lib/supabase';
import {
    clearNotificationActionCallback,
    displayPomodoroNotification,
    NOTIFICATION_ACTIONS,
    NotificationAction,
    setNotificationActionCallback,
    showCompletionNotification,
    stopPomodoroService,
    updatePomodoroProgress,
} from '@/services/pomodoroNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, Vibration } from 'react-native';

// ============================================
// TYPES
// ============================================

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroState {
  mode: PomodoroMode;
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number;
  endTime: number | null;
  focusTotalEnabled: boolean;
  sessionsCompleted: number;
}

export interface PomodoroConfig {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  xpBase: number;
  xpFocusBonus: number;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = '@pomodoro_state';
const PENDING_ACTION_KEY = '@pomodoro_pending_action';

const DEFAULT_CONFIG: PomodoroConfig = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  xpBase: 30,
  xpFocusBonus: 20,
};

const MODE_DURATIONS: Record<PomodoroMode, number> = {
  focus: DEFAULT_CONFIG.focusDuration * 60,
  shortBreak: DEFAULT_CONFIG.shortBreakDuration * 60,
  longBreak: DEFAULT_CONFIG.longBreakDuration * 60,
};

// ============================================
// HOOK
// ============================================

export function usePomodoro(userId: string | undefined) {
  // State
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(MODE_DURATIONS.focus);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [focusTotalEnabled, setFocusTotalEnabled] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastSessionXP, setLastSessionXP] = useState(0);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const isInitializedRef = useRef(false);

  // Current state ref for callbacks
  const stateRef = useRef({
    mode,
    isRunning,
    isPaused,
    timeRemaining,
    focusTotalEnabled,
    sessionsCompleted,
  });

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = {
      mode,
      isRunning,
      isPaused,
      timeRemaining,
      focusTotalEnabled,
      sessionsCompleted,
    };
  }, [mode, isRunning, isPaused, timeRemaining, focusTotalEnabled, sessionsCompleted]);

  // ============================================
  // PERSISTENCE
  // ============================================

  const saveState = useCallback(async (state: Partial<PomodoroState>) => {
    try {
      const currentState = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = currentState ? JSON.parse(currentState) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, ...state }));
    } catch (err) {
      console.error('Erro ao guardar estado Pomodoro:', err);
    }
  }, []);

  const loadState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as PomodoroState;
    } catch (err) {
      console.error('Erro ao carregar estado Pomodoro:', err);
      return null;
    }
  }, []);

  const clearState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Erro ao limpar estado Pomodoro:', err);
    }
  }, []);

  // ============================================
  // SUPABASE INTEGRATION
  // ============================================

  const saveSessionToDatabase = useCallback(async (durationMinutes: number, xpEarned: number) => {
    if (!userId) return;

    try {
      const { error: sessionError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          duration_minutes: durationMinutes,
          xp_earned: xpEarned,
          started_at: new Date(Date.now() - durationMinutes * 60 * 1000).toISOString(),
          ended_at: new Date().toISOString(),
        });

      if (sessionError) console.error('Erro ao guardar sessão:', sessionError);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_xp, focus_minutes_total, current_tier')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const newXP = (profile?.current_xp || 0) + xpEarned;
      const newFocusMinutes = (profile?.focus_minutes_total || 0) + durationMinutes;
      const newTier = calculateTier(newXP);

      await supabase
        .from('profiles')
        .update({
          current_xp: newXP,
          focus_minutes_total: newFocusMinutes,
          current_tier: newTier,
        })
        .eq('id', userId);

      await supabase.from('xp_history').insert({
        user_id: userId,
        amount: xpEarned,
        source: 'pomodoro_session',
        description: `Sessão Pomodoro de ${durationMinutes} minutos${stateRef.current.focusTotalEnabled ? ' (Foco Total)' : ''}`,
      });

      console.log(`✅ Sessão guardada: ${durationMinutes}min, +${xpEarned}XP`);
    } catch (err) {
      console.error('Erro ao guardar na BD:', err);
    }
  }, [userId]);

  // ============================================
  // NOTIFICATION CONTROL
  // ============================================

  const updateNotification = useCallback(async () => {
    if (Platform.OS === 'android' && stateRef.current.isRunning) {
      await displayPomodoroNotification({
        mode: stateRef.current.mode,
        timeRemaining: stateRef.current.timeRemaining,
        totalDuration: MODE_DURATIONS[stateRef.current.mode],
        isPaused: stateRef.current.isPaused,
        focusTotalEnabled: stateRef.current.focusTotalEnabled,
      });
    }
  }, []);

  const startForegroundService = useCallback(async () => {
    if (Platform.OS === 'android') {
      await displayPomodoroNotification({
        mode,
        timeRemaining,
        totalDuration: MODE_DURATIONS[mode],
        isPaused: false,
        focusTotalEnabled,
      });
    }
  }, [mode, timeRemaining, focusTotalEnabled]);

  // ============================================
  // TIMER LOGIC
  // ============================================

  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(false);
    setEndTime(null);
    await clearState();
    await stopPomodoroService();

    // Vibrate
    Vibration.vibrate([0, 500, 200, 500]);

    if (stateRef.current.mode === 'focus') {
      const xp = stateRef.current.focusTotalEnabled
        ? DEFAULT_CONFIG.xpBase + DEFAULT_CONFIG.xpFocusBonus
        : DEFAULT_CONFIG.xpBase;

      setLastSessionXP(xp);
      setSessionsCompleted((prev) => prev + 1);
      
      await saveSessionToDatabase(DEFAULT_CONFIG.focusDuration, xp);
      await showCompletionNotification('focus', xp);
      
      setShowCompletionModal(true);
    } else {
      await showCompletionNotification(stateRef.current.mode);
      setMode('focus');
      setTimeRemaining(MODE_DURATIONS.focus);
    }
  }, [clearState, saveSessionToDatabase]);

  const tick = useCallback(() => {
    setTimeRemaining((prev) => {
      const newTime = prev - 1;
      
      if (newTime <= 0) {
        handleTimerComplete();
        return 0;
      }

      // Update notification every second
      if (Platform.OS === 'android' && newTime % 1 === 0) {
        updatePomodoroProgress(newTime, MODE_DURATIONS[stateRef.current.mode], stateRef.current.mode);
      }

      return newTime;
    });
  }, [handleTimerComplete]);

  const startTimer = useCallback(async () => {
    const now = Date.now();
    const end = now + timeRemaining * 1000;

    setEndTime(end);
    setIsRunning(true);
    setIsPaused(false);

    await saveState({
      mode,
      isRunning: true,
      isPaused: false,
      timeRemaining,
      endTime: end,
      focusTotalEnabled,
      sessionsCompleted,
    });

    await startForegroundService();
  }, [timeRemaining, mode, focusTotalEnabled, sessionsCompleted, saveState, startForegroundService]);

  const pauseTimer = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(true);
    setEndTime(null);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    await saveState({
      mode,
      isRunning: false,
      isPaused: true,
      timeRemaining,
      endTime: null,
      focusTotalEnabled,
      sessionsCompleted,
    });

    // Update notification to show paused state
    if (Platform.OS === 'android') {
      await displayPomodoroNotification({
        mode,
        timeRemaining,
        totalDuration: MODE_DURATIONS[mode],
        isPaused: true,
        focusTotalEnabled,
      });
    }
  }, [mode, timeRemaining, focusTotalEnabled, sessionsCompleted, saveState]);

  const resumeTimer = useCallback(async () => {
    const now = Date.now();
    const end = now + timeRemaining * 1000;

    setEndTime(end);
    setIsRunning(true);
    setIsPaused(false);

    await saveState({
      mode,
      isRunning: true,
      isPaused: false,
      timeRemaining,
      endTime: end,
      focusTotalEnabled,
      sessionsCompleted,
    });

    // Update notification to show running state
    if (Platform.OS === 'android') {
      await displayPomodoroNotification({
        mode,
        timeRemaining,
        totalDuration: MODE_DURATIONS[mode],
        isPaused: false,
        focusTotalEnabled,
      });
    }
  }, [mode, timeRemaining, focusTotalEnabled, sessionsCompleted, saveState]);

  const stopTimer = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(false);
    setEndTime(null);
    setTimeRemaining(MODE_DURATIONS[mode]);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    await clearState();
    await stopPomodoroService();
  }, [mode, clearState]);

  const resetTimer = useCallback(async () => {
    await stopTimer();
    setTimeRemaining(MODE_DURATIONS[mode]);
  }, [mode, stopTimer]);

  const skipToNext = useCallback(async () => {
    await stopTimer();

    if (mode === 'focus') {
      const shouldLongBreak = (sessionsCompleted + 1) % DEFAULT_CONFIG.sessionsBeforeLongBreak === 0;
      const nextMode = shouldLongBreak ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeRemaining(MODE_DURATIONS[nextMode]);
    } else {
      setMode('focus');
      setTimeRemaining(MODE_DURATIONS.focus);
    }
  }, [mode, sessionsCompleted, stopTimer]);

  const changeMode = useCallback((newMode: PomodoroMode) => {
    if (isRunning || isPaused) return;
    setMode(newMode);
    setTimeRemaining(MODE_DURATIONS[newMode]);
  }, [isRunning, isPaused]);

  const toggleFocusTotal = useCallback(() => {
    setFocusTotalEnabled((prev) => !prev);
  }, []);

  const dismissCompletionModal = useCallback(() => {
    setShowCompletionModal(false);
    const shouldLongBreak = sessionsCompleted % DEFAULT_CONFIG.sessionsBeforeLongBreak === 0;
    const nextMode = shouldLongBreak ? 'longBreak' : 'shortBreak';
    setMode(nextMode);
    setTimeRemaining(MODE_DURATIONS[nextMode]);
  }, [sessionsCompleted]);

  // ============================================
  // NOTIFICATION ACTION HANDLER
  // ============================================

  const handleNotificationAction = useCallback((action: NotificationAction) => {
    console.log('🎬 Notification action received:', action);
    
    switch (action) {
      case NOTIFICATION_ACTIONS.PAUSE:
        pauseTimer();
        break;
      case NOTIFICATION_ACTIONS.RESUME:
        resumeTimer();
        break;
      case NOTIFICATION_ACTIONS.STOP:
        stopTimer();
        break;
    }
  }, [pauseTimer, resumeTimer, stopTimer]);

  // ============================================
  // EFFECTS
  // ============================================

  // Interval when running
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, tick]);

  // Register notification action callback
  useEffect(() => {
    setNotificationActionCallback(handleNotificationAction);
    return () => clearNotificationActionCallback();
  }, [handleNotificationAction]);

  // Check for pending actions from background
  useEffect(() => {
    const checkPendingAction = async () => {
      try {
        const pendingAction = await AsyncStorage.getItem(PENDING_ACTION_KEY);
        if (pendingAction) {
          await AsyncStorage.removeItem(PENDING_ACTION_KEY);
          handleNotificationAction(pendingAction as NotificationAction);
        }
      } catch (err) {
        console.error('Erro ao verificar ação pendente:', err);
      }
    };

    checkPendingAction();
  }, [handleNotificationAction]);

  // Recover state on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const recoverState = async () => {
      const stored = await loadState();
      if (!stored) return;

      setMode(stored.mode);
      setFocusTotalEnabled(stored.focusTotalEnabled);
      setSessionsCompleted(stored.sessionsCompleted);

      if (stored.isPaused) {
        setTimeRemaining(stored.timeRemaining);
        setIsPaused(true);
        // Show paused notification
        if (Platform.OS === 'android') {
          await displayPomodoroNotification({
            mode: stored.mode,
            timeRemaining: stored.timeRemaining,
            totalDuration: MODE_DURATIONS[stored.mode],
            isPaused: true,
            focusTotalEnabled: stored.focusTotalEnabled,
          });
        }
      } else if (stored.isRunning && stored.endTime) {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((stored.endTime - now) / 1000));

        if (remaining > 0) {
          setTimeRemaining(remaining);
          setEndTime(stored.endTime);
          setIsRunning(true);
          // Restart foreground service with updated time
          if (Platform.OS === 'android') {
            await displayPomodoroNotification({
              mode: stored.mode,
              timeRemaining: remaining,
              totalDuration: MODE_DURATIONS[stored.mode],
              isPaused: false,
              focusTotalEnabled: stored.focusTotalEnabled,
            });
          }
        } else {
          handleTimerComplete();
        }
      } else {
        setTimeRemaining(stored.timeRemaining || MODE_DURATIONS[stored.mode]);
      }
    };

    recoverState();
  }, [loadState, handleTimerComplete]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // Check for pending actions
        const pendingAction = await AsyncStorage.getItem(PENDING_ACTION_KEY);
        if (pendingAction) {
          await AsyncStorage.removeItem(PENDING_ACTION_KEY);
          handleNotificationAction(pendingAction as NotificationAction);
          return;
        }

        // Recalculate time if running
        if (endTime && isRunning && !isPaused) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

          if (remaining > 0) {
            setTimeRemaining(remaining);
          } else {
            handleTimerComplete();
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [endTime, isRunning, isPaused, handleTimerComplete, handleNotificationAction]);

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permissões de notificação não concedidas');
      }
    };
    requestPermissions();
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    mode,
    isRunning,
    isPaused,
    timeRemaining,
    focusTotalEnabled,
    sessionsCompleted,
    showCompletionModal,
    lastSessionXP,

    // Actions
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    skipToNext,
    changeMode,
    toggleFocusTotal,
    dismissCompletionModal,

    // Config
    config: DEFAULT_CONFIG,
    modeDurations: MODE_DURATIONS,
  };
}

// ============================================
// HELPERS
// ============================================

function calculateTier(xp: number): string {
  if (xp >= 10000) return 'Elite';
  if (xp >= 5000) return 'Diamante';
  if (xp >= 3000) return 'Platina';
  if (xp >= 1500) return 'Ouro';
  if (xp >= 500) return 'Prata';
  return 'Bronze';
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getProgress(timeRemaining: number, totalDuration: number): number {
  return ((totalDuration - timeRemaining) / totalDuration) * 100;
}
