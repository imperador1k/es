/**
 * StudyRoomChat Component - PREMIUM REDESIGN V2
 * Real-time chat overlay for Study Rooms
 * With keyboard handling and close button
 */

import { supabase } from '@/lib/supabase';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    onClose?: () => void;
}

// ============================================
// MESSAGE BUBBLE - Inline for Speed
// ============================================

function ChatBubble({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }, []);

    const initial = (msg.profile?.username || 'U')[0].toUpperCase();

    return (
        <Animated.View style={[styles.bubbleRow, isMe && styles.bubbleRowMe, { opacity: fadeAnim }]}>
            {/* Avatar (only for others) */}
            {!isMe && (
                <View style={styles.avatarWrap}>
                    {msg.profile?.avatar_url ? (
                        <Image source={{ uri: msg.profile.avatar_url }} style={styles.avatar} />
                    ) : (
                        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatar}>
                            <Text style={styles.avatarText}>{initial}</Text>
                        </LinearGradient>
                    )}
                </View>
            )}

            <View style={[styles.bubbleContent, isMe && styles.bubbleContentMe]}>
                {/* Sender name */}
                {!isMe && (
                    <Text style={styles.senderName}>{msg.profile?.username || 'User'}</Text>
                )}

                {/* Message bubble */}
                {isMe ? (
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.bubble}>
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                            <Image source={{ uri: msg.attachment_url }} style={styles.attachmentImage} resizeMode="cover" />
                        )}
                        {msg.content && msg.content !== '📎' && (
                            <Text style={styles.bubbleTextMe}>{msg.content}</Text>
                        )}
                    </LinearGradient>
                ) : (
                    <View style={styles.bubbleOther}>
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                            <Image source={{ uri: msg.attachment_url }} style={styles.attachmentImage} resizeMode="cover" />
                        )}
                        {msg.content && msg.content !== '📎' && (
                            <Text style={styles.bubbleTextOther}>{msg.content}</Text>
                        )}
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// COMPONENT
// ============================================

export function StudyRoomChat({ roomId, onNewMessage, onClose }: StudyRoomChatProps) {
    const { user } = useAuthContext();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    // Keyboard handling - same as DM
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const keyboardHeight = useRef(new Animated.Value(0)).current;

    // ============================================
    // KEYBOARD LISTENERS - Same as DM
    // ============================================

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardVisible(true);
            const extraOffset = Platform.OS === 'android' ? insets.bottom : 0;
            Animated.timing(keyboardHeight, {
                toValue: e.endCoordinates.height + extraOffset,
                duration: Platform.OS === 'ios' ? 250 : 100,
                useNativeDriver: false,
            }).start();
        });

        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardVisible(false);
            Animated.timing(keyboardHeight, {
                toValue: 0,
                duration: Platform.OS === 'ios' ? 200 : 100,
                useNativeDriver: false,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [insets.bottom]);

    // ============================================
    // FETCH INITIAL MESSAGES - Optimized
    // ============================================

    useEffect(() => {
        let isMounted = true;

        const fetchMessages = async () => {
            try {
                const { data } = await supabase
                    .from('study_room_messages')
                    .select(`id, content, created_at, user_id, attachment_url, attachment_type, attachment_name, profiles(username, avatar_url)`)
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: true })
                    .limit(30);

                if (data && isMounted) {
                    const mapped = data.map(m => ({
                        ...m,
                        profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
                    })) as ChatMessage[];
                    setMessages(mapped);
                }
            } catch (err) {
                console.error('Error fetching messages:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchMessages();
        return () => { isMounted = false; };
    }, [roomId]);

    // ============================================
    // REALTIME SUBSCRIPTION - Optimized
    // ============================================

    useEffect(() => {
        const channel = supabase
            .channel(`room-chat-${roomId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_room_messages', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    const newMsg = payload.new as ChatMessage;

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('id', newMsg.user_id)
                        .single();

                    const msgWithProfile: ChatMessage = { ...newMsg, profile: profile || undefined };
                    setMessages(prev => [...prev.slice(-29), msgWithProfile]);

                    if (newMsg.user_id !== user?.id && onNewMessage) onNewMessage();

                    requestAnimationFrame(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, user?.id, onNewMessage]);

    // ============================================
    // SEND MESSAGE - Optimized
    // ============================================

    const sendMessage = useCallback(async () => {
        const content = inputText.trim();
        if (!content || sending) return;

        setSending(true);
        setInputText('');

        try {
            await supabase.rpc('send_room_message', {
                p_room_id: roomId,
                p_content: content,
                p_attachment_url: null,
                p_attachment_type: null,
                p_attachment_name: null,
            });
        } catch (err) {
            console.error('Send error:', err);
            setInputText(content);
        } finally {
            setSending(false);
        }
    }, [inputText, roomId, sending]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <View style={styles.container}>
            <BlurView intensity={90} tint="dark" style={styles.chatContainer}>
                {/* Header with Close Button */}
                <View style={styles.chatHeader}>
                    <View style={styles.chatHeaderLeft}>
                        <Ionicons name="chatbubbles" size={18} color="#6366F1" />
                        <Text style={styles.chatHeaderText}>Chat da Sala</Text>
                        <View style={styles.onlineDot} />
                    </View>
                    <Pressable style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={20} color="#FFF" />
                    </Pressable>
                </View>

                {/* Messages */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color="#6366F1" size="small" />
                    </View>
                ) : messages.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>💬 Sê o primeiro a enviar uma mensagem!</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <ChatBubble msg={item} isMe={item.user_id === user?.id} />}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    />
                )}

                {/* Input with Keyboard Animation */}
                <Animated.View style={[
                    styles.inputWrapper,
                    Platform.OS === 'android' && { marginBottom: keyboardHeight }
                ]}>
                    <View style={[styles.inputRow, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12) }]}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder="Mensagem..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={sendMessage}
                            returnKeyType="send"
                            multiline={false}
                        />
                        <Pressable
                            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
                            onPress={sendMessage}
                            disabled={!inputText.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Ionicons name="send" size={18} color="#FFF" />
                            )}
                        </Pressable>
                    </View>
                </Animated.View>
            </BlurView>
        </View>
    );
}

// ============================================
// STYLES - Premium Chat
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1 },
    chatContainer: { flex: 1, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, overflow: 'hidden' },

    // Header
    chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    chatHeaderText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

    // Loading & Empty
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
    emptyText: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

    // Messages
    messagesList: { padding: SPACING.sm, paddingBottom: SPACING.md },

    // Bubble
    bubbleRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end' },
    bubbleRowMe: { flexDirection: 'row-reverse' },
    avatarWrap: { marginRight: SPACING.xs },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    bubbleContent: { maxWidth: '75%' },
    bubbleContentMe: { alignItems: 'flex-end' },
    senderName: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2, marginLeft: 4 },
    bubble: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderBottomRightRadius: 4, overflow: 'hidden' },
    bubbleOther: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderBottomLeftRadius: 4 },
    bubbleTextMe: { fontSize: TYPOGRAPHY.size.sm, color: '#FFF' },
    bubbleTextOther: { fontSize: TYPOGRAPHY.size.sm, color: '#FFF' },
    attachmentImage: { width: 180, height: 120, borderRadius: RADIUS.md, marginBottom: SPACING.xs },

    // Input
    inputWrapper: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm, gap: SPACING.xs },
    input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: TYPOGRAPHY.size.sm, color: '#FFF', minHeight: 44 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.5 },
});
