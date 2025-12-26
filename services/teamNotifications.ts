/**
 * Team Notifications Service
 * Envio de notificações push para eventos de equipas
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

// ============================================
// CORE FUNCTION
// ============================================

/**
 * Envia notificação push via Expo
 */
async function sendPushNotification(
    expoPushToken: string,
    { title, body, data }: NotificationPayload
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
                sound: 'default',
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
 * Busca push tokens de todos os membros de uma equipa (exceto o autor)
 */
async function getTeamMemberTokens(
    teamId: string,
    excludeUserId: string
): Promise<string[]> {
    const { data, error } = await supabase
        .from('team_members')
        .select(`
            user_id,
            profiles!user_id (
                push_token
            )
        `)
        .eq('team_id', teamId)
        .neq('user_id', excludeUserId);

    if (error || !data) {
        console.error('Erro ao buscar tokens:', error);
        return [];
    }

    // Extrair tokens válidos
    const tokens: string[] = [];
    data.forEach((member: any) => {
        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
        if (profile?.push_token) {
            tokens.push(profile.push_token);
        }
    });

    return tokens;
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
    const tokens = await getTeamMemberTokens(teamId, senderId);
    
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

    // Enviar para todos os membros
    await Promise.all(tokens.map(token => sendPushNotification(token, payload)));
    console.log(`📤 Notificação de mensagem enviada para ${tokens.length} membros`);
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
    const tokens = await getTeamMemberTokens(teamId, creatorId);
    
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

    await Promise.all(tokens.map(token => sendPushNotification(token, payload)));
    console.log(`📤 Notificação de tarefa enviada para ${tokens.length} membros`);
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
    const tokens = await getTeamMemberTokens(teamId, memberId);

    const payload: NotificationPayload = {
        title: `👋 Novo Membro • ${teamName}`,
        body: `${memberName} entrou na equipa!`,
        data: {
            type: 'member_joined',
            teamId,
        },
    };

    await Promise.all(tokens.map(token => sendPushNotification(token, payload)));
    console.log(`📤 Notificação de membro enviada para ${tokens.length} membros`);
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
    const tokens = await getTeamMemberTokens(teamId, changerId);

    const payload: NotificationPayload = {
        title: `⚙️ ${teamName}`,
        body: `${changerName} ${changeDescription}`,
        data: {
            type: 'team_updated',
            teamId,
        },
    };

    await Promise.all(tokens.map(token => sendPushNotification(token, payload)));
    console.log(`📤 Notificação de equipa enviada para ${tokens.length} membros`);
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
    const tokens = await getTeamMemberTokens(teamId, completedById);

    const payload: NotificationPayload = {
        title: `✅ Tarefa Concluída • ${teamName}`,
        body: `${completedByName} completou "${taskTitle}"`,
        data: {
            type: 'task_completed',
            taskId,
            teamId,
        },
    };

    await Promise.all(tokens.map(token => sendPushNotification(token, payload)));
    console.log(`📤 Notificação de conclusão enviada para ${tokens.length} membros`);
}

/**
 * 🔔 Notificação genérica para um utilizador específico
 */
export async function notifyUser({
    userId,
    title,
    body,
    data,
}: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}): Promise<void> {
    // Buscar token do utilizador
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

    if (error || !profile?.push_token) {
        console.warn('Token não encontrado para user:', userId);
        return;
    }

    await sendPushNotification(profile.push_token, { title, body, data });
    console.log(`📤 Notificação enviada para user ${userId}`);
}
