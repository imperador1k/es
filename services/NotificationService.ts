import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Constantes para configuração
const NOTIFICATION_HOUR_MORNING = 9; // 09:00
const NOTIFICATION_HOUR_EVENING = 20; // 20:00

export class NotificationService {
    /**
     * Pedir permissões para notificações
     */
    static async requestPermissions(): Promise<boolean> {
        if (Platform.OS === 'web') return false;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    }

    /**
     * Agendar contagem decrescente para um exame (Regra dos 10 dias)
     * @param title Título do evento (ex: "Exame de Matemática")
     * @param eventDate Data do evento
     */
    static async scheduleExamCountdown(title: string, eventDate: Date): Promise<void> {
        if (Platform.OS === 'web') {
            console.log('⚠️ Notificações agendadas não suportadas na Web.');
            return;
        }

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            console.log('❌ Permissão de notificação negada.');
            return;
        }

        const today = new Date();
        const eventDay = new Date(eventDate);
        eventDay.setHours(0, 0, 0, 0); // Normalizar para meia-noite
        today.setHours(0, 0, 0, 0);

        // Calcular dias restantes
        const timeDiff = eventDay.getTime() - today.getTime();
        const daysUntilEvent = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysUntilEvent < 0) {
            console.log('⚠️ Evento no passado. Nenhuma notificação agendada.');
            return;
        }

        // Definir intervalo de agendamento (máximo 10 dias antes)
        const startDay = Math.min(daysUntilEvent, 10);

        console.log(`📅 Agendando notificações para: ${title} (${daysUntilEvent} dias restantes)`);

        // Loop de agendamento
        for (let i = startDay; i >= 0; i--) {
            // Data da notificação
            const triggerDate = new Date(eventDay);
            triggerDate.setDate(eventDay.getDate() - i); // Começa em (Evento - 10) até (Evento - 0)

            // Se a data de gatilho for no passado (antes de "agora"), ignorar
            // Mas permitimos o dia de hoje se a hora alvo ainda não passou
            if (triggerDate < today) continue;

            const daysLeft = i; // i é exatamente quantos dias faltam

            // Gerar mensagens
            let messages: { title: string; body: string; hour: number }[] = [];

            if (daysLeft > 1) {
                // Faltam X dias (10 a 2)
                messages = [
                    {
                        title: `📚 Faltam ${daysLeft} dias!`,
                        body: `Faltam ${daysLeft} dias para ${title}. Mantém o foco nos estudos!`,
                        hour: NOTIFICATION_HOUR_MORNING
                    },
                    {
                        title: `🌙 Fim do dia - ${title}`,
                        body: `Mais um dia concluído. Faltam ${daysLeft} dias para ${title}. Descansa bem!`,
                        hour: NOTIFICATION_HOUR_EVENING
                    }
                ];
            } else if (daysLeft === 1) {
                // Véspera
                messages = [
                    {
                        title: `⏰ É AMANHÃ!`,
                        body: `${title} é já amanhã! Faz uma revisão final e prepara o material.`,
                        hour: NOTIFICATION_HOUR_MORNING
                    },
                    {
                        title: `😴 Vai dormir cedo!`,
                        body: `Amanhã é o grande dia (${title}). Uma boa noite de sono é essencial.`,
                        hour: NOTIFICATION_HOUR_EVENING
                    }
                ];
            } else if (daysLeft === 0) {
                // Dia 0
                messages = [
                    {
                        title: `🚨 É HOJE!`,
                        body: `Boa sorte para ${title}! Tu consegues! 🍀`,
                        hour: 8 // Exceção: No dia, avisa às 08:00
                    }
                ];
            }

            // Agendar cada mensagem do dia
            for (const msg of messages) {
                const scheduleTime = new Date(triggerDate);
                scheduleTime.setHours(msg.hour, 0, 0, 0);

                // Só agendar se a hora ainda for no futuro em relação a "agora"
                if (scheduleTime.getTime() > Date.now()) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: msg.title,
                            body: msg.body,
                            sound: 'default',
                            data: { eventTitle: title, eventDate: eventDate.toISOString() }
                        },
                        trigger: scheduleTime as any,
                    });
                    console.log(`✅ Agendado: "${msg.title}" para ${scheduleTime.toLocaleString()}`);
                }
            }
        }

        // --- NOVO: Notificações baseadas na HORA DO EVENTO ---
        // 1. 1 Hora antes
        const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
        if (oneHourBefore.getTime() > Date.now()) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `⏳ 1 Hora para o início`,
                    body: `O evento ${title} começa dentro de 1 hora. Prepara-te!`,
                    sound: 'default',
                    data: { eventTitle: title, eventDate: eventDate.toISOString() }
                },
                trigger: oneHourBefore as any,
            });
            console.log(`✅ Agendado: "1 Hora antes" para ${oneHourBefore.toLocaleString()}`);
        }

        // 2. Na hora exata
        if (eventDate.getTime() > Date.now()) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `🔔 Começou: ${title}`,
                    body: `O evento ${title} está marcado para agora.`,
                    sound: 'default',
                    data: { eventTitle: title, eventDate: eventDate.toISOString() }
                },
                trigger: eventDate as any,
            });
            console.log(`✅ Agendado: "Na hora exata" para ${eventDate.toLocaleString()}`);
        }
    }

    /**
     * Cancelar todas as notificações agendadas
     */
    static async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('🗑️ Todas as notificações foram canceladas.');
    }
}
