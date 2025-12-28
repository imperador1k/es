/**
 * DM Chat Screen
 * Direct Messages with Rich Media Support
 */

import { ChatInputBar } from '@/components/ChatInputBar';
import { MessageBubble } from '@/components/MessageBubble';
import { useUserStatus } from '@/hooks/usePresence';
import { useTyping } from '@/hooks/useTyping';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Profile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface DMMessage {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    status: 'sent' | 'delivered' | 'read';
    attachment_url?: string | null;
    attachment_type?: 'image' | 'video' | 'file' | 'gif' | null;
    attachment_name?: string | null;
    sender?: {
        username: string;
        avatar_url: string | null;
    };
}

// ============================================
// COMPONENT
// ============================================

export default function DMChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);

    const [messages, setMessages] = useState<DMMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [otherUser, setOtherUser] = useState<Profile | null>(null);

    const { typingText, sendTyping, sendStopTyping } = useTyping(id || null);
    const { status: otherUserStatus, formatLastSeen } = useUserStatus(otherUser?.id || null);

    // ============================================
    // LOAD OTHER USER & MESSAGES
    // ============================================

    useEffect(() => {
        async function load() {
            if (!id || !user?.id) return;

            setLoading(true);

            // Get conversation & other user
            const { data: conv } = await supabase
                .from('dm_conversations')
                .select('user1_id, user2_id')
                .eq('id', id)
                .single();

            if (conv) {
                const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', otherId)
                    .single();

                if (profile) setOtherUser(profile as Profile);
            }

            // Load messages
            const { data: msgs } = await supabase
                .from('dm_messages')
                .select(`
                    id, content, created_at, sender_id, status,
                    attachment_url, attachment_type, attachment_name,
                    sender:profiles!dm_messages_sender_id_fkey(username, avatar_url)
                `)
                .eq('conversation_id', id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (msgs) {
                const mapped = msgs.map(m => ({
                    ...m,
                    sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
                })) as DMMessage[];
                setMessages(mapped);

                // Mark messages as read (messages from other user that are not read yet)
                const { error: updateError, count } = await supabase
                    .from('dm_messages')
                    .update({ status: 'read', is_read: true })
                    .eq('conversation_id', id)
                    .neq('sender_id', user.id)
                    .eq('is_read', false);

                if (updateError) {
                    console.error('❌ Error marking messages as read:', updateError);
                } else {
                    console.log('✅ Marked messages as read');
                }
            }

            setLoading(false);
        }
        load();
    }, [id, user?.id]);

    // ============================================
    // REALTIME SUBSCRIPTION
    // ============================================

    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`dm-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'dm_messages',
                    filter: `conversation_id=eq.${id}`,
                },
                async (payload) => {
                    const newMsg = payload.new as DMMessage;

                    // Fetch sender profile
                    const { data: sender } = await supabase
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('id', newMsg.sender_id)
                        .single();

                    const msgWithSender: DMMessage = {
                        ...newMsg,
                        sender: sender || undefined,
                    };

                    setMessages(prev => [msgWithSender, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    // ============================================
    // SEND MESSAGE
    // ============================================

    const handleSend = useCallback(async (
        content: string,
        attachment?: { url: string; type: 'image' | 'video' | 'file' | 'gif'; name?: string }
    ) => {
        if (!id || sending || !otherUser) return;

        setSending(true);
        sendStopTyping();

        try {
            const { error } = await supabase.rpc('send_dm_message', {
                p_conversation_id: id,
                p_content: content.trim() || (attachment ? '📎' : ''),
                p_attachment_url: attachment?.url || null,
                p_attachment_type: attachment?.type || null,
                p_attachment_name: attachment?.name || null,
            });

            if (error) {
                console.error('Error sending DM:', error);
            } else {
                // Get sender's profile for username
                const { data: senderProfile } = await supabase
                    .from('profiles')
                    .select('username, full_name')
                    .eq('id', user?.id)
                    .single();

                const senderName = senderProfile?.full_name || senderProfile?.username || 'Alguém';

                // Create notification for the other user
                await supabase.from('notifications').insert({
                    user_id: otherUser.id,
                    actor_id: user?.id,
                    type: 'direct_message',
                    title: `${senderName} enviou-te mensagem`,
                    content: content.substring(0, 100) || (attachment ? '📎 Anexo' : ''),
                    resource_id: id,
                    resource_type: 'message',
                });
            }
        } catch (err) {
            console.error('Send error:', err);
        } finally {
            setSending(false);
        }
    }, [id, sending, sendStopTyping, otherUser, user]);

    // ============================================
    // RENDER MESSAGE
    // ============================================

    const renderMessage = useCallback(({ item }: { item: DMMessage }) => {
        const isMe = item.sender_id === user?.id;

        return (
            <View style={styles.messageWrapper}>
                <MessageBubble
                    content={item.content}
                    isMe={isMe}
                    attachmentUrl={item.attachment_url}
                    attachmentType={item.attachment_type}
                    attachmentName={item.attachment_name}
                />
                <View style={[styles.timestampRow, isMe && styles.timestampRowMe]}>
                    <Text style={styles.timestamp}>
                        {new Date(item.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {isMe && (
                        <Ionicons
                            name={item.status === 'read' ? 'checkmark-done' : 'checkmark'}
                            size={12}
                            color={item.status === 'read' ? '#3B82F6' : colors.text.tertiary}
                            style={{ marginLeft: 4 }}
                        />
                    )}
                </View>
            </View>
        );
    }, [user?.id]);

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>

                {otherUser?.avatar_url ? (
                    <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
                ) : (
                    <View style={styles.headerAvatarFallback}>
                        <Text style={styles.headerAvatarInitial}>
                            {(otherUser?.full_name || otherUser?.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                <View style={styles.headerContent}>
                    <Text style={styles.headerName}>
                        {otherUser?.full_name || otherUser?.username || 'Utilizador'}
                    </Text>
                    <Text style={[
                        styles.headerStatus,
                        otherUserStatus === 'online' && styles.headerStatusOnline
                    ]}>
                        {typingText || formatLastSeen()}
                    </Text>
                </View>

                <Pressable style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                ListEmptyComponent={<EmptyMessages />}
                inverted
                showsVerticalScrollIndicator={false}
            />

            {/* Rich Input Bar */}
            <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
                <ChatInputBar
                    onSend={handleSend}
                    placeholder="Mensagem..."
                    disabled={sending}
                />
            </View>
        </SafeAreaView>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyMessages() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nova conversa</Text>
            <Text style={styles.emptySubtitle}>Envia a primeira mensagem!</Text>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: spacing.md,
    },
    headerAvatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    headerAvatarInitial: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    headerContent: {
        flex: 1,
    },
    headerName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    headerStatus: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    headerStatusOnline: {
        color: '#10B981',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Messages
    messagesList: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexGrow: 1,
    },
    messageWrapper: {
        marginBottom: spacing.sm,
    },
    timestampRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        marginLeft: spacing.xs,
    },
    timestampRowMe: {
        justifyContent: 'flex-end',
        marginRight: spacing.xs,
    },
    timestamp: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['5xl'],
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
});
