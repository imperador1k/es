import { DMMessageWithSender, useDMMessages } from '@/hooks/useDMs';
import { useUserStatus } from '@/hooks/usePresence';
import { useTyping } from '@/hooks/useTyping';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Profile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type MessageStatus = 'sent' | 'delivered' | 'read';

export default function DMChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const insets = useSafeAreaInsets();

    const { messages, loading, sending, sendMessage } = useDMMessages(id || null);
    const { typingText, sendTyping, sendStopTyping } = useTyping(id || null);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState<Profile | null>(null);

    // Hook para status do outro utilizador
    const { status: otherUserStatus, formatLastSeen } = useUserStatus(otherUser?.id || null);

    // Carregar dados do outro utilizador
    useEffect(() => {
        async function loadOtherUser() {
            if (!id || !user?.id) return;

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
        }
        loadOtherUser();
    }, [id, user?.id]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        const success = await sendMessage(newMessage);
        if (success) setNewMessage('');
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

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
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MessageBubble message={item} isMe={item.sender_id === user?.id} />
                )}
                contentContainerStyle={styles.messagesList}
                ListEmptyComponent={<EmptyMessages />}
                inverted
                showsVerticalScrollIndicator={false}
            />

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Mensagem..."
                        placeholderTextColor={colors.text.tertiary}
                        value={newMessage}
                        onChangeText={(text) => {
                            setNewMessage(text);
                            if (text.trim()) sendTyping();
                        }}
                        onBlur={sendStopTyping}
                        multiline
                    />
                    <Pressable
                        style={[styles.sendButton, newMessage.trim() && styles.sendButtonActive]}
                        onPress={handleSend}
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.text.inverse} />
                        ) : (
                            <Ionicons name="send" size={18} color={newMessage.trim() ? colors.text.inverse : colors.text.tertiary} />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function MessageBubble({ message, isMe }: { message: DMMessageWithSender; isMe: boolean }) {
    const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // Renderizar indicador de vistos baseado no status
    const renderReadReceipt = () => {
        if (!isMe) return null; // Só mostrar nas minhas mensagens

        const status = message.status || 'sent';

        switch (status) {
            case 'sent':
                return <Ionicons name="checkmark" size={12} color={colors.text.tertiary} style={{ marginLeft: 4 }} />;
            case 'delivered':
                return <Ionicons name="checkmark-done" size={12} color={colors.text.tertiary} style={{ marginLeft: 4 }} />;
            case 'read':
                return <Ionicons name="checkmark-done" size={12} color="#3B82F6" style={{ marginLeft: 4 }} />;
            default:
                return <Ionicons name="checkmark" size={12} color={colors.text.tertiary} style={{ marginLeft: 4 }} />;
        }
    };

    return (
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {message.content}
                </Text>
                <View style={styles.timestampRow}>
                    <Text style={[styles.timestamp, isMe && styles.timestampMe]}>
                        {formatTime(message.created_at)}
                    </Text>
                    {renderReadReceipt()}
                </View>
            </View>
        </View>
    );
}

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
        color: colors.success.primary,
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
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexGrow: 1,
    },
    messageRow: {
        marginBottom: spacing.xs,
        alignItems: 'flex-start',
    },
    messageRowMe: {
        alignItems: 'flex-end',
    },
    bubble: {
        maxWidth: '80%',
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
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
    messageText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        lineHeight: 22,
    },
    messageTextMe: {
        color: colors.text.inverse,
    },
    timestamp: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    timestampRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    timestampMe: {
        color: 'rgba(255,255,255,0.7)',
    },

    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    input: {
        flex: 1,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
        maxHeight: 120,
        marginRight: spacing.xs,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonActive: {
        backgroundColor: colors.accent.primary,
        ...shadows.sm,
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
