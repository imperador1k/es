import { supabase } from '@/lib/supabase';

export interface BlockedUser {
    id: string; // The block record ID
    blocker_id: string;
    blocked_id: string;
    created_at: string;
    // We will fetch profile profile separately or join if possible
    profile?: {
        full_name: string;
        username: string;
        avatar_url: string;
    };
}

/**
 * Block a user
 */
export async function blockUser(userIdToBlock: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Prevent blocking self
    if (user.id === userIdToBlock) throw new Error('Cannot block yourself');

    const { error } = await supabase
        .from('user_blocks')
        .insert({
            blocker_id: user.id,
            blocked_id: userIdToBlock
        });

    if (error) {
        // Ignore unique violation (already blocked)
        if (error.code === '23505') return true;
        throw error;
    }
    return true;
}

/**
 * Report a user
 */
export async function reportUser(reportedUserId: string, reason: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('user_reports')
        .insert({
            reporter_id: user.id,
            reported_id: reportedUserId,
            reason: reason,
            status: 'pending'
        });

    if (error) throw error;
    return true;
}

/**
 * Unblock a user by specific Block ID
 */
export async function unblockUser(blockId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);

    if (error) throw error;
    return true;
}

/**
 * Unblock a user by their User ID
 */
export async function unblockUserByTargetId(blockedUserId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);
        
    if (error) throw error;
    return true;
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Get blocks
    const { data: blocks, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    if (!blocks || blocks.length === 0) return [];

    // 2. Get profiles for blocked users
    // (Manual join since we don't have direct FK to profiles in this schema, 
    // although we could add it, manual fetch is reliable)
    const blockedIds = blocks.map(b => b.blocked_id);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', blockedIds);
        
    if (profileError) throw profileError;

    // 3. Merge
    const profileMap = new Map(profiles?.map(p => [p.id, p]));
    
    return blocks.map(b => ({
        ...b,
        profile: profileMap.get(b.blocked_id)
    })) as BlockedUser[];
}
