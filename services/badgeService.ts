/**
 * Badge Service
 * Verificar e atribuir badges automaticamente
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export interface Badge {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    category: 'achievements' | 'milestones' | 'special' | 'secret';
    condition_type: string;
    condition_value: number;
    xp_reward: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserBadge {
    id: string;
    badge_id: string;
    unlocked_at: string;
    badge: Badge;
}

export interface BadgeCheckResult {
    badges_awarded: Array<{
        id: string;
        name: string;
        icon: string;
        xp_reward: number;
    }>;
    total_xp_gained: number;
}

// ============================================
// RARITY CONFIG
// ============================================

export const RARITY_COLORS = {
    common: { bg: '#9CA3AF20', text: '#9CA3AF', border: '#9CA3AF' },
    rare: { bg: '#3B82F620', text: '#3B82F6', border: '#3B82F6' },
    epic: { bg: '#A855F720', text: '#A855F7', border: '#A855F7' },
    legendary: { bg: '#F59E0B20', text: '#F59E0B', border: '#F59E0B' },
};

export const RARITY_LABELS = {
    common: 'Comum',
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Lendário',
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Verificar e atribuir badges automaticamente
 * Chama a RPC do Supabase que faz toda a lógica
 */
export async function checkAndAwardBadges(userId: string): Promise<BadgeCheckResult | null> {
    try {
        const { data, error } = await supabase.rpc('check_and_award_badges', {
            p_user_id: userId,
        });

        if (error) {
            console.error('Erro ao verificar badges:', error);
            return null;
        }

        return data as BadgeCheckResult;
    } catch (err) {
        console.error('Erro ao verificar badges:', err);
        return null;
    }
}

/**
 * Buscar todos os badges disponíveis
 */
export async function getAllBadges(): Promise<Badge[]> {
    try {
        const { data, error } = await supabase
            .from('badges')
            .select('*')
            .eq('is_active', true)
            .order('rarity', { ascending: true })
            .order('condition_value', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Erro ao buscar badges:', err);
        return [];
    }
}

/**
 * Buscar badges desbloqueados por um utilizador
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
        const { data, error } = await supabase
            .from('user_badges')
            .select(`
                id,
                badge_id,
                unlocked_at,
                badge:badges (*)
            `)
            .eq('user_id', userId)
            .order('unlocked_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((ub: any) => ({
            ...ub,
            badge: Array.isArray(ub.badge) ? ub.badge[0] : ub.badge,
        }));
    } catch (err) {
        console.error('Erro ao buscar badges do utilizador:', err);
        return [];
    }
}

/**
 * Contar badges desbloqueados
 */
export async function countUserBadges(userId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('user_badges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw error;
        return count || 0;
    } catch (err) {
        console.error('Erro ao contar badges:', err);
        return 0;
    }
}
