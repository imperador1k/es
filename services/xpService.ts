/**
 * XP Service
 * Motor de XP para gamificação - atribui XP e atualiza tiers
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type XPSource =
    | 'task_completed'
    | 'file_uploaded'
    | 'message_sent'
    | 'team_joined'
    | 'login_streak'
    | 'first_task'
    | 'bonus';

export interface XPReward {
    source: XPSource;
    amount: number;
    description: string;
}

// ============================================
// XP AMOUNTS
// ============================================

export const XP_REWARDS: Record<XPSource, number> = {
    task_completed: 50,
    file_uploaded: 15,
    message_sent: 2,
    team_joined: 25,
    login_streak: 10,
    first_task: 100,
    bonus: 0, // Variável
};

// ============================================
// TIER SYSTEM
// ============================================

export const TIERS = [
    { name: 'Bronze', minXP: 0, maxXP: 499, color: '#CD7F32' },
    { name: 'Prata', minXP: 500, maxXP: 1499, color: '#C0C0C0' },
    { name: 'Ouro', minXP: 1500, maxXP: 2999, color: '#FFD700' },
    { name: 'Platina', minXP: 3000, maxXP: 4999, color: '#E5E4E2' },
    { name: 'Diamante', minXP: 5000, maxXP: 9999, color: '#B9F2FF' },
    { name: 'Mestre', minXP: 10000, maxXP: Infinity, color: '#9B30FF' },
];

export function getTierForXP(xp: number): string {
    for (const tier of TIERS) {
        if (xp >= tier.minXP && xp <= tier.maxXP) {
            return tier.name;
        }
    }
    return 'Bronze';
}

export function getTierProgress(xp: number): { current: number; max: number; percentage: number } {
    const tier = TIERS.find(t => xp >= t.minXP && xp <= t.maxXP);
    if (!tier || tier.maxXP === Infinity) {
        return { current: xp, max: xp, percentage: 100 };
    }
    const current = xp - tier.minXP;
    const max = tier.maxXP - tier.minXP + 1;
    const percentage = Math.round((current / max) * 100);
    return { current, max, percentage };
}

export function getNextTier(currentTier: string): { name: string; xpNeeded: number } | null {
    const currentIndex = TIERS.findIndex(t => t.name === currentTier);
    if (currentIndex === -1 || currentIndex === TIERS.length - 1) {
        return null;
    }
    const nextTier = TIERS[currentIndex + 1];
    return { name: nextTier.name, xpNeeded: nextTier.minXP };
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Atribuir XP a um utilizador
 */
export async function awardXP(
    userId: string,
    source: XPSource,
    customAmount?: number
): Promise<{ success: boolean; newTotal: number; newTier: string; leveledUp: boolean }> {
    const amount = customAmount ?? XP_REWARDS[source];
    
    if (amount <= 0) {
        return { success: false, newTotal: 0, newTier: 'Bronze', leveledUp: false };
    }

    try {
        // 1. Buscar XP atual
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('current_xp, current_tier')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const currentXP = profile?.current_xp || 0;
        const currentTier = profile?.current_tier || 'Bronze';
        const newTotal = currentXP + amount;
        const newTier = getTierForXP(newTotal);
        const leveledUp = newTier !== currentTier;

        // 2. Atualizar profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                current_xp: newTotal,
                current_tier: newTier,
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 3. Registar no histórico
        await supabase.from('xp_history').insert({
            user_id: userId,
            amount,
            source,
        });

        console.log(`🎮 +${amount} XP para ${userId} (${source}) | Total: ${newTotal} | Tier: ${newTier}`);

        return { success: true, newTotal, newTier, leveledUp };
    } catch (err) {
        console.error('Erro ao atribuir XP:', err);
        return { success: false, newTotal: 0, newTier: 'Bronze', leveledUp: false };
    }
}

/**
 * Buscar XP e tier de um utilizador
 */
export async function getUserXP(userId: string): Promise<{ xp: number; tier: string }> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('current_xp, current_tier')
            .eq('id', userId)
            .single();

        if (error) throw error;

        return {
            xp: data?.current_xp || 0,
            tier: data?.current_tier || 'Bronze',
        };
    } catch (err) {
        console.error('Erro ao buscar XP:', err);
        return { xp: 0, tier: 'Bronze' };
    }
}

/**
 * Buscar histórico de XP de um utilizador
 */
export async function getXPHistory(userId: string, limit = 20): Promise<Array<{
    id: string;
    amount: number;
    source: string;
    created_at: string;
}>> {
    try {
        const { data, error } = await supabase
            .from('xp_history')
            .select('id, amount, source, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];
    } catch (err) {
        console.error('Erro ao buscar histórico XP:', err);
        return [];
    }
}
