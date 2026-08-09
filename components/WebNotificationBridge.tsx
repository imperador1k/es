/**
 * Web Notification Bridge
 * Mostra notificações do browser (PC) quando a app está em 2º plano
 * e chega uma notificação nova (feed in-app). Equivalente web aos push.
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function WebNotificationBridge() {
    const { user } = useAuthContext();
    const requestedRef = useRef(false);

    useEffect(() => {
        if (Platform.OS !== 'web' || !user?.id) return;
        if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

        const requestPermission = () => {
            if (Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }
        };

        // Pedir permissão assim que possível e tentar de novo no 1º clique
        // (Chrome exige gesto do utilizador para mostrar o pedido)
        if (!requestedRef.current) {
            requestedRef.current = true;
            requestPermission();
        }
        document.addEventListener('click', requestPermission, { once: true });

        // Subscrever a notificações novas
        const channel = supabase
            .channel(`web-notifs:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (Notification.permission !== 'granted') return;
                    if (!document.hidden) return; // com app visível, o feed trata disso

                    const n = payload.new as any;
                    const title = n.title || 'Escola+';
                    const body = n.content || 'Tens uma nova notificação';
                    const actor = n.actor_id ? '🔔 Nova notificação' : undefined;

                    try {
                        new Notification(title, {
                            body: actor ? `${actor}\n${body}` : body,
                            icon: '/favicon.png',
                            tag: n.id || undefined,
                        });
                    } catch (err) {
                        console.error('Erro ao mostrar notificação web:', err);
                    }
                }
            )
            .subscribe();

        return () => {
            document.removeEventListener('click', requestPermission);
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    return null;
}
