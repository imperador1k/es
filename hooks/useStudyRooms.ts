/**
 * useStudyRooms Hook
 * Real-time Study Rooms with Supabase Realtime
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface StudyRoom {
    id: string;
    name: string;
    description: string | null;
    emoji: string;
    theme: 'default' | 'lofi' | 'nature' | 'rain' | 'cafe';
    max_participants: number;
    is_public: boolean;
    team_id: string | null;
    created_by: string | null;
    created_at: string;
    participant_count?: number;
}

export interface RoomParticipant {
    id: string;
    room_id: string;
    user_id: string;
    joined_at: string;
    focus_minutes: number;
    status: 'focusing' | 'break' | 'idle';
    last_active: string;
    // Joined profile data
    profile?: {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
        current_tier: string;
    };
}

export interface RoomReaction {
    id: string;
    room_id: string;
    from_user_id: string;
    to_user_id: string | null;
    emoji: string;
    created_at: string;
    from_profile?: {
        username: string;
        avatar_url: string | null;
    };
}

// ============================================
// HOOK
// ============================================

export function useStudyRooms() {
    const { user } = useAuthContext();
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [reactions, setReactions] = useState<RoomReaction[]>([]);
    const [focusMinutes, setFocusMinutes] = useState(0);

    // ============================================
    // FETCH ROOMS
    // ============================================

    const fetchRooms = useCallback(async () => {
        try {
            // Fetch rooms with participant count
            const { data, error } = await supabase
                .from('study_rooms')
                .select(`
                    *,
                    study_room_participants(count)
                `)
                .eq('is_public', true)
                .order('name');

            if (error) throw error;

            const roomsWithCount = (data || []).map(room => ({
                ...room,
                participant_count: room.study_room_participants?.[0]?.count || 0,
            }));

            setRooms(roomsWithCount);
        } catch (err) {
            console.error('Error fetching rooms:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ============================================
    // CHECK CURRENT ROOM
    // ============================================

    const checkCurrentRoom = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase.rpc('get_my_current_room');
            
            if (error) throw error;
            
            if (data?.room) {
                setCurrentRoom(data.room);
                if (data.participation) {
                    setFocusMinutes(data.participation.focus_minutes || 0);
                }
            } else {
                setCurrentRoom(null);
                setFocusMinutes(0);
            }
        } catch (err) {
            console.error('Error checking current room:', err);
        }
    }, [user?.id]);

    // ============================================
    // JOIN ROOM
    // ============================================

    const joinRoom = useCallback(async (roomId: string) => {
        try {
            const { data, error } = await supabase.rpc('join_study_room', {
                p_room_id: roomId,
            });

            if (error) throw error;

            if (data?.success) {
                setCurrentRoom(data.room);
                setFocusMinutes(0);
                await fetchRoomParticipants(roomId);
                return { success: true };
            } else {
                return { success: false, error: data?.error };
            }
        } catch (err: any) {
            console.error('Error joining room:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // ============================================
    // LEAVE ROOM
    // ============================================

    const leaveRoom = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc('leave_study_room');

            if (error) throw error;

            setCurrentRoom(null);
            setParticipants([]);
            setFocusMinutes(0);

            return { 
                success: true, 
                focusMinutes: data?.focus_minutes || 0,
                xpEarned: data?.xp_earned || 0,
            };
        } catch (err: any) {
            console.error('Error leaving room:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // ============================================
    // FETCH ROOM PARTICIPANTS
    // ============================================

    const fetchRoomParticipants = useCallback(async (roomId: string) => {
        try {
            const { data, error } = await supabase
                .from('study_room_participants')
                .select(`
                    *,
                    profile:profiles(id, username, full_name, avatar_url, current_tier)
                `)
                .eq('room_id', roomId)
                .order('joined_at');

            if (error) throw error;

            setParticipants(data || []);
        } catch (err) {
            console.error('Error fetching participants:', err);
        }
    }, []);

    // ============================================
    // UPDATE PRESENCE (Heartbeat)
    // ============================================

    const updatePresence = useCallback(async (status: string = 'focusing') => {
        try {
            await supabase.rpc('update_study_presence', {
                p_status: status,
                p_add_minutes: 1,
            });
            setFocusMinutes(prev => prev + 1);
        } catch (err) {
            console.error('Error updating presence:', err);
        }
    }, []);

    // ============================================
    // SEND REACTION
    // ============================================

    const sendReaction = useCallback(async (emoji: string, toUserId?: string) => {
        if (!currentRoom) return { success: false };

        try {
            const { data, error } = await supabase.rpc('send_room_reaction', {
                p_room_id: currentRoom.id,
                p_emoji: emoji,
                p_to_user_id: toUserId || null,
            });

            if (error) throw error;

            return { success: data?.success };
        } catch (err: any) {
            console.error('Error sending reaction:', err);
            return { success: false, error: err.message };
        }
    }, [currentRoom]);

    // ============================================
    // REALTIME SUBSCRIPTIONS
    // ============================================

    useEffect(() => {
        if (!currentRoom) return;

        // Subscribe to participants changes
        const participantsChannel = supabase
            .channel(`room-participants-${currentRoom.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'study_room_participants',
                    filter: `room_id=eq.${currentRoom.id}`,
                },
                (payload) => {
                    console.log('Participant change:', payload);
                    // Refetch participants on any change
                    fetchRoomParticipants(currentRoom.id);
                }
            )
            .subscribe();

        // Subscribe to reactions
        const reactionsChannel = supabase
            .channel(`room-reactions-${currentRoom.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'study_room_reactions',
                    filter: `room_id=eq.${currentRoom.id}`,
                },
                async (payload) => {
                    console.log('New reaction:', payload);
                    const newReaction = payload.new as RoomReaction;
                    
                    // Fetch user profile for the reaction
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('id', newReaction.from_user_id)
                        .single();
                    
                    setReactions(prev => [
                        ...prev,
                        { 
                            ...newReaction, 
                            from_profile: profile ? { 
                                username: profile.username, 
                                avatar_url: profile.avatar_url 
                            } : undefined 
                        }
                    ].slice(-20)); // Keep last 20 reactions
                }
            )
            .subscribe();

        // Initial fetch
        fetchRoomParticipants(currentRoom.id);

        // Cleanup
        return () => {
            supabase.removeChannel(participantsChannel);
            supabase.removeChannel(reactionsChannel);
        };
    }, [currentRoom?.id]);

    // Presence heartbeat (every minute)
    useEffect(() => {
        if (!currentRoom) return;

        const interval = setInterval(() => {
            updatePresence('focusing');
        }, 60000); // 1 minute

        return () => clearInterval(interval);
    }, [currentRoom, updatePresence]);

    // Initial load
    useEffect(() => {
        fetchRooms();
        checkCurrentRoom();
    }, [fetchRooms, checkCurrentRoom]);

    // Clear old reactions periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setReactions(prev => {
                const now = Date.now();
                return prev.filter(r => {
                    const created = new Date(r.created_at).getTime();
                    return now - created < 10000; // Keep for 10 seconds
                });
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return {
        // Data
        rooms,
        currentRoom,
        participants,
        reactions,
        focusMinutes,
        loading,
        
        // Actions
        fetchRooms,
        joinRoom,
        leaveRoom,
        sendReaction,
        updatePresence,
        
        // Helpers
        isInRoom: !!currentRoom,
        myParticipation: participants.find(p => p.user_id === user?.id),
    };
}
