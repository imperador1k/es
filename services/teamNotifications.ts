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
 * Filtra por tipo de notificação.
 * NOTA: os tokens vivem na tabela user_push_tokens (não em profiles.push_token).
 */
async function getTeamMemberTokensWithPreferences(
    teamId: string,
    excludeUserId: string,
    notificationType: NotificationType
): Promise<{ token: string; soundEnabled: boolean }[]> {
    // 1. Membros da equipa (exceto autor)
    const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .neq('user_id', excludeUserId);

    if (membersError || !members || members.length === 0) {
        console.error('Erro ao buscar membros:', membersError);
        return [];
    }

    const memberIds = members.map((m) => m.user_id);

    // 2. Preferências de notificação (profiles)
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
            id,
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
        .in('id', memberIds);

    if (profilesError || !profiles) {
        console.error('Erro ao buscar preferências:', profilesError);
        return [];
    }

    // 3. Push tokens (user_push_tokens — pode haver vários por utilizador)
    const { data: tokenRows, error: tokensError } = await supabase
        .from('user_push_tokens')
        .select('user_id, token')
        .in('user_id', memberIds);

    if (tokensError) {
        console.error('Erro ao buscar tokens:', tokensError);
        return [];
    }

    const tokensByUser = new Map<string, string[]>();
    tokenRows?.forEach((row: any) => {
        if (!row.token) return;
        const list = tokensByUser.get(row.user_id) || [];
        list.push(row.token);
        tokensByUser.set(row.user_id, list);
    });

    // Extrair tokens válidos COM verificação de preferências
    const validMembers: { token: string; soundEnabled: boolean }[] = [];

    profiles.forEach((profile: any) => {
        const tokens = tokensByUser.get(profile.id) || [];
        if (tokens.length === 0) return;

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
            tokens.forEach((token) => {
                validMembers.push({
                    token,
                    soundEnabled: settings.sound_enabled !== false,
                });
            });
        }
    });

    console.log(`🔔 ${validMembers.length} tokens de membros com notificações '${notificationType}' ativadas`);
    return validMembers;
}

/**
 * Buscar preferências e tokens de um utilizador específico
 */
async function getUserNotificationPreferences(userId: string): Promise<{
    tokens: string[];
    settings: Partial<NotificationSettings>;
} | null> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
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

    const { data: tokenRows, error: tokensError } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', userId);

    if (tokensError) {
        console.error('Erro ao buscar tokens:', tokensError);
        return null;
    }

    const tokens = (tokenRows || [])
        .map((row: any) => row.token)
        .filter((t: string | null): t is string => Boolean(t));

    return {
        tokens,
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
    
    if (!userPrefs || userPrefs.tokens.length === 0) {
        console.warn('Token não encontrado para user:', userId);
        return;
    }
    
    // Verificar se o tipo de notificação está ativado
    if (!isNotificationEnabled(userPrefs.settings, type)) {
        console.log(`🔕 Notificação '${type}' desativada para user ${userId}`);
        return;
    }

    await Promise.all(userPrefs.tokens.map((token) => sendPushNotification(
        token, 
        { title, body, data },
        userPrefs.settings.sound_enabled !== false
    )));
    console.log(`📤 Notificação enviada para user ${userId} (${userPrefs.tokens.length} tokens)`);
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
    
    if (!userPrefs || userPrefs.tokens.length === 0) {
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

    await Promise.all(userPrefs.tokens.map((token) => sendPushNotification(
        token,
        {
            title: `💬 ${senderName}`,
            body: preview,
            data: {
                type: 'new_dm',
                conversationId,
            },
        },
        userPrefs.settings.sound_enabled !== false
    )));
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
    
    if (!userPrefs || userPrefs.tokens.length === 0) {
        console.warn('Token não encontrado para user:', recipientId);
        return;
    }
    
    // Verificar se friend notifications estão ativadas
    if (!isNotificationEnabled(userPrefs.settings, 'friend')) {
        console.log(`🔕 Friend notifications desativadas para user ${recipientId}`);
        return;
    }

    await Promise.all(userPrefs.tokens.map((token) => sendPushNotification(
        token,
        {
            title: `👥 Pedido de Amizade`,
            body: `${senderName} quer ser teu amigo!`,
            data: {
                type: 'friend_request',
                senderId,
            },
        },
        userPrefs.settings.sound_enabled !== false
    )));
    console.log(`📤 Friend request notification enviada para user ${recipientId}`);
}
