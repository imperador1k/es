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
 * Atualiza a streak do utilizador após completar uma sessão de estudo
 * 
 * Lógica:
 * 1. Se last_activity_date === hoje: não faz nada (já contou para hoje)
 * 2. Se last_activity_date === ontem: incrementa streak
 * 3. Se last_activity_date < ontem: reset streak para 1
 * 4. Se nunca estudou: começa streak em 1
 */
export async function updateStreakOnSession(userId: string): Promise<StreakUpdateResult> {
    try {
        // Buscar dados atuais da streak
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('current_streak, longest_streak, last_activity_date')
            .eq('id', userId)
            .single();

        if (fetchError) {
            console.error('❌ Erro ao buscar streak:', fetchError);
            return {
                success: false,
                currentStreak: 0,
                longestStreak: 0,
                isNewStreak: false,
                streakBroken: false,
                error: fetchError.message,
            };
        }

        const today = getTodayDate();
        const yesterday = getYesterdayDate();

        const currentStreak = profile?.current_streak || 0;
        const longestStreak = profile?.longest_streak || 0;
        const lastActivityDate = profile?.last_activity_date;

        let newStreak = currentStreak;
        let newLongest = longestStreak;
        let isNewStreak = false;
        let streakBroken = false;

        // Caso 1: Já estudou hoje - não incrementa
        if (lastActivityDate === today) {
            console.log('🔥 Streak: Já estudou hoje, mantém streak:', currentStreak);
            return {
                success: true,
                currentStreak,
                longestStreak,
                isNewStreak: false,
                streakBroken: false,
            };
        }

        // Caso 2: Estudou ontem - incrementa
        if (lastActivityDate === yesterday) {
            newStreak = currentStreak + 1;
            isNewStreak = true;
            console.log('🔥 Streak incrementada:', currentStreak, '->', newStreak);
        }
        // Caso 3: Nunca estudou OU estudou há mais de 1 dia - reset
        else {
            if (lastActivityDate && getDaysDifference(lastActivityDate, today) > 1) {
                streakBroken = true;
                console.log('💔 Streak quebrada! Era:', currentStreak);
            }
            newStreak = 1;
            isNewStreak = true;
            console.log('🔥 Nova streak iniciada: 1');
        }

        // Atualizar longest_streak se necessário
        if (newStreak > longestStreak) {
            newLongest = newStreak;
            console.log('🏆 Novo recorde de streak:', newLongest);
        }

        // Guardar na BD
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                current_streak: newStreak,
                longest_streak: newLongest,
                last_activity_date: today,
            })
            .eq('id', userId);

        if (updateError) {
            console.error('❌ Erro ao atualizar streak:', updateError);
            return {
                success: false,
                currentStreak,
                longestStreak,
                isNewStreak: false,
                streakBroken: false,
                error: updateError.message,
            };
        }

        console.log(`✅ Streak atualizada: ${newStreak} dias (recorde: ${newLongest})`);

        return {
            success: true,
            currentStreak: newStreak,
            longestStreak: newLongest,
            isNewStreak,
            streakBroken,
        };
    } catch (err: any) {
        console.error('❌ Erro inesperado na streak:', err);
        return {
            success: false,
            currentStreak: 0,
            longestStreak: 0,
            isNewStreak: false,
            streakBroken: false,
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
