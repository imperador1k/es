import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Variáveis de ambiente do Expo (Mantidas iguais)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// --- A CORREÇÃO PARA WEB ---
// Criamos um adaptador que verifica se estamos no servidor (Web SSR)
// Se estivermos no servidor, retornamos Promessas vazias para não crashar.
// Se estivermos no telemóvel ou browser, usamos o AsyncStorage normal.
const ExpoStorage = {
    getItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return Promise.resolve(null);
            return Promise.resolve(localStorage.getItem(key));
        }
        return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return Promise.resolve();
            localStorage.setItem(key, value);
            return Promise.resolve();
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return Promise.resolve();
            localStorage.removeItem(key);
            return Promise.resolve();
        }
        return AsyncStorage.removeItem(key);
    },
};

// Cliente Supabase configurado
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoStorage, // <--- AQUI MUDAMOS DE AsyncStorage PARA ExpoStorage
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});

// Tipos auxiliares para autenticação (Mantidos exatamente iguais para não partir o resto da app)
export type AuthError = {
    message: string;
    status?: number;
};

export type AuthResponse = {
    success: boolean;
    error?: AuthError;
};