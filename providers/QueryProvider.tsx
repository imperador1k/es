import { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// 1. Configuração do Motor (Cache)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Offline-First: Mantemos os dados na memória por 24 horas (para o user ver cenas de ontem)
      gcTime: 1000 * 60 * 60 * 24, 
      // Dados frescos por 2 minutos (igual ao que tinhas)
      staleTime: 1000 * 60 * 2,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// 2. Configuração do Gravador no Disco (A Magia Offline)
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000, // Grava no máximo a cada 1 segundo para poupar bateria
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

// Exportar para uso manual nos hooks (MUITO IMPORTANTE MANTER ISTO)
export { queryClient };