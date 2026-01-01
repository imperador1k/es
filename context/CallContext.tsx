/**
 * 📞 Call Context - Global Call Management
 * WhatsApp-style incoming call system using Supabase Realtime + CallKeep for native calls
 */

import { IncomingCallModal } from '@/components/IncomingCallModal';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { getLiveKitToken } from '@/services/livekitService';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

// ============================================
// TYPES
// ============================================

type CallSignalType = 'call:invite' | 'call:accept' | 'call:reject' | 'call:cancel' | 'call:end';

interface CallSignal {
    type: CallSignalType;
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    conversationId: string;
    timestamp: number;
}

interface IncomingCall {
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    conversationId: string;
}

interface OutgoingCall {
    recipientId: string;
    recipientName: string;
    conversationId: string;
}

interface ActiveCall {
    conversationId: string;
    token: string;
    url: string;
}

interface CallContextType {
    // State
    incomingCall: IncomingCall | null;
    outgoingCall: OutgoingCall | null;
    activeCall: ActiveCall | null;
    isInCall: boolean;

    // Actions
    initiateCall: (conversationId: string, recipientId: string, recipientName: string) => Promise<void>;
    answerCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    cancelCall: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuthContext();
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
    const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

    const channelsRef = useRef<Map<string, any>>(new Map());

    // Subscribe to my conversations for call signals
    useEffect(() => {
        if (!user?.id) return;

        const fetchAndSubscribe = async () => {
            console.log('[CallContext] Fetching user conversations...');

            // Get all conversations the user is part of
            const { data: conversations } = await supabase
                .from('dm_conversations')
                .select('id')
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

            if (!conversations) return;

            const conversationIds = conversations.map(c => c.id);
            console.log('[CallContext] Subscribing to', conversationIds.length, 'conversations');

            // Subscribe to each conversation channel
            conversationIds.forEach(conversationId => {
                if (channelsRef.current.has(conversationId)) return; // Already subscribed

                const channel = supabase.channel(`call:${conversationId}`)
                    .on('broadcast', { event: 'call_signal' }, (payload) => {
                        handleCallSignal(payload.payload as CallSignal);
                    })
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            console.log('[CallContext] Subscribed to:', conversationId);
                        }
                    });

                channelsRef.current.set(conversationId, channel);
            });
        };

        fetchAndSubscribe();

        return () => {
            // Cleanup channels
            channelsRef.current.forEach((channel) => {
                supabase.removeChannel(channel);
            });
            channelsRef.current.clear();
        };
    }, [user?.id]);

    // Handle incoming call signals
    const handleCallSignal = useCallback((signal: CallSignal) => {
        console.log('[CallContext] Received signal:', signal.type, 'from:', signal.callerName);

        // Ignore signals from myself
        if (signal.callerId === user?.id) {
            console.log('[CallContext] Ignoring own signal');
            return;
        }

        switch (signal.type) {
            case 'call:invite':
                // Someone is calling me
                console.log('[CallContext] Incoming call from', signal.callerName);
                setIncomingCall({
                    callerId: signal.callerId,
                    callerName: signal.callerName,
                    callerAvatar: signal.callerAvatar,
                    conversationId: signal.conversationId,
                });
                break;

            case 'call:accept':
                // My call was accepted
                console.log('[CallContext] Call accepted by', signal.callerName);
                if (outgoingCall?.conversationId === signal.conversationId) {
                    // Both parties now join the LiveKit room
                    joinLiveKitRoom(signal.conversationId);
                }
                break;

            case 'call:reject':
                // My call was rejected
                console.log('[CallContext] Call rejected by', signal.callerName);
                if (outgoingCall?.conversationId === signal.conversationId) {
                    setOutgoingCall(null);
                    Alert.alert('Chamada Recusada', `${signal.callerName} recusou a chamada.`);
                }
                break;

            case 'call:cancel':
                // Caller cancelled before I answered
                console.log('[CallContext] Call cancelled');
                if (incomingCall?.conversationId === signal.conversationId) {
                    setIncomingCall(null);
                }
                break;

            case 'call:end':
                // Call ended
                console.log('[CallContext] Call ended');
                if (activeCall?.conversationId === signal.conversationId) {
                    setActiveCall(null);
                }
                break;
        }
    }, [user?.id, outgoingCall, incomingCall, activeCall]);

    // Send call signal via broadcast
    const sendSignal = useCallback(async (conversationId: string, type: CallSignalType, recipientName?: string) => {
        if (!user) return;

        const signal: CallSignal = {
            type,
            callerId: user.id,
            callerName: user.email?.split('@')[0] || 'User',
            callerAvatar: null,
            conversationId,
            timestamp: Date.now(),
        };

        console.log('[CallContext] Sending signal:', type, 'to conversation:', conversationId);

        let channel = channelsRef.current.get(conversationId);
        if (!channel) {
            // Create and subscribe to channel
            channel = supabase.channel(`call:${conversationId}`);
            await channel.subscribe();
            channelsRef.current.set(conversationId, channel);
        }

        await channel.send({
            type: 'broadcast',
            event: 'call_signal',
            payload: signal,
        });

        // Send push notification for background/killed state (only for invites)
        if (type === 'call:invite' && recipientName) {
            sendCallPushNotification(conversationId, recipientName);
        }
    }, [user]);

    // Send push notification via Edge Function
    const sendCallPushNotification = async (conversationId: string, recipientName: string) => {
        try {
            // Get the recipient's ID from the conversation
            const { data: conversation } = await supabase
                .from('dm_conversations')
                .select('user1_id, user2_id')
                .eq('id', conversationId)
                .single();

            if (!conversation) return;

            const recipientId = conversation.user1_id === user?.id
                ? conversation.user2_id
                : conversation.user1_id;

            console.log('[CallContext] Sending push notification to:', recipientId);

            await supabase.functions.invoke('send-call-push', {
                body: {
                    recipient_id: recipientId,
                    caller_name: user?.email?.split('@')[0] || 'Alguém',
                    conversation_id: conversationId,
                },
            });
        } catch (error) {
            console.error('[CallContext] Failed to send push notification:', error);
        }
    };

    // Join LiveKit room
    const joinLiveKitRoom = useCallback(async (conversationId: string) => {
        if (!user) return;

        try {
            console.log('[CallContext] Joining LiveKit room for conversation:', conversationId);

            const response = await getLiveKitToken(
                `dm-${conversationId}`,
                user.email?.split('@')[0] || 'User',
                user.id,
                undefined
            );

            setActiveCall({
                conversationId,
                token: response.token,
                url: response.url,
            });
            setOutgoingCall(null);

            // Navigate to DM with call active
            router.push({
                pathname: '/dm/[id]',
                params: { id: conversationId },
            } as any);
        } catch (error) {
            console.error('[CallContext] Failed to join LiveKit room:', error);
            Alert.alert('Erro', 'Não foi possível conectar à chamada');
        }
    }, [user]);

    // === PUBLIC ACTIONS ===

    const initiateCall = useCallback(async (conversationId: string, recipientId: string, recipientName: string) => {
        console.log('[CallContext] Initiating call to', recipientName);

        setOutgoingCall({ conversationId, recipientId, recipientName });
        await sendSignal(conversationId, 'call:invite', recipientName);

        // Also join the room immediately (caller waits)
        await joinLiveKitRoom(conversationId);
    }, [sendSignal, joinLiveKitRoom]);

    const answerCall = useCallback(async () => {
        if (!incomingCall) return;
        console.log('[CallContext] Answering call');

        await sendSignal(incomingCall.conversationId, 'call:accept');

        // Join the LiveKit room
        await joinLiveKitRoom(incomingCall.conversationId);
        setIncomingCall(null);
    }, [incomingCall, sendSignal, joinLiveKitRoom]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;
        console.log('[CallContext] Rejecting call');

        sendSignal(incomingCall.conversationId, 'call:reject');
        setIncomingCall(null);
    }, [incomingCall, sendSignal]);

    const cancelCall = useCallback(() => {
        if (!outgoingCall) return;
        console.log('[CallContext] Cancelling call');

        sendSignal(outgoingCall.conversationId, 'call:cancel');
        setOutgoingCall(null);
        setActiveCall(null);
    }, [outgoingCall, sendSignal]);

    const endCall = useCallback(() => {
        const callConversationId = activeCall?.conversationId || outgoingCall?.conversationId;
        if (!callConversationId) return;
        console.log('[CallContext] Ending call');

        sendSignal(callConversationId, 'call:end');
        setActiveCall(null);
        setOutgoingCall(null);
    }, [activeCall, outgoingCall, sendSignal]);

    const value: CallContextType = {
        incomingCall,
        outgoingCall,
        activeCall,
        isInCall: !!activeCall,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        cancelCall,
    };

    return (
        <CallContext.Provider value={value}>
            {children}

            {/* Global Incoming Call Modal */}
            <IncomingCallModal
                visible={!!incomingCall}
                callerName={incomingCall?.callerName || ''}
                callerAvatar={incomingCall?.callerAvatar}
                onAccept={answerCall}
                onDecline={rejectCall}
            />
        </CallContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useCall() {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
}

export default CallProvider;
