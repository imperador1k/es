/**
 * Team Notifications Service
 * Envio de notificações push para eventos de equipas
 * COM verificação de preferências do utilizador
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

interface NotificationSettings {
    push_enabled: boolean;
    dm_notifications: boolean;
    team_notifications: boolean;
    task_notifications: boolean;
    friend_notifications: boolean;
    mention_notifications: boolean;
    marketing_notifications: boolean;
    sound_enabled: boolean;
    vibration_enabled: boolean;
}

type NotificationType = 'team' | 'task' | 'dm' | 'friend' | 'mention' | 'marketing' | 'generic';

interface MemberWithSettings {
    user_id: string;
    push_token: string | null;
    settings: Partial<NotificationSettings> | null;
}

// ============================================
// HELPER: Check if notification type is enabled
// ============================================

function isNotificationEnabled(settings: Partial<NotificationSettings> | null, type: NotificationType): boolean {
    // Se não há settings, assume tudo ativado (backwards compatibility)
    if (!settings) return true;
    
    // Master switch - se push_enabled é false, bloqueia tudo
    if (settings.push_enabled === false) return false;
    
    // Verificar tipo específico
    switch (type) {
        case 'team':
            return settings.team_notifications !== false;
        case 'task':
            return settings.task_notifications !== false;
        case 'dm':
            return settings.dm_notifications !== false;
        case 'friend':
            return settings.friend_notifications !== false;
        case 'mention':
            return settings.mention_notifications !== false;
        case 'marketing':
            return settings.marketing_notifications !== false;
        case 'generic':
        default:
            return true;
    }
}

// ============================================
// CORE FUNCTION
// ============================================

/**
 * Envia notificação push via Expo
 */
async function sendPushNotification(
    expoPushToken: string,
    { title, body, data }: NotificationPayload,
    soundEnabled: boolean = true
): Promise<boolean> {
    if (!expoPushToken.startsWith('ExponentPushToken')) {
        console.warn('Token inválido:', expoPushToken);
        return false;
    }

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: expoPushToken,
                sound: soundEnabled ? 'default' : null,
                title,
                body,
                data: data || {},
            }),
        });

        const result = await response.json();
        console.log('📤 Push enviado:', result);
        return true;
    } catch (error) {
        console.error('❌ Erro push:', error);
        return false;
    }
}

/**
 * Busca push tokens e settings de todos os membros de uma equipa (exceto o autor)
 * Filtra por tipo de notificação
 */
async function getTeamMemberTokensWithPreferences(
    teamId: string,
    excludeUserId: string,
    notificationType: NotificationType
): Promise<{ token: string; soundEnabled: boolean }[]> {
    const { data, error } = await supabase
        .from('team_members')
        .select(`
            user_id,
            profiles!user_id (
                push_token,
                push_enabled,
                dm_notifications,
                team_notifications,
                task_notifications,
                friend_notifications,
                mention_notifications,
                marketing_notifications,
                sound_enabled,
                vibration_enabled
            )
        `)
        .eq('team_id', teamId)
        .neq('user_id', excludeUserId);

    if (error || !data) {
        console.error('Erro ao buscar tokens:', error);
        return [];
    }

    // Extrair tokens válidos COM verificação de preferências
    const validMembers: { token: string; soundEnabled: boolean }[] = [];
    
    data.forEach((member: any) => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        
        if (!profile?.push_token) return;
        
        // Construir objeto de settings
        const settings: Partial<NotificationSettings> = {
            push_enabled: profile.push_enabled ?? true,
            team_notifications: profile.team_notifications ?? true,
            task_notifications: profile.task_notifications ?? true,
            dm_notifications: profile.dm_notifications ?? true,
            friend_notifications: profile.friend_notifications ?? true,
            mention_notifications: profile.mention_notifications ?? true,
            marketing_notifications: profile.marketing_notifications ?? false,
            sound_enabled: profile.sound_enabled ?? true,
        };
        
        // Verificar se este tipo de notificação está ativado para este utilizador
        if (isNotificationEnabled(settings, notificationType)) {
            validMembers.push({
                token: profile.push_token,
                soundEnabled: settings.sound_enabled !== false,
            });
        }
    });

    console.log(`🔔 ${validMembers.length}/${data.length} membros têm notificações '${notificationType}' ativadas`);
    return validMembers;
}

/**
 * Buscar preferências de um utilizador específico
 */
async function getUserNotificationPreferences(userId: string): Promise<{
    token: string | null;
    settings: Partial<NotificationSettings>;
} | null> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
            push_token,
            push_enabled,
            dm_notifications,
            team_notifications,
            task_notifications,
            friend_notifications,
            mention_notifications,
            marketing_notifications,
            sound_enabled,
            vibration_enabled
        `)
        .eq('id', userId)
        .single();

    if (error || !profile) {
        console.warn('Perfil não encontrado:', userId);
        return null;
    }

    return {
        token: profile.push_token || null,
        settings: {
            push_enabled: profile.push_enabled ?? true,
            team_notifications: profile.team_notifications ?? true,
            task_notifications: profile.task_notifications ?? true,
            dm_notifications: profile.dm_notifications ?? true,
            friend_notifications: profile.friend_notifications ?? true,
            mention_notifications: profile.mention_notifications ?? true,
            marketing_notifications: profile.marketing_notifications ?? false,
            sound_enabled: profile.sound_enabled ?? true,
        },
    };
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * 💬 Nova mensagem no canal
 */
export async function notifyNewMessage({
    channelId,
    channelName,
    teamId,
    teamName,
    senderName,
    messagePreview,
    senderId,
}: {
    channelId: string;
    channelName: string;
    teamId: string;
    teamName: string;
    senderName: string;
    messagePreview: string;
    senderId: string;
}): Promise<void> {
    const members = await getTeamMemberTokensWithPreferences(teamId, senderId, 'team');
    
    const preview = messagePreview.length > 50 
        ? messagePreview.substring(0, 50) + '...' 
        : messagePreview;

    const payload: NotificationPayload = {
        title: `${teamName} • #${channelName}`,
        body: `${senderName}: ${preview}`,
        data: {
            type: 'new_message',
            channelId,
            teamId,
        },
    };

    // Enviar para membros que têm notificações ativadas
    await Promise.all(members.map(m => sendPushNotification(m.token, payload, m.soundEnabled)));
    console.log(`📤 Notificação de mensagem enviada para ${members.length} membros`);
}

/**
 * ✅ Nova tarefa atribuída
 */
export async function notifyNewTask({
    taskId,
    taskTitle,
    teamId,
    teamName,
    creatorName,
    creatorId,
    dueDate,
}: {
    taskId: string;
    taskTitle: string;
    teamId: string;
    teamName: string;
    creatorName: string;
    creatorId: string;
    dueDate?: string;
}): Promise<void> {
    const members = await getTeamMemberTokensWithPreferences(teamId, creatorId, 'task');
    
    let body = `${creatorName} atribuiu: "${taskTitle}"`;
    if (dueDate) {
        const date = new Date(dueDate);
        body += ` • Até ${date.toLocaleDateString('pt-PT')}`;
    }

    const payload: NotificationPayload = {
        title: `📋 Nova Tarefa • ${teamName}`,
        body,
        data: {
            type: 'new_task',
            taskId,
            teamId,
        },
    };

    await Promise.all(members.map(m => sendPushNotification(m.token, payload, m.soundEnabled)));
    console.log(`📤 Notificação de tarefa enviada para ${members.length} membros`);
}

/**
 * 👥 Membro entrou na equipa
 */
export async function notifyMemberJoined({
    teamId,
    teamName,
    memberName,
    memberId,
}: {
    teamId: string;
    teamName: string;
    memberName: string;
    memberId: string;
}): Promise<void> {
    const members = await getTeamMemberTokensWithPreferences(teamId, memberId, 'team');

    const payload: NotificationPayload = {
        title: `👋 Novo Membro • ${teamName}`,
        body: `${memberName} entrou na equipa!`,
        data: {
            type: 'member_joined',
            teamId,
        },
    };

    await Promise.all(members.map(m => sendPushNotification(m.token, payload, m.soundEnabled)));
    console.log(`📤 Notificação de membro enviada para ${members.length} membros`);
}

/**
 * ⚙️ Alterações na equipa (nome, descrição, etc.)
 */
export async function notifyTeamUpdated({
    teamId,
    teamName,
    changerName,
    changerId,
    changeDescription,
}: {
    teamId: string;
    teamName: string;
    changerName: string;
    changerId: string;
    changeDescription: string;
}): Promise<void> {
    const members = await getTeamMemberTokensWithPreferences(teamId, changerId, 'team');

    const payload: NotificationPayload = {
        title: `⚙️ ${teamName}`,
        body: `${changerName} ${changeDescription}`,
        data: {
            type: 'team_updated',
            teamId,
        },
    };

    await Promise.all(members.map(m => sendPushNotification(m.token, payload, m.soundEnabled)));
    console.log(`📤 Notificação de equipa enviada para ${members.length} membros`);
}

/**
 * 🎯 Tarefa concluída
 */
export async function notifyTaskCompleted({
    taskId,
    taskTitle,
    teamId,
    teamName,
    completedByName,
    completedById,
}: {
    taskId: string;
    taskTitle: string;
    teamId: string;
    teamName: string;
    completedByName: string;
    completedById: string;
}): Promise<void> {
    const members = await getTeamMemberTokensWithPreferences(teamId, completedById, 'task');

    const payload: NotificationPayload = {
        title: `✅ Tarefa Concluída • ${teamName}`,
        body: `${completedByName} completou "${taskTitle}"`,
        data: {
            type: 'task_completed',
            taskId,
            teamId,
        },
    };

    await Promise.all(members.map(m => sendPushNotification(m.token, payload, m.soundEnabled)));
    console.log(`📤 Notificação de conclusão enviada para ${members.length} membros`);
}

/**
 * 🔔 Notificação genérica para um utilizador específico
 * Respeita as preferências do utilizador
 */
export async function notifyUser({
    userId,
    title,
    body,
    data,
    type = 'generic',
}: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    type?: NotificationType;
}): Promise<void> {
    const userPrefs = await getUserNotificationPreferences(userId);
    
    if (!userPrefs || !userPrefs.token) {
        console.warn('Token não encontrado para user:', userId);
        return;
    }
    
    // Verificar se o tipo de notificação está ativado
    if (!isNotificationEnabled(userPrefs.settings, type)) {
        console.log(`🔕 Notificação '${type}' desativada para user ${userId}`);
        return;
    }

    await sendPushNotification(
        userPrefs.token, 
        { title, body, data },
        userPrefs.settings.sound_enabled !== false
    );
    console.log(`📤 Notificação enviada para user ${userId}`);
}

/**
 * 💌 Notificação de mensagem direta (DM)
 */
export async function notifyNewDM({
    recipientId,
    senderName,
    messagePreview,
    conversationId,
}: {
    recipientId: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
}): Promise<void> {
    const userPrefs = await getUserNotificationPreferences(recipientId);
    
    if (!userPrefs || !userPrefs.token) {
        console.warn('Token não encontrado para user:', recipientId);
        return;
    }
    
    // Verificar se DMs estão ativados
    if (!isNotificationEnabled(userPrefs.settings, 'dm')) {
        console.log(`🔕 DM notifications desativadas para user ${recipientId}`);
        return;
    }

    const preview = messagePreview.length > 50 
        ? messagePreview.substring(0, 50) + '...' 
        : messagePreview;

    await sendPushNotification(
        userPrefs.token,
        {
            title: `💬 ${senderName}`,
            body: preview,
            data: {
                type: 'new_dm',
                conversationId,
            },
        },
        userPrefs.settings.sound_enabled !== false
    );
    console.log(`📤 DM notification enviada para user ${recipientId}`);
}

/**
 * 👤 Notificação de pedido de amizade
 */
export async function notifyFriendRequest({
    recipientId,
    senderName,
    senderId,
}: {
    recipientId: string;
    senderName: string;
    senderId: string;
}): Promise<void> {
    const userPrefs = await getUserNotificationPreferences(recipientId);
    
    if (!userPrefs || !userPrefs.token) {
        console.warn('Token não encontrado para user:', recipientId);
        return;
    }
    
    // Verificar se friend notifications estão ativadas
    if (!isNotificationEnabled(userPrefs.settings, 'friend')) {
        console.log(`🔕 Friend notifications desativadas para user ${recipientId}`);
        return;
    }

    await sendPushNotification(
        userPrefs.token,
        {
            title: `👥 Pedido de Amizade`,
            body: `${senderName} quer ser teu amigo!`,
            data: {
                type: 'friend_request',
                senderId,
            },
        },
        userPrefs.settings.sound_enabled !== false
    );
    console.log(`📤 Friend request notification enviada para user ${recipientId}`);
}
