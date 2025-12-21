import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { uploadImage } from '@/lib/upload';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Channel, MessageWithAuthor } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

export default function ChannelChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { addXPWithSync } = useProfile();
    const { user } = useAuthContext();
    const insets = useSafeAreaInsets();

    const [channel, setChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newMessage, setNewMessage] = useState('');

    const flatListRef = useRef<FlatList>(null);
    const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

    // Load channel data
    const loadChannelData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const { data: channelData } = await supabase
                .from('channels')
                .select('*')
                .eq('id', id)
                .single();
            setChannel(channelData as Channel);

            const { data: messagesData } = await supabase
                .from('messages')
                .select(`*, author:profiles!user_id (id, username, full_name, avatar_url)`)
                .eq('channel_id', id)
                .order('created_at', { ascending: false })
                .limit(50);
            setMessages((messagesData as MessageWithAuthor[]) || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Realtime subscription
    useEffect(() => {
        if (!id) return;
        loadChannelData();

        realtimeChannelRef.current = supabase
            .channel(`messages:channel_id=eq.${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${id}` },
                async (payload) => {
                    const { data: authorData } = await supabase
                        .from('profiles')
                        .select('id, username, full_name, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single();
                    const newMsg: MessageWithAuthor = { ...(payload.new as any), author: authorData };
                    setMessages(prev => [newMsg, ...prev]);
                }
            )
            .subscribe();

        return () => {
            if (realtimeChannelRef.current) {
                supabase.removeChannel(realtimeChannelRef.current);
            }
        };
    }, [id, loadChannelData]);

    // Send message
    const sendMessage = async (content: string, fileUrl: string | null = null) => {
        if (!user?.id || !id || (!content.trim() && !fileUrl)) return false;
        try {
            setSending(true);
            const { error } = await supabase.from('messages').insert({
                channel_id: id,
                user_id: user.id,
                content: content.trim() || (fileUrl ? '📷' : ''),
                file_url: fileUrl,
            });
            if (error) throw error;
            await addXPWithSync(10);
            return true;
        } catch (err) {
            return false;
        } finally {
            setSending(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        const success = await sendMessage(newMessage);
        if (success) setNewMessage('');
    };

    const handlePickImage = async () => {
        if (!user?.id) return;
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.7,
            });
            if (result.canceled || !result.assets?.[0]) return;
            setUploading(true);
            const publicUrl = await uploadImage(result.assets[0].uri, user.id);
            if (!publicUrl) {
                Alert.alert('Erro', 'Upload falhou');
                setUploading(false);
                return;
            }
            await sendMessage('', publicUrl);
            setUploading(false);
        } catch (err) {
            setUploading(false);
            Alert.alert('Erro', 'Erro ao processar imagem');
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
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

    const isBusy = sending || uploading;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.channelIcon}>
                    <Text style={styles.channelHash}>#</Text>
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.channelName}>{channel?.name || 'Canal'}</Text>
                    {channel?.description && (
                        <Text style={styles.channelDescription} numberOfLines={1}>{channel.description}</Text>
                    )}
                </View>
                <Pressable style={styles.infoButton}>
                    <Ionicons name="information-circle-outline" size={22} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <MessageBubble
                        message={item}
                        isMe={item.user_id === user?.id}
                        showAuthor={!messages[index + 1] || messages[index + 1].user_id !== item.user_id}
                    />
                )}
                contentContainerStyle={styles.messagesList}
                ListEmptyComponent={<EmptyMessages />}
                inverted
                showsVerticalScrollIndicator={false}
            />

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <Pressable style={styles.attachButton} onPress={handlePickImage} disabled={isBusy}>
                        {uploading ? (
                            <ActivityIndicator size="small" color={colors.accent.primary} />
                        ) : (
                            <Ionicons name="image-outline" size={22} color={colors.accent.primary} />
                        )}
                    </Pressable>
                    <TextInput
                        style={styles.input}
                        placeholder="Mensagem..."
                        placeholderTextColor={colors.text.tertiary}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                        editable={!isBusy}
                    />
                    <Pressable
                        style={[styles.sendButton, newMessage.trim() && !isBusy && styles.sendButtonActive]}
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim() || isBusy}
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

// ============================================
// SUB COMPONENTS
// ============================================
function MessageBubble({ message, isMe, showAuthor }: { message: MessageWithAuthor; isMe: boolean; showAuthor: boolean }) {
    const authorName = message.author?.username || message.author?.full_name || 'User';
    const hasImage = !!message.file_url;
    const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    return (
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
            {/* Author */}
            {showAuthor && !isMe && (
                <View style={styles.authorRow}>
                    {message.author?.avatar_url ? (
                        <Image source={{ uri: message.author.avatar_url }} style={styles.authorAvatar} />
                    ) : (
                        <View style={styles.authorAvatarFallback}>
                            <Text style={styles.authorInitial}>{authorName.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    <Text style={styles.authorName}>{authorName}</Text>
                </View>
            )}

            {/* Bubble */}
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther, hasImage && styles.bubbleImage]}>
                {hasImage && (
                    <Image source={{ uri: message.file_url! }} style={styles.messageImage} resizeMode="cover" />
                )}
                {message.content && message.content !== '📷' && (
                    <Text style={[styles.messageText, isMe && styles.messageTextMe, hasImage && styles.messageTextWithImage]}>
                        {message.content}
                    </Text>
                )}
                <Text style={[styles.timestamp, isMe && styles.timestampMe, hasImage && styles.timestampImage]}>
                    {formatTime(message.created_at)}
                </Text>
            </View>
        </View>
    );
}

function EmptyMessages() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem mensagens</Text>
            <Text style={styles.emptySubtitle}>Sê o primeiro a enviar!</Text>
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
    channelIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.xs,
        marginRight: spacing.md,
    },
    channelHash: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
    },
    headerContent: {
        flex: 1,
    },
    channelName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    channelDescription: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 1,
    },
    infoButton: {
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
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginLeft: 4,
    },
    authorAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: spacing.xs,
    },
    authorAvatarFallback: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.xs,
    },
    authorInitial: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
    },
    authorName: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        fontWeight: typography.weight.medium,
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
    bubbleImage: {
        padding: 4,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: borderRadius.md,
    },
    messageText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        lineHeight: 22,
    },
    messageTextMe: {
        color: colors.text.inverse,
    },
    messageTextWithImage: {
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.xs,
    },
    timestamp: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    timestampMe: {
        color: 'rgba(255,255,255,0.7)',
    },
    timestampImage: {
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.xs,
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
    attachButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.xs,
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
