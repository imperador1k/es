/**
 * PresenceProvider - Gestão global de presença
 * 
 * Fornece o estado de presença para toda a app:
 * - Inicializa a presença quando o utilizador faz login
 * - Expõe setStatus para outros componentes
 * - Gere o ciclo de vida da presença automaticamente
 */

import { usePresence, UserStatus } from '@/hooks/usePresence';
import React, { createContext, useContext, useMemo } from 'react';

interface PresenceContextType {
    myStatus: UserStatus;
    preferredStatus: Exclude<UserStatus, 'offline'>;
    setStatus: (status: Exclude<UserStatus, 'offline'>) => Promise<void>;
    isUserOnline: (userId: string) => boolean;
    getUserStatus: (userId: string) => UserStatus;
    onlineUsers: Map<string, { id: string; status: UserStatus; lastSeen: string }>;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const presence = usePresence();

    const value = useMemo(() => ({
        myStatus: presence.myStatus,
        preferredStatus: presence.preferredStatus,
        setStatus: presence.setStatus,
        isUserOnline: presence.isUserOnline,
        getUserStatus: presence.getUserStatus,
        onlineUsers: presence.onlineUsers,
    }), [presence]);

    return (
        <PresenceContext.Provider value={value}>
            {children}
        </PresenceContext.Provider>
    );
}

export function usePresenceContext() {
    const context = useContext(PresenceContext);
    if (!context) {
        throw new Error('usePresenceContext must be used within a PresenceProvider');
    }
    return context;
}
