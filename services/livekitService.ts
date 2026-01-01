/**
 * LiveKit Service - Token fetching and utilities
 */

import { supabase } from '@/lib/supabase';

export interface LiveKitTokenResponse {
    token: string;
    url: string;
    room: string;
}

/**
 * Fetch a LiveKit access token from the Edge Function
 */
export async function getLiveKitToken(
    roomName: string,
    username: string,
    userId: string,
    avatarUrl?: string
): Promise<LiveKitTokenResponse> {
    console.log('[LiveKit Service] Requesting token...');
    console.log('[LiveKit Service] Room:', roomName);
    console.log('[LiveKit Service] User:', username, userId);
    
    const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
            room_name: roomName,
            username,
            user_id: userId,
            avatar_url: avatarUrl,
        },
    });

    console.log('[LiveKit Service] Response received');
    console.log('[LiveKit Service] Error:', error);
    console.log('[LiveKit Service] Data type:', typeof data);
    console.log('[LiveKit Service] Data keys:', data ? Object.keys(data) : 'null');
    
    if (data?.token) {
        console.log('[LiveKit Service] Token length:', data.token.length);
        console.log('[LiveKit Service] Token preview:', data.token.substring(0, 100) + '...');
    }
    if (data?.url) {
        console.log('[LiveKit Service] URL:', data.url);
    }

    if (error) {
        console.error('[LiveKit Service] ERROR:', error);
        throw new Error(`Failed to get LiveKit token: ${error.message}`);
    }

    return data as LiveKitTokenResponse;
}

/**
 * Generate a room name from study room ID
 */
export function getRoomName(studyRoomId: string): string {
    return `study-room-${studyRoomId}`;
}
