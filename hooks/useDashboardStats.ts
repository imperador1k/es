/**
 * Hook para Dashboard Stats
 * Usa a RPC get_user_dashboard_stats do Supabase
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface WeeklyChartData {
    day: string;
    minutes: number;
}

export interface DashboardStats {
    study_minutes: number;
    tasks_completed: number;
    total_xp: number;
    active_goals: number;
    weekly_chart: WeeklyChartData[];
}

// ============================================
// HOOK
// ============================================

export function useDashboardStats() {
    const { user } = useAuthContext();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: rpcError } = await supabase.rpc('get_user_dashboard_stats');

            if (rpcError) {
                console.error('❌ Dashboard stats error:', rpcError);
                setError(rpcError.message);
                // Fallback to default values
                setStats({
                    study_minutes: 0,
                    tasks_completed: 0,
                    total_xp: 0,
                    active_goals: 0,
                    weekly_chart: [],
                });
            } else {
                setStats(data as DashboardStats);
            }
        } catch (err) {
            console.error('❌ Unexpected error:', err);
            setError('Erro ao carregar estatísticas');
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        stats,
        loading,
        error,
        refetch: fetchStats,
    };
}

// ============================================
// HELPER: Format minutes to hours/minutes
// ============================================

export function formatStudyTime(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
