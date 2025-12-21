import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Variáveis de ambiente do Expo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// Cliente Supabase configurado para React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Importante para React Native
    },
});

// Tipos auxiliares para autenticação
export type AuthError = {
    message: string;
    status?: number;
};

export type AuthResponse = {
    success: boolean;
    error?: AuthError;
};
