/**
 * Pomodoro Notification Service
 * Foreground Service com Notifee para timer persistente
 */

import notifee, {
    AndroidCategory,
    AndroidImportance,
    AndroidVisibility,
    Event,
    EventType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

// ============================================
// CONSTANTS
// ============================================

export const POMODORO_CHANNEL_ID = 'pomodoro-timer';
export const POMODORO_NOTIFICATION_ID = 'pomodoro-active';

export const NOTIFICATION_ACTIONS = {
  PAUSE: 'pause',
  RESUME: 'resume',
  STOP: 'stop',
} as const;

export type NotificationAction = typeof NOTIFICATION_ACTIONS[keyof typeof NOTIFICATION_ACTIONS];

// ============================================
// CHANNEL SETUP
// ============================================

export async function createPomodoroChannel() {
  if (Platform.OS !== 'android') return;

  await notifee.createChannel({
    id: POMODORO_CHANNEL_ID,
    name: 'Pomodoro Timer',
    description: 'Notificações do timer Pomodoro',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: false,
    sound: undefined,
  });
}

// ============================================
// FOREGROUND SERVICE
// ============================================

export interface PomodoroNotificationOptions {
  mode: 'focus' | 'shortBreak' | 'longBreak';
  timeRemaining: number; // seconds
  totalDuration: number; // seconds
  isPaused: boolean;
  focusTotalEnabled?: boolean;
}

const MODE_CONFIG = {
  focus: {
    title: '🎯 Modo Foco',
    color: '#EF4444',
  },
  shortBreak: {
    title: '☕ Pausa Curta',
    color: '#10B981',
  },
  longBreak: {
    title: '🌟 Pausa Longa',
    color: '#6366F1',
  },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Exibe ou atualiza a notificação do Pomodoro como Foreground Service
 */
export async function displayPomodoroNotification(options: PomodoroNotificationOptions) {
  const { mode, timeRemaining, totalDuration, isPaused, focusTotalEnabled } = options;
  const config = MODE_CONFIG[mode];

  // Ensure channel exists
  await createPomodoroChannel();

  const actions = isPaused
    ? [
        { id: NOTIFICATION_ACTIONS.RESUME, title: '▶️ Continuar', pressAction: { id: NOTIFICATION_ACTIONS.RESUME } },
        { id: NOTIFICATION_ACTIONS.STOP, title: '⏹️ Parar', pressAction: { id: NOTIFICATION_ACTIONS.STOP } },
      ]
    : [
        { id: NOTIFICATION_ACTIONS.PAUSE, title: '⏸️ Pausar', pressAction: { id: NOTIFICATION_ACTIONS.PAUSE } },
        { id: NOTIFICATION_ACTIONS.STOP, title: '⏹️ Parar', pressAction: { id: NOTIFICATION_ACTIONS.STOP } },
      ];

  const subtitle = isPaused 
    ? '⏸️ Pausado' 
    : focusTotalEnabled && mode === 'focus'
      ? '🛡️ Foco Total Ativo'
      : 'A decorrer...';

  await notifee.displayNotification({
    id: POMODORO_NOTIFICATION_ID,
    title: `${config.title} - ${formatTime(timeRemaining)}`,
    body: subtitle,
    android: {
      channelId: POMODORO_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      onlyAlertOnce: true,
      smallIcon: 'ic_launcher', // Default Expo icon
      color: config.color,
      category: AndroidCategory.PROGRESS,
      progress: {
        max: totalDuration,
        current: totalDuration - timeRemaining,
        indeterminate: false,
      },
      actions,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
    },
    ios: {
      categoryId: 'pomodoro',
      interruptionLevel: 'timeSensitive',
    },
  });
}

/**
 * Atualiza apenas o progresso da notificação (mais eficiente)
 */
export async function updatePomodoroProgress(
  timeRemaining: number,
  totalDuration: number,
  mode: 'focus' | 'shortBreak' | 'longBreak'
) {
  const config = MODE_CONFIG[mode];
  
  await notifee.displayNotification({
    id: POMODORO_NOTIFICATION_ID,
    title: `${config.title} - ${formatTime(timeRemaining)}`,
    android: {
      channelId: POMODORO_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      onlyAlertOnce: true,
      smallIcon: 'ic_launcher',
      color: config.color,
      progress: {
        max: totalDuration,
        current: totalDuration - timeRemaining,
        indeterminate: false,
      },
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
    },
  });
}

/**
 * Para o Foreground Service e cancela a notificação
 */
export async function stopPomodoroService() {
  if (Platform.OS === 'android') {
    await notifee.stopForegroundService();
  }
  await notifee.cancelNotification(POMODORO_NOTIFICATION_ID);
}

/**
 * Mostra notificação de conclusão
 */
export async function showCompletionNotification(
  mode: 'focus' | 'shortBreak' | 'longBreak',
  xpEarned?: number
) {
  await createPomodoroChannel();

  const isBreak = mode !== 'focus';
  
  await notifee.displayNotification({
    id: 'pomodoro-complete',
    title: isBreak ? '⏰ Pausa Terminada!' : '🎉 Sessão Completa!',
    body: isBreak 
      ? 'Hora de voltar ao trabalho! 💪' 
      : xpEarned 
        ? `Ganhaste +${xpEarned} XP! Continua assim!` 
        : 'Boa! Hora de fazer uma pausa.',
    android: {
      channelId: POMODORO_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_launcher',
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      autoCancel: true,
    },
    ios: {
      sound: 'default',
    },
  });
}

// ============================================
// BACKGROUND EVENT HANDLER
// ============================================

// Store for callback - will be set by the hook
let onNotificationAction: ((action: NotificationAction) => void) | null = null;

export function setNotificationActionCallback(callback: (action: NotificationAction) => void) {
  onNotificationAction = callback;
}

export function clearNotificationActionCallback() {
  onNotificationAction = null;
}

/**
 * Handler para eventos de background do Notifee
 * DEVE ser registado no index.js ou _layout.tsx FORA de componentes React
 */
export async function pomodoroBackgroundHandler(event: Event) {
  const { type, detail } = event;

  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id as NotificationAction;
    
    console.log('🔔 Notifee background action:', actionId);

    if (onNotificationAction) {
      onNotificationAction(actionId);
    } else {
      // Se não há callback, guarda em AsyncStorage para sincronizar quando app abrir
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@pomodoro_pending_action', actionId);
    }
  }
}

// Register background handler
notifee.onBackgroundEvent(pomodoroBackgroundHandler);
