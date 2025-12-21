import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Configurar como as notificações são apresentadas quando a app está aberta
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

interface UsePushNotificationsReturn {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    permissionStatus: Notifications.PermissionStatus | null;
    isRegistered: boolean;
    registerForPushNotifications: () => Promise<void>;
}

/**
 * Hook para gerir notificações push
 * - Verifica permissões
 * - Obtém o Expo Push Token
 * - Regista o token no Supabase (se não existir)
 * - Gere listeners para notificações recebidas
 */
export function usePushNotifications(): UsePushNotificationsReturn {
    const { user } = useAuthContext();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);

    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    /**
     * Verificar se estamos num dispositivo físico (não emulador)
     */
    const isPhysicalDevice = (): boolean => {
        return Device.isDevice;
    };

    /**
     * Obter o Expo Push Token
     */
    const getExpoPushToken = async (): Promise<string | null> => {
        try {
            // Verificar se é dispositivo físico
            if (!isPhysicalDevice()) {
                console.log('⚠️ Push notifications requerem dispositivo físico');
                return null;
            }

            // Verificar permissões atuais
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Pedir permissão se não tiver
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            setPermissionStatus(finalStatus);

            if (finalStatus !== 'granted') {
                console.log('❌ Permissão de notificações negada');
                return null;
            }

            // Obter token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Opcional, mas recomendado
            });

            console.log('🔔 Expo Push Token:', tokenData.data);
            return tokenData.data;
        } catch (error) {
            console.error('❌ Erro ao obter push token:', error);
            return null;
        }
    };

    /**
     * Registar o token no Supabase (se não existir)
     */
    const registerTokenInSupabase = async (token: string, userId: string): Promise<boolean> => {
        try {
            // Verificar se o token já existe para este utilizador
            const { data: existingTokens, error: selectError } = await supabase
                .from('user_push_tokens')
                .select('id')
                .eq('user_id', userId)
                .eq('token', token);

            if (selectError) {
                console.error('❌ Erro ao verificar token existente:', selectError);
                return false;
            }

            // Se já existe, não inserir novamente
            if (existingTokens && existingTokens.length > 0) {
                console.log('✅ Token já registado no Supabase');
                return true;
            }

            // Inserir novo token
            const { error: insertError } = await supabase
                .from('user_push_tokens')
                .insert({
                    user_id: userId,
                    token: token,
                    device_type: Platform.OS,
                });

            if (insertError) {
                console.error('❌ Erro ao registar token:', insertError);
                return false;
            }

            console.log('✅ Token registado no Supabase');
            return true;
        } catch (error) {
            console.error('❌ Erro inesperado ao registar token:', error);
            return false;
        }
    };

    /**
     * Função principal para registar push notifications
     */
    const registerForPushNotifications = useCallback(async () => {
        if (!user?.id) {
            console.log('⚠️ Utilizador não autenticado, a ignorar registo de push');
            return;
        }

        try {
            // 1. Obter token
            const token = await getExpoPushToken();

            if (!token) {
                console.log('⚠️ Não foi possível obter push token');
                return;
            }

            setExpoPushToken(token);

            // 2. Registar no Supabase
            const success = await registerTokenInSupabase(token, user.id);
            setIsRegistered(success);

            // 3. Configurar canal de notificação para Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#6366f1',
                });
            }
        } catch (error) {
            console.error('❌ Erro ao registar push notifications:', error);
        }
    }, [user?.id]);

    // Registar automaticamente quando o utilizador faz login
    useEffect(() => {
        if (user?.id) {
            registerForPushNotifications();
        } else {
            // Limpar estado se o utilizador fez logout
            setExpoPushToken(null);
            setIsRegistered(false);
        }
    }, [user?.id, registerForPushNotifications]);

    // Configurar listeners para notificações
    useEffect(() => {
        // Listener para notificações recebidas com a app aberta
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (receivedNotification: Notifications.Notification) => {
                console.log('📩 Notificação recebida:', receivedNotification);
                setNotification(receivedNotification);
            }
        );

        // Listener para quando o utilizador interage com a notificação
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (notificationResponse: Notifications.NotificationResponse) => {
                console.log('👆 Resposta à notificação:', notificationResponse);
                // Aqui podes navegar para um ecrã específico baseado nos dados da notificação
                const data = notificationResponse.notification.request.content.data;
                console.log('📦 Dados da notificação:', data);
            }
        );

        // Cleanup
        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        notification,
        permissionStatus,
        isRegistered,
        registerForPushNotifications,
    };
}

/**
 * Função helper para enviar notificação push via Expo
 * (para testes ou uso no servidor)
 */
export async function sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<void> {
    const message = {
        to: expoPushToken,
        sound: 'default' as const,
        title,
        body,
        data: data || {},
    };

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();
        console.log('📤 Notificação enviada:', result);
    } catch (error) {
        console.error('❌ Erro ao enviar notificação:', error);
    }
}
