/**
 * TeamInviteHandler - Componente para processar deep links de convite de equipa
 * 
 * Deve estar dentro do tree de providers (AuthProvider, AlertProvider, etc.)
 * para ter acesso ao contexto de autenticação e toasts.
 */

import { useTeamInvite } from '@/hooks/useTeamInvite';
import { useAlert } from '@/providers/AlertProvider';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';

interface TeamInviteHandlerProps {
    children: React.ReactNode;
}

export function TeamInviteHandler({ children }: TeamInviteHandlerProps) {
    const { processDeepLink, lastResult, clearResult, processing } = useTeamInvite();
    const { showAlert } = useAlert();
    const hasProcessedInitial = useRef(false);

    // Processar URL inicial (app aberta via deep link)
    useEffect(() => {
        const checkInitialUrl = async () => {
            if (hasProcessedInitial.current) return;
            hasProcessedInitial.current = true;

            try {
                const url = await Linking.getInitialURL();
                if (url && url.includes('team/')) {
                    console.log('🔗 URL inicial de convite:', url);
                    await processDeepLink(url);
                }
            } catch (err) {
                console.error('Erro ao verificar URL inicial:', err);
            }
        };

        checkInitialUrl();
    }, [processDeepLink]);

    // Escutar deep links enquanto app está aberta
    useEffect(() => {
        const subscription = Linking.addEventListener('url', async ({ url }) => {
            if (url && url.includes('team/')) {
                console.log('🔗 Deep link recebido:', url);
                await processDeepLink(url);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [processDeepLink]);

    // Mostrar feedback ao utilizador
    useEffect(() => {
        if (!lastResult) return;

        if (lastResult.success) {
            if (lastResult.alreadyMember) {
                showAlert({
                    title: '👋 Já és membro!',
                    message: `Já fazes parte de "${lastResult.teamName}". A abrir...`,
                });
            } else {
                showAlert({
                    title: '🎉 Entraste na Squad!',
                    message: `Bem-vindo(a) a "${lastResult.teamName}"!`,
                });
            }
        } else if (lastResult.error && lastResult.error !== 'login_required') {
            showAlert({
                title: '❌ Convite Inválido',
                message: lastResult.error,
            });
        }

        clearResult();
    }, [lastResult, showAlert, clearResult]);

    return <>{children}</>;
}
