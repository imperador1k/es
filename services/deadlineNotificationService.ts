/**
 * Deadline Notification Service
 * Schedules smart reminders for Goals and Tasks
 * Uses @notifee/react-native for local notifications
 */

import notifee, {
    AndroidImportance,
    TimestampTrigger,
    TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';

// ============================================
// CONSTANTS
// ============================================

export const DEADLINE_CHANNEL_ID = 'deadline-reminders';

// Notification IDs follow pattern: deadline-{goalId}-{type}
const REMINDER_TYPES = {
    DAY_BEFORE: '24h',
    HOURS_BEFORE: '8h',
    HOUR_BEFORE: '1h',
} as const;

// ============================================
// CHANNEL SETUP
// ============================================

export async function createDeadlineChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await notifee.createChannel({
        id: DEADLINE_CHANNEL_ID,
        name: 'Lembretes de Prazo',
        description: 'Notificações antes de deadlines de tarefas e metas',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
    });
}

// ============================================
// SCHEDULE REMINDERS
// ============================================

interface DeadlineInfo {
    id: string;
    title: string;
    deadline: Date;
    type?: 'goal' | 'task'; // For different icons/messages
}

/**
 * Schedule deadline reminders for a goal/task
 * Schedules: 24h before, 8h before, 1h before
 */
export async function scheduleDeadlineReminders(info: DeadlineInfo): Promise<void> {
    const { id, title, deadline, type = 'goal' } = info;

    // Ensure channel exists
    await createDeadlineChannel();

    const now = Date.now();
    const deadlineTime = deadline.getTime();

    // Calculate reminder times
    const reminders = [
        {
            type: REMINDER_TYPES.DAY_BEFORE,
            time: deadlineTime - 24 * 60 * 60 * 1000, // 24h before
            title: 'Falta 1 dia! ⏳',
            body: `"${title}" termina amanhã. Prepara-te!`,
        },
        {
            type: REMINDER_TYPES.HOURS_BEFORE,
            time: deadlineTime - 8 * 60 * 60 * 1000, // 8h before
            title: 'Atenção! Faltam 8 horas 🚨',
            body: `"${title}" está quase a acabar. Foco!`,
        },
        {
            type: REMINDER_TYPES.HOUR_BEFORE,
            time: deadlineTime - 60 * 60 * 1000, // 1h before
            title: 'Última chamada! 🔥',
            body: `"${title}" vence numa hora!`,
        },
    ];

    // Schedule each reminder if it's still in the future
    for (const reminder of reminders) {
        if (reminder.time > now) {
            const notificationId = `deadline-${id}-${reminder.type}`;

            const trigger: TimestampTrigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: reminder.time,
            };

            try {
                await notifee.createTriggerNotification(
                    {
                        id: notificationId,
                        title: reminder.title,
                        body: reminder.body,
                        android: {
                            channelId: DEADLINE_CHANNEL_ID,
                            importance: AndroidImportance.HIGH,
                            smallIcon: 'ic_launcher',
                            pressAction: {
                                id: 'default',
                                launchActivity: 'default',
                            },
                        },
                        ios: {
                            sound: 'default',
                            interruptionLevel: 'timeSensitive',
                        },
                        data: {
                            type: 'deadline_reminder',
                            goalId: id,
                            reminderType: reminder.type,
                        },
                    },
                    trigger
                );

                console.log(`📅 Scheduled: ${notificationId} for ${new Date(reminder.time).toLocaleString()}`);
            } catch (err) {
                console.error(`Failed to schedule ${notificationId}:`, err);
            }
        }
    }
}

/**
 * Cancel all deadline reminders for a specific goal/task
 * Call when task is completed or deleted
 */
export async function cancelDeadlineReminders(goalId: string): Promise<void> {
    const notificationIds = Object.values(REMINDER_TYPES).map(
        (type) => `deadline-${goalId}-${type}`
    );

    try {
        await Promise.all(
            notificationIds.map((id) => notifee.cancelNotification(id))
        );
        console.log(`🗑️ Cancelled reminders for: ${goalId}`);
    } catch (err) {
        console.error('Failed to cancel reminders:', err);
    }
}

/**
 * Update deadline reminders (cancel old, schedule new)
 * Call when deadline is changed
 */
export async function updateDeadlineReminders(info: DeadlineInfo): Promise<void> {
    await cancelDeadlineReminders(info.id);
    await scheduleDeadlineReminders(info);
}

/**
 * Cancel all deadline reminders
 * Useful for logout/reset
 */
export async function cancelAllDeadlineReminders(): Promise<void> {
    try {
        const notifications = await notifee.getTriggerNotifications();
        const deadlineNotifications = notifications.filter(
            (n) => n.notification.id?.startsWith('deadline-')
        );

        await Promise.all(
            deadlineNotifications.map((n) =>
                notifee.cancelNotification(n.notification.id!)
            )
        );

        console.log(`🗑️ Cancelled ${deadlineNotifications.length} deadline reminders`);
    } catch (err) {
        console.error('Failed to cancel all reminders:', err);
    }
}
