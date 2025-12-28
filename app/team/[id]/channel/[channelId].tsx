/**
 * Channel Chat Screen
 * Chat em tempo real com Supabase Realtime + Rich Media
 */

import { ChatInputBar } from '@/components/ChatInputBar';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { useTeam } from '@/providers/TeamsProvider';
import { notifyNewMessage } from '@/services/teamNotifications';
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

interface MessageAuthor {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
}

interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    created_at: string;
    author: MessageAuthor | null;
    attachment_url?: string | null;
    attachment_type?: 'image' | 'video' | 'file' | 'gif' | null;
    attachment_name?: string | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChannelChatScreen() {
    const { id: teamId, channelId } = useLocalSearchParams<{ id: string; channelId: string }>();
    const { user } = useAuthContext();
    const { profile } = useProfile();
    const { team } = useTeam(teamId);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();

    // Estados
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [channelName, setChannelName] = useState('');
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);

    // ============================================
    // LOAD INITIAL MESSAGES
    // ============================================

    const loadMessages = useCallback(async () => {
        if (!channelId) return;

        try {
            // Buscar últimas 50 mensagens com autor
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    channel_id,
                    user_id,
                    content,
                    created_at,
                    attachment_url,
                    attachment_type,
                    attachment_name,
                    author:profiles!user_id (
                        id,
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Processar dados (Supabase retorna author como array)
            const processedMessages: Message[] = (data || []).map((m: any) => ({
                ...m,
                author: Array.isArray(m.author) ? m.author[0] : m.author,
            }));

            setMessages(processedMessages);
        } catch (err) {
            console.error('Erro ao carregar mensagens:', err);
        } finally {
            setLoading(false);
        }
    }, [channelId]);

    // Load channel name
    const loadChannelInfo = useCallback(async () => {
        if (!channelId) return;

        const { data } = await supabase
            .from('channels')
            .select('name')
            .eq('id', channelId)
            .single();

        if (data) setChannelName(data.name);
    }, [channelId]);

    useEffect(() => {
        loadMessages();
        loadChannelInfo();
    }, [loadMessages, loadChannelInfo]);

    // ============================================
    // REALTIME SUBSCRIPTION
    // ============================================

    useEffect(() => {
        if (!channelId) return;

        const channel = supabase
            .channel(`room:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`,
                },
                async (payload) => {
                    console.log('🔔 Nova mensagem:', payload);

                    // Buscar mensagem completa com perfil do autor
                    const { data, error } = await supabase
                        .from('messages')
                        .select(`
                            id,
                            channel_id,
                            user_id,
                            content,
                            created_at,
                            author:profiles!user_id (
                                id,
                                username,
                                full_name,
                                avatar_url
                            )
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (!error && data) {
                        const newMessage: Message = {
                            ...data,
                            author: Array.isArray(data.author) ? data.author[0] : data.author,
                        };

                        // Adicionar ao início (lista invertida)
                        setMessages(prev => {
                            // Evitar duplicados
                            if (prev.some(m => m.id === newMessage.id)) return prev;
                            return [newMessage, ...prev];
                        });
                    }
                }
            )
            .subscribe();

        // Cleanup
        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId]);

    // ============================================
    // SEND MESSAGE
    // ============================================

    const handleSend = async (
        content: string,
        attachment?: { url: string; type: 'image' | 'video' | 'file' | 'gif'; name?: string }
    ) => {
        if ((!content.trim() && !attachment) || !channelId || !user?.id || !teamId) return;

        setSending(true);

        try {
            // Use RPC for proper attachment support
            const { error } = await supabase.rpc('send_team_message', {
                p_channel_id: channelId,
                p_content: content.trim() || (attachment ? '📎' : ''),
                p_attachment_url: attachment?.url || null,
                p_attachment_type: attachment?.type || null,
                p_attachment_name: attachment?.name || null,
            });

            if (error) throw error;

            // Enviar notificação push para outros membros
            notifyNewMessage({
                channelId,
                channelName: channelName || 'Canal',
                teamId,
                teamName: team?.name || 'Equipa',
                senderName: profile?.full_name || profile?.username || 'Alguém',
                messagePreview: content.trim() || '📎 Anexo',
                senderId: user.id,
            });
        } catch (err) {
            console.error('Erro ao enviar:', err);
        } finally {
            setSending(false);
        }
    };

    // ============================================
    // RENDER MESSAGE
    // ============================================

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMe = item.user_id === user?.id;
        const nextMessage = messages[index + 1];
        const showAvatar = !isMe && (!nextMessage || nextMessage.user_id !== item.user_id);

        return (
            <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
                {/* Avatar (apenas para outros e quando for última mensagem do grupo) */}
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {showAvatar ? (
                            item.author?.avatar_url ? (
                                <Image source={{ uri: item.author.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {(item.author?.full_name || item.author?.username || '?').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )
                        ) : (
                            <View style={styles.avatarSpacer} />
                        )}
                    </View>
                )}

                {/* Bubble */}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    {/* Nome do autor (apenas para outros, primeira mensagem do grupo) */}
                    {!isMe && showAvatar && (
                        <Text style={styles.authorName}>
                            {item.author?.full_name || item.author?.username || 'Utilizador'}
                        </Text>
                    )}
                    <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                        {formatTime(item.created_at)}
                    </Text>
                </View>
            </View>
        );
    };

    // ============================================
    // LOADING STATE
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

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>#{channelName}</Text>
                    <Text style={styles.headerSubtitle}>{messages.length} mensagens</Text>
                </View>
                <Pressable style={styles.headerButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-outline" size={48} color={colors.text.tertiary} />
                        <Text style={styles.emptyText}>Ainda não há mensagens</Text>
                        <Text style={styles.emptySubtext}>Sê o primeiro a enviar!</Text>
                    </View>
                }
            />

            {/* Rich Input Bar */}
            <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
                <ChatInputBar
                    onSend={handleSend}
                    placeholder="Escreve uma mensagem..."
                    disabled={sending}
                />
            </View>
        </SafeAreaView>
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
    content: {
        flex: 1,
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
    headerContent: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Messages List
    messagesList: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexGrow: 1,
    },

    // Message Row
    messageRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
        alignItems: 'flex-end',
    },
    messageRowMe: {
        justifyContent: 'flex-end',
    },

    // Avatar
    avatarContainer: {
        width: 32,
        marginRight: spacing.xs,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    avatarPlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.accent.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    avatarSpacer: {
        width: 28,
        height: 28,
    },

    // Bubble
    bubble: {
        maxWidth: '75%',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    bubbleMe: {
        backgroundColor: colors.accent.primary,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
        ...shadows.sm,
    },
    authorName: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
        marginBottom: 2,
    },
    messageText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        lineHeight: 20,
    },
    messageTextMe: {
        color: colors.text.inverse,
    },
    messageTime: {
        fontSize: 10,
        color: colors.text.tertiary,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    messageTimeMe: {
        color: 'rgba(255,255,255,0.7)',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['5xl'],
        transform: [{ scaleY: -1 }], // Inverter porque lista é invertida
    },
    emptyText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    emptySubtext: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },

    // Input Area
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        gap: spacing.sm,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxHeight: 120,
    },
    input: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        minHeight: 40,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
