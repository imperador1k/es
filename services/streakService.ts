/**
 * Streak Service
 * Gerencia o sistema de streak baseado em atividade de estudo
 * 
 * Regras:
 * - Streak incrementa quando o utilizador completa ≥1 sessão de Pomodoro por dia
 * - Streak quebra se passar um dia sem sessão
 * - Atualiza longest_streak quando current_streak > longest_streak
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

interface StreakData {
    current_streak: number;
    longest_streak: number;
    last_activity_date: string | null;
}

interface StreakUpdateResult {
    success: boolean;
    currentStreak: number;
    longestStreak: number;
    isNewStreak: boolean;
    streakBroken: boolean;
    freezeUsed: boolean;
    error?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Retorna a data de hoje em formato YYYY-MM-DD (timezone local)
 */
function getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

/**
 * Retorna a data de ontem em formato YYYY-MM-DD
 */
function getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

/**
 * Calcula a diferença em dias entre duas datas
 */
function getDaysDifference(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Atualiza a streak do utilizador via RPC Database (Atomic & Robust)
 * 
 * Invoca a função `update_streak()` no PostgreSQL que gere toda a lógica:
 * - Incrementa se consecutivo
 * - Reseta se falhou
 * - Ignora se já atualizou hoje
 */
export async function updateStreakOnSession(userId: string): Promise<StreakUpdateResult> {
    try {
        console.log('🔄 A sincronizar streak via RPC...');
        
        // Chamar a função RPC diretamente
        const { error } = await supabase.rpc('update_streak');

        if (error) {
            console.error('❌ Erro RPC update_streak:', error);
            throw error;
        }

        // Buscar dados atualizados para retornar ao frontend
        const streakData = await getStreakData(userId);
        
        console.log(`✅ Streak sincronizada! Atual: ${streakData?.current_streak} (Recorde: ${streakData?.longest_streak})`);

        return {
            success: true,
            currentStreak: streakData?.current_streak || 0,
            longestStreak: streakData?.longest_streak || 0,
            isNewStreak: false, // A RPC não nos diz explicitamente se mudou, mas podemos inferir se necessário. Para já simplificamos.
            streakBroken: false,
            freezeUsed: false,
        };

    } catch (err: any) {
        console.error('❌ Erro ao atualizar streak:', err);
        return {
            success: false,
            currentStreak: 0,
            longestStreak: 0,
            isNewStreak: false,
            streakBroken: false,
            freezeUsed: false,
            error: err.message,
        };
    }
}

/**
 * Verifica se a streak do utilizador ainda está ativa
 * Retorna true se estudou hoje ou ontem
 */
export async function isStreakActive(userId: string): Promise<boolean> {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('last_activity_date')
            .eq('id', userId)
            .single();

        if (error || !profile?.last_activity_date) {
            return false;
        }

        const today = getTodayDate();
        const yesterday = getYesterdayDate();

        return (
            profile.last_activity_date === today ||
            profile.last_activity_date === yesterday
        );
    } catch {
        return false;
    }
}

/**
 * Obtém os dados da streak do utilizador
 */
export async function getStreakData(userId: string): Promise<StreakData | null> {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('current_streak, longest_streak, last_activity_date')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            return null;
        }

        return {
            current_streak: profile.current_streak || 0,
            longest_streak: profile.longest_streak || 0,
            last_activity_date: profile.last_activity_date,
        };
    } catch {
        return null;
    }
}

/**
 * Verifica se hoje é um dia de streak ativa (já estudou hoje)
 */
export async function hasStudiedToday(userId: string): Promise<boolean> {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('last_activity_date')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            return false;
        }

        return profile.last_activity_date === getTodayDate();
    } catch {
        return false;
    }
}

/**
 * Calcula quantos dias faltam para perder a streak
 * Retorna 0 se já perdeu, 1 se ainda pode estudar hoje, 2 se já estudou hoje
 */
export function getDaysUntilStreakLost(lastActivityDate: string | null): number {
    if (!lastActivityDate) return 0;

    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    if (lastActivityDate === today) {
        return 2; // Já estudou hoje, tem até amanhã
    } else if (lastActivityDate === yesterday) {
        return 1; // Estudou ontem, precisa estudar hoje
    }
    return 0; // Já perdeu
}
