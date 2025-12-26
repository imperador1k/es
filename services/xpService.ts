/**
 * XP Service - Secure Version
 * Motor de XP para gamificação - usa RPCs seguras do servidor
 * SECURITY: Não faz writes diretos, apenas leituras e chamadas RPC
 */

import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

export type XPSource =
    | 'task_completed'
    | 'task_graded'
    | 'file_uploaded'
    | 'message_sent'
    | 'team_joined'
    | 'login_streak'
    | 'first_task'
    | 'pomodoro_session'
    | 'shop_purchase'
    | 'bonus';

export interface XPReward {
    source: XPSource;
    amount: number;
    description: string;
}

// ============================================
// XP AMOUNTS (Reference - server validates)
// ============================================

export const XP_REWARDS: Record<XPSource, number> = {
    task_completed: 50,
    task_graded: 50, // Varies based on score
    file_uploaded: 15,
    message_sent: 2,
    team_joined: 25,
    login_streak: 10,
    first_task: 100,
    pomodoro_session: 25,
    shop_purchase: 0, // Negative
    bonus: 0,
};

// ============================================
// TIER SYSTEM
// ============================================

export const TIERS = [
    { name: 'Bronze', minXP: 0, maxXP: 1999, color: '#CD7F32' },
    { name: 'Prata', minXP: 2000, maxXP: 4999, color: '#C0C0C0' },
    { name: 'Ouro', minXP: 5000, maxXP: 9999, color: '#FFD700' },
    { name: 'Platina', minXP: 10000, maxXP: 24999, color: '#E5E4E2' },
    { name: 'Diamante', minXP: 25000, maxXP: 49999, color: '#B9F2FF' },
    { name: 'Elite', minXP: 50000, maxXP: Infinity, color: '#9B30FF' },
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
// SECURE XP FUNCTIONS (via RPC)
// ============================================

/**
 * Award XP via secure server function
 * NOTE: This calls an RPC that validates permissions
 * For most cases, XP is awarded automatically by other RPCs:
 * - grade_submission awards XP when grading
 * - complete_personal_task awards XP when completing
 * - purchase_item deducts XP when buying
 * 
 * This function should ONLY be used for:
 * - Pomodoro sessions (server-validated via study_sessions)
 * - Login streaks (server-validated)
 * - First-time bonuses (server-validated)
 */
export async function awardXPViaRPC(
    source: XPSource,
    description?: string
): Promise<{ success: boolean; xpAwarded: number; message: string }> {
    try {
        // Call server RPC - it will validate the request
        const { data, error } = await supabase.rpc('award_xp_for_action', {
            p_source: source,
            p_description: description || `XP earned from ${source}`,
        });

        if (error) {
            console.error('❌ XP RPC error:', error);
            return { success: false, xpAwarded: 0, message: error.message };
        }

        console.log(`🎮 XP awarded via RPC:`, data);
        return {
            success: true,
            xpAwarded: data?.xp_awarded || 0,
            message: data?.message || 'XP awarded',
        };
    } catch (err) {
        console.error('❌ XP award failed:', err);
        return { success: false, xpAwarded: 0, message: 'Failed to award XP' };
    }
}

/**
 * Complete a personal task and award XP
 * Uses secure RPC that validates ownership
 */
export async function completePersonalTask(
    taskId: string
): Promise<{ success: boolean; xpAwarded: number; message: string }> {
    try {
        const { data, error } = await supabase.rpc('complete_personal_task', {
            p_task_id: taskId,
        });

        if (error) {
            console.error('❌ Complete task error:', error);
            return { success: false, xpAwarded: 0, message: error.message };
        }

        return {
            success: data?.success || false,
            xpAwarded: data?.xp_awarded || 0,
            message: data?.message || 'Task completed',
        };
    } catch (err) {
        console.error('❌ Complete task failed:', err);
        return { success: false, xpAwarded: 0, message: 'Failed to complete task' };
    }
}

/**
 * Submit a team task
 * Uses secure RPC that validates assignment and deadlines
 */
export async function submitTeamTask(
    taskId: string,
    content?: string,
    fileUrl?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number
): Promise<{ success: boolean; submissionId?: string; isLate: boolean; message: string }> {
    try {
        const { data, error } = await supabase.rpc('submit_task', {
            p_task_id: taskId,
            p_content: content || null,
            p_file_url: fileUrl || null,
            p_file_name: fileName || null,
            p_file_type: fileType || null,
            p_file_size: fileSize || null,
        });

        if (error) {
            console.error('❌ Submit task error:', error);
            return { success: false, isLate: false, message: error.message };
        }

        return {
            success: data?.success || false,
            submissionId: data?.submission_id,
            isLate: data?.is_late || false,
            message: data?.message || 'Task submitted',
        };
    } catch (err) {
        console.error('❌ Submit task failed:', err);
        return { success: false, isLate: false, message: 'Failed to submit task' };
    }
}

/**
 * Grade a submission (teacher only)
 * Uses secure RPC that validates admin permissions
 */
export async function gradeSubmission(
    submissionId: string,
    score: number,
    feedback?: string
): Promise<{ success: boolean; xpAwarded: number; message: string }> {
    try {
        const { data, error } = await supabase.rpc('grade_submission', {
            p_submission_id: submissionId,
            p_score: score,
            p_feedback: feedback || null,
        });

        if (error) {
            console.error('❌ Grade submission error:', error);
            return { success: false, xpAwarded: 0, message: error.message };
        }

        return {
            success: data?.success || false,
            xpAwarded: data?.xp_awarded || 0,
            message: data?.message || 'Submission graded',
        };
    } catch (err) {
        console.error('❌ Grade submission failed:', err);
        return { success: false, xpAwarded: 0, message: 'Failed to grade submission' };
    }
}

/**
 * Purchase an item from the shop
 * Uses secure RPC that validates XP balance
 */
export async function purchaseItem(
    itemId: string
): Promise<{ success: boolean; pricePaid: number; message: string }> {
    try {
        const { data, error } = await supabase.rpc('purchase_item', {
            p_item_id: itemId,
        });

        if (error) {
            console.error('❌ Purchase error:', error);
            return { success: false, pricePaid: 0, message: error.message };
        }

        return {
            success: data?.success || false,
            pricePaid: data?.price_paid || 0,
            message: data?.message || 'Item purchased',
        };
    } catch (err) {
        console.error('❌ Purchase failed:', err);
        return { success: false, pricePaid: 0, message: 'Failed to purchase item' };
    }
}

/**
 * Create a team task with assignments
 * Uses secure RPC that validates admin permissions
 */
export async function createTeamTask(
    teamId: string,
    title: string,
    description?: string,
    dueDate?: Date,
    xpReward?: number,
    config?: {
        requires_file_upload?: boolean;
        allowed_file_types?: string[];
        max_score?: number;
        allow_late_submissions?: boolean;
    },
    assignmentType?: 'team' | 'individual' | 'groups',
    assignedUserIds?: string[]
): Promise<{ success: boolean; taskId?: string; assignedCount: number; message: string }> {
    try {
        const { data, error } = await supabase.rpc('create_task_with_assignments', {
            p_team_id: teamId,
            p_title: title,
            p_description: description || null,
            p_due_date: dueDate?.toISOString() || null,
            p_xp_reward: xpReward || 50,
            p_config: config || {},
            p_assignment_type: assignmentType || 'team',
            p_assigned_user_ids: assignedUserIds || null,
        });

        if (error) {
            console.error('❌ Create task error:', error);
            return { success: false, assignedCount: 0, message: error.message };
        }

        return {
            success: data?.success || false,
            taskId: data?.task_id,
            assignedCount: data?.assigned_count || 0,
            message: data?.message || 'Task created',
        };
    } catch (err) {
        console.error('❌ Create task failed:', err);
        return { success: false, assignedCount: 0, message: 'Failed to create task' };
    }
}

// ============================================
// READ-ONLY FUNCTIONS (Safe - no manipulation)
// ============================================

/**
 * Get user's XP and tier (read-only)
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
        console.error('❌ Error fetching XP:', err);
        return { xp: 0, tier: 'Bronze' };
    }
}

/**
 * Get XP history (read-only)
 */
export async function getXPHistory(userId: string, limit = 20): Promise<Array<{
    id: string;
    amount: number;
    source: string;
    description: string | null;
    created_at: string;
}>> {
    try {
        const { data, error } = await supabase
            .from('xp_history')
            .select('id, amount, source, description, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];
    } catch (err) {
        console.error('❌ Error fetching XP history:', err);
        return [];
    }
}

// ============================================
// LEGACY FUNCTIONS (Deprecated - will be removed)
// ============================================

/**
 * @deprecated Use completePersonalTask or gradeSubmission instead
 * This function will be removed in future versions
 */
export async function awardXP(
    userId: string,
    source: XPSource,
    customAmount?: number
): Promise<{ success: boolean; newTotal: number; newTier: string; leveledUp: boolean }> {
    console.warn('⚠️ awardXP() is deprecated. Use secure RPC functions instead.');
    
    // For backwards compatibility, try to use the RPC
    // This will fail if the server doesn't have the generic award function
    try {
        const result = await awardXPViaRPC(source);
        
        // Get updated profile
        const profile = await getUserXP(userId);
        
        return {
            success: result.success,
            newTotal: profile.xp,
            newTier: profile.tier,
            leveledUp: false, // Can't determine without before/after
        };
    } catch {
        return { success: false, newTotal: 0, newTier: 'Bronze', leveledUp: false };
    }
}
