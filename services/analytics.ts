/**
 * Analytics Service
 * Funções para obter dados de analytics do utilizador
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export interface DailyFocusData {
    date: string;
    dayLabel: string;
    minutes: number;
}

export interface DailyXPData {
    date: string;
    dayLabel: string;
    xp: number;
}

export interface AnalyticsSummary {
    streakDays: number;
    totalFocusMinutes: number;
    totalXP: number;
    totalMessages: number;
    activeDays: number;
}

export interface WeeklyAnalytics {
    focusData: DailyFocusData[];
    xpData: DailyXPData[];
    summary: AnalyticsSummary;
}

export interface MonthlyAnalytics extends WeeklyAnalytics {
    // Mesma estrutura mas para 30 dias
}

// ============================================
// HELPERS
// ============================================

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

function getDayLabel(date: Date): string {
    return DAY_LABELS[date.getDay()];
}

// ============================================
// FETCH FUNCTIONS
// ============================================

/**
 * Obter dados de foco (minutos de estudo) por dia
 */
export async function fetchFocusData(
    userId: string,
    days: number = 7
): Promise<DailyFocusData[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));

    // Buscar sessões de estudo
    const { data, error } = await supabase
        .from('study_sessions')
        .select('duration_minutes, started_at')
        .eq('user_id', userId)
        .gte('started_at', formatDate(startDate))
        .order('started_at', { ascending: true });

    if (error) {
        console.error('Erro ao buscar dados de foco:', error);
        throw error;
    }

    // Inicializar mapa com todos os dias
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dayMap[formatDate(date)] = 0;
    }

    // Somar minutos por dia
    data?.forEach((session) => {
        const dateKey = session.started_at.split('T')[0];
        if (dayMap[dateKey] !== undefined) {
            dayMap[dateKey] += session.duration_minutes || 0;
        }
    });

    // Converter para array
    return Object.entries(dayMap).map(([dateStr, minutes]) => {
        const date = new Date(dateStr);
        return {
            date: dateStr,
            dayLabel: getDayLabel(date),
            minutes,
        };
    });
}

/**
 * Obter dados de XP por dia
 */
export async function fetchXPData(
    userId: string,
    days: number = 7
): Promise<DailyXPData[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));

    const { data, error } = await supabase
        .from('xp_history')
        .select('amount, created_at')
        .eq('user_id', userId)
        .gte('created_at', formatDate(startDate))
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Erro ao buscar dados de XP:', error);
        throw error;
    }

    // Inicializar mapa
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dayMap[formatDate(date)] = 0;
    }

    // Somar XP por dia
    data?.forEach((entry) => {
        const dateKey = entry.created_at.split('T')[0];
        if (dayMap[dateKey] !== undefined) {
            dayMap[dateKey] += entry.amount;
        }
    });

    return Object.entries(dayMap).map(([dateStr, xp]) => {
        const date = new Date(dateStr);
        return {
            date: dateStr,
            dayLabel: getDayLabel(date),
            xp,
        };
    });
}

/**
 * Obter resumo de analytics
 */
export async function fetchAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
    // Queries paralelas para performance
    const [profileResult, messagesResult, focusResult] = await Promise.all([
        // Perfil (XP total, streak, minutos totais)
        supabase
            .from('profiles')
            .select('current_xp, focus_minutes_total')
            .eq('id', userId)
            .single(),
        
        // Total de mensagens
        supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
        
        // Dias ativos (dias com sessões de estudo nos últimos 30 dias)
        supabase
            .from('study_sessions')
            .select('started_at')
            .eq('user_id', userId)
            .gte('started_at', formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
    ]);

    // Contar DMs também
    const { count: dmCount } = await supabase
        .from('dm_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId);

    // Calcular dias ativos (dias únicos)
    const activeDaysSet = new Set<string>();
    focusResult.data?.forEach((session) => {
        activeDaysSet.add(session.started_at.split('T')[0]);
    });

    // Calcular streak (dias consecutivos com atividade)
    let streakDays = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = formatDate(checkDate);
        
        if (activeDaysSet.has(dateStr)) {
            streakDays++;
        } else if (i > 0) {
            // Quebrou a streak (permitir o dia de hoje não ter atividade ainda)
            break;
        }
    }

    return {
        streakDays,
        totalFocusMinutes: profileResult.data?.focus_minutes_total || 0,
        totalXP: profileResult.data?.current_xp || 0,
        totalMessages: (messagesResult.count || 0) + (dmCount || 0),
        activeDays: activeDaysSet.size,
    };
}

/**
 * Obter analytics completos (semana ou mês)
 */
export async function fetchAnalytics(
    userId: string,
    period: 'week' | 'month' = 'week'
): Promise<WeeklyAnalytics> {
    const days = period === 'week' ? 7 : 30;

    const [focusData, xpData, summary] = await Promise.all([
        fetchFocusData(userId, days),
        fetchXPData(userId, days),
        fetchAnalyticsSummary(userId),
    ]);

    return {
        focusData,
        xpData,
        summary,
    };
}
