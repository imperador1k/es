/**
 * StudyRoomChat Component
 * Real-time chat overlay for Study Rooms with Rich Media support
 */

import { ChatInputBar } from '@/components/ChatInputBar';
import { MessageBubble } from '@/components/MessageBubble';
import { supabase } from '@/lib/supabase';
import { borderRadius, spacing } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet
} from 'react-native';

// ============================================
// TYPES
// ============================================

interface ChatMessage {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    attachment_url?: string | null;
    attachment_type?: 'image' | 'video' | 'file' | 'gif' | null;
    attachment_name?: string | null;
    profile?: {
        username: string;
        avatar_url: string | null;
    };
}

interface StudyRoomChatProps {
    roomId: string;
    onNewMessage?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function StudyRoomChat({ roomId, onNewMessage }: StudyRoomChatProps) {
    const { user } = useAuthContext();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // ============================================
    // FETCH INITIAL MESSAGES
    // ============================================

    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('study_room_messages')
                .select(`
                    id, content, created_at, user_id,
                    attachment_url, attachment_type, attachment_name,
                    profiles(username, avatar_url)
                `)
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (data) {
                const mapped = data.map(m => ({
                    ...m,
                    profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
                })) as ChatMessage[];
                setMessages(mapped);
            }
        };

        fetchMessages();
    }, [roomId]);

    // ============================================
    // REALTIME SUBSCRIPTION
    // ============================================

    useEffect(() => {
        const channel = supabase
            .channel(`room-chat-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'study_room_messages',
                    filter: `room_id=eq.${roomId}`,
                },
                async (payload) => {
                    const newMsg = payload.new as ChatMessage;

                    // Fetch profile for the new message
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('id', newMsg.user_id)
                        .single();

                    const msgWithProfile: ChatMessage = {
                        ...newMsg,
                        profile: profile || undefined,
                    };

                    setMessages(prev => [...prev, msgWithProfile]);

                    // Notify parent of new message from others
                    if (newMsg.user_id !== user?.id && onNewMessage) {
                        onNewMessage();
                    }

                    // Auto-scroll to bottom
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, user?.id, onNewMessage]);

    // ============================================
    // SEND MESSAGE
    // ============================================

    const sendMessage = useCallback(async (
        content: string,
        attachment?: { url: string; type: 'image' | 'video' | 'file' | 'gif'; name?: string }
    ) => {
        if ((!content.trim() && !attachment) || sending) return;

        setSending(true);

        try {
            // Use RPC for proper attachment support
            const { error } = await supabase.rpc('send_room_message', {
                p_room_id: roomId,
                p_content: content.trim() || (attachment ? '📎' : ''),
                p_attachment_url: attachment?.url || null,
                p_attachment_type: attachment?.type || null,
                p_attachment_name: attachment?.name || null,
            });

            if (error) {
                console.error('Error sending message:', error);
            }
        } catch (err) {
            console.error('Send error:', err);
        } finally {
            setSending(false);
        }
    }, [roomId, user?.id, sending]);

    // ============================================
    // RENDER MESSAGE
    // ============================================

    const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
        const isMe = item.user_id === user?.id;
        const firstName = item.profile?.username?.split(' ')[0] || 'Anon';

        return (
            <MessageBubble
                content={item.content}
                isMe={isMe}
                senderName={!isMe ? firstName : undefined}
                senderAvatar={item.profile?.avatar_url}
                attachmentUrl={item.attachment_url}
                attachmentType={item.attachment_type}
                attachmentName={item.attachment_name}
            />
        );
    }, [user?.id]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
        >
            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                }}
            />

            {/* Rich Input Bar */}
            <ChatInputBar
                onSend={sendMessage}
                placeholder="Escreve uma mensagem..."
                disabled={sending}
            />
        </KeyboardAvoidingView>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    messagesList: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },
});
