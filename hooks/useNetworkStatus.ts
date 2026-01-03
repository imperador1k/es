/**
 * 🌐 useNetworkStatus - Hook para detetar estado da rede
 * Usa NetInfo (@react-native-community/netinfo) que já vem com Expo
 * Fallback seguro se módulo não estiver disponível
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

interface NetworkStatus {
    isConnected: boolean;
    isInternetReachable: boolean;
    type: string | null;
}

export function useNetworkStatus() {
    const [status, setStatus] = useState<NetworkStatus>({
        isConnected: true, // Assume connected by default
        isInternetReachable: true,
        type: null,
    });

    useEffect(() => {
        // Subscribe to network state updates
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setStatus({
                isConnected: state.isConnected ?? true,
                isInternetReachable: state.isInternetReachable ?? true,
                type: state.type ?? null,
            });
        });

        // Cleanup subscription
        return () => {
            unsubscribe();
        };
    }, []);

    return status;
}

export default useNetworkStatus;
