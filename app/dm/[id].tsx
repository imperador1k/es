/**
 * 💬 DM Chat Screen - PREMIUM DESIGN
 * Direct Messages with iMessage/WhatsApp inspired design
 * Escola+ App
 */

import { ChatInputBar } from '@/components/ChatInputBar';
import { LiveKitRoom } from '@/components/StudyRoom/LiveKitRoom';
import { useCall } from '@/context/CallContext';
import { useDMMessages } from '@/hooks/useDMs';
import { useUserStatus } from '@/hooks/usePresence';
import { useTyping } from '@/hooks/useTyping';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Profile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface DMMessage {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    status: 'sent' | 'delivered' | 'read';
    is_read?: boolean;
    attachment_url?: string | null;
    attachment_type?: 'image' | 'video' | 'file' | 'gif' | null;
    attachment_name?: string | null;
    sender?: { username: string; avatar_url: string | null };
}

// ============================================
// ATTACHMENT RENDERER WITH IMAGE VIEWER
// ============================================

import * as Linking from 'expo-linking';
import { Modal, StatusBar } from 'react-native';

interface AttachmentProps {
    url?: string | null;
    type?: 'image' | 'video' | 'file' | 'gif' | null;
    name?: string | null;
    isMe: boolean;
}

function AttachmentRenderer({ url, type, name, isMe }: AttachmentProps) {
    const [viewerVisible, setViewerVisible] = useState(false);

    if (!url) return null;

    const getFileIcon = (fileName?: string | null) => {
        if (!fileName) return 'document-outline';
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return 'document-text';
            case 'doc':
            case 'docx': return 'document';
            case 'xls':
            case 'xlsx': return 'grid';
            case 'ppt':
            case 'pptx': return 'easel';
            default: return 'document';
        }
    };

    const handleFilePress = () => Linking.openURL(url);
    const handleImagePress = () => setViewerVisible(true);

    // IMAGE
    if (type === 'image') {
        return (
            <>
                <Pressable onPress={handleImagePress} style={styles.mediaContainer}>
                    <Image source={{ uri: url }} style={styles.attachmentImage} />
                    <View style={styles.expandIcon}>
                        <Ionicons name="expand-outline" size={14} color="#FFF" />
                    </View>
                </Pressable>
                <ImageViewerModal visible={viewerVisible} imageUrl={url} onClose={() => setViewerVisible(false)} />
            </>
        );
    }

    // GIF
    if (type === 'gif') {
        return (
            <>
                <Pressable onPress={handleImagePress} style={styles.mediaContainer}>
                    <Image source={{ uri: url }} style={styles.attachmentImage} resizeMode="contain" />
                    <View style={styles.gifBadge}>
                        <Text style={styles.gifBadgeText}>GIF</Text>
                    </View>
                    <View style={styles.expandIcon}>
                        <Ionicons name="expand-outline" size={14} color="#FFF" />
                    </View>
                </Pressable>
                <ImageViewerModal visible={viewerVisible} imageUrl={url} onClose={() => setViewerVisible(false)} />
            </>
        );
    }

    // FILE (PDF, DOC, etc)
    if (type === 'file') {
        return (
            <Pressable style={styles.fileCard} onPress={handleFilePress}>
                <LinearGradient
                    colors={isMe ? ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)'] : ['#6366F1', '#4F46E5']}
                    style={styles.fileIconWrap}
                >
                    <Ionicons name={getFileIcon(name) as any} size={24} color="#FFF" />
                </LinearGradient>
                <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, isMe && styles.fileNameMe]} numberOfLines={1}>
                        {name || 'Ficheiro'}
                    </Text>
                    <Text style={[styles.fileHint, isMe && styles.fileHintMe]}>Toca para abrir</Text>
                </View>
                <Ionicons name="download-outline" size={20} color={isMe ? 'rgba(255,255,255,0.7)' : COLORS.text.tertiary} />
            </Pressable>
        );
    }

    return null;
}

// ============================================
// IMAGE VIEWER MODAL
// ============================================

function ImageViewerModal({ visible, imageUrl, onClose }: { visible: boolean; imageUrl: string; onClose: () => void }) {
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
            <View style={viewerStyles.container}>
                <Pressable style={viewerStyles.backdrop} onPress={onClose} />

                <SafeAreaView edges={['top']} style={viewerStyles.header}>
                    <Pressable style={viewerStyles.closeBtn} onPress={onClose}>
                        <BlurView intensity={60} tint="dark" style={viewerStyles.blurBtn}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </BlurView>
                    </Pressable>
                    <View style={{ flex: 1 }} />
                    <Pressable style={viewerStyles.closeBtn} onPress={() => Linking.openURL(imageUrl)}>
                        <BlurView intensity={60} tint="dark" style={viewerStyles.blurBtn}>
                            <Ionicons name="download-outline" size={22} color="#FFF" />
                        </BlurView>
                    </Pressable>
                </SafeAreaView>

                <View style={viewerStyles.imageWrap}>
                    <Image source={{ uri: imageUrl }} style={{ width: SCREEN_WIDTH - 32, height: SCREEN_HEIGHT * 0.65 }} resizeMode="contain" />
                </View>

                <SafeAreaView edges={['bottom']} style={viewerStyles.footer}>
                    <Text style={viewerStyles.hint}>Toca fora para fechar</Text>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const viewerStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    header: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingTop: SPACING.md, zIndex: 10 },
    closeBtn: { borderRadius: 22, overflow: 'hidden' },
    blurBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    imageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    footer: { alignItems: 'center', paddingBottom: SPACING.lg },
    hint: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.5)' },
});

// ============================================
// TYPING INDICATOR
// ============================================

function TypingIndicator({ name }: { name: string }) {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (dot: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                ])
            ).start();
        };
        animate(dot1, 0);
        animate(dot2, 150);
        animate(dot3, 300);
    }, []);

    return (
        <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                    {[dot1, dot2, dot3].map((dot, i) => (
                        <Animated.View
                            key={i}
                            style={[styles.typingDot, { transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }] }]}
                        />
                    ))}
                </View>
            </View>
            <Text style={styles.typingLabel}>{name} está a escrever...</Text>
        </View>
    );
}

// ============================================
// MESSAGE ITEM
// ============================================

interface MessageItemProps {
    message: DMMessage;
    isMe: boolean;
    index: number;
    showAvatar: boolean;
}

function MessageItem({ message, isMe, index, showAvatar }: MessageItemProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(isMe ? 30 : -30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, delay: index * 30, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    const StatusIcon = () => {
        if (!isMe) return null;
        const iconName = message.status === 'sent' ? 'checkmark' : 'checkmark-done';
        const iconColor = message.status === 'read' ? '#3B82F6' : 'rgba(255,255,255,0.5)';
        return <Ionicons name={iconName} size={14} color={iconColor} style={{ marginLeft: 4 }} />;
    };

    return (
        <Animated.View style={[
            styles.messageRow,
            isMe && styles.messageRowMe,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
        ]}>
            {/* Avatar (only for received messages) */}
            {!isMe && showAvatar && (
                <View style={styles.messageAvatar}>
                    {message.sender?.avatar_url ? (
                        <Image source={{ uri: message.sender.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatarFallback}>
                            <Text style={styles.avatarInitial}>
                                {(message.sender?.username || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    )}
                </View>
            )}
            {!isMe && !showAvatar && <View style={styles.avatarSpacer} />}

            {/* Bubble */}
            <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
                {isMe ? (
                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={[styles.bubble, styles.bubbleMe]}>
                        <AttachmentRenderer
                            url={message.attachment_url}
                            type={message.attachment_type}
                            name={message.attachment_name}
                            isMe={true}
                        />
                        {message.content && message.content !== '📷' && message.content !== '📎' && message.content !== '🎬' && (
                            <Text style={styles.bubbleTextMe}>{message.content}</Text>
                        )}
                        <View style={styles.bubbleFooter}>
                            <Text style={styles.timestampMe}>
                                {new Date(message.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <StatusIcon />
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={[styles.bubble, styles.bubbleOther]}>
                        <AttachmentRenderer
                            url={message.attachment_url}
                            type={message.attachment_type}
                            name={message.attachment_name}
                            isMe={false}
                        />
                        {message.content && message.content !== '📷' && message.content !== '📎' && message.content !== '🎬' && (
                            <Text style={styles.bubbleTextOther}>{message.content}</Text>
                        )}
                        <Text style={styles.timestampOther}>
                            {new Date(message.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyMessages({ name }: { name: string }) {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View style={[styles.emptyContainer, { transform: [{ scale: scaleAnim }, { scaleY: -1 }] }]}>
            <View style={styles.emptyIconWrap}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.emptyIconGradient}>
                    <Text style={styles.emptyEmoji}>💬</Text>
                </LinearGradient>
                <View style={styles.emptyGlow} />
            </View>
            <Text style={styles.emptyTitle}>Nova conversa com {name}</Text>
            <Text style={styles.emptySubtitle}>Envia a primeira mensagem e começa a conversar!</Text>
        </Animated.View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DMChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const headerAnim = useRef(new Animated.Value(0)).current;

    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Use the offline-first hook for messages with infinite scroll
    const {
        messages: hookMessages,
        loading: messagesLoading,
        sending,
        sendMessage,
        loadMore,
        hasMore,
        loadingMore,
    } = useDMMessages(id || null);

    // Map hook messages to local type
    const messages: DMMessage[] = hookMessages.map(m => ({
        ...m,
        attachment_url: m.file_url,
        attachment_type: m.file_url ? 'image' : null,
        sender: m.sender ? { username: m.sender.username || '', avatar_url: m.sender.avatar_url } : undefined,
    })) as DMMessage[];

    const loading = loadingUser || messagesLoading;

    const { typingText, sendTyping, sendStopTyping } = useTyping(id || null);
    const { status: otherUserStatus, formatLastSeen } = useUserStatus(otherUser?.id || null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Video Call - use global CallContext
    const { initiateCall, activeCall, isInCall, endCall } = useCall();
    const [joiningCall, setJoiningCall] = useState(false);

    // Start video call - sends signal to other user
    const startCall = async () => {
        if (!id || !otherUser) return;
        setJoiningCall(true);
        try {
            await initiateCall(id, otherUser.id, otherUser.full_name || otherUser.username || 'User');
        } catch (error) {
            console.error('Failed to initiate call:', error);
            alert('Não foi possível iniciar a chamada');
        } finally {
            setJoiningCall(false);
        }
    };

    // Check if this conversation has an active call
    const isCallActiveForThis = activeCall?.conversationId === id;

    useEffect(() => {
        Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }, []);

    // Keyboard height for Android
    const keyboardHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardVisible(true);
                // Add extra offset for Android navigation bar
                const extraOffset = Platform.OS === 'android' ? insets.bottom : 0;
                Animated.timing(keyboardHeight, {
                    toValue: e.endCoordinates.height + extraOffset,
                    duration: Platform.OS === 'ios' ? 250 : 100,
                    useNativeDriver: false,
                }).start();
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
                Animated.timing(keyboardHeight, {
                    toValue: 0,
                    duration: Platform.OS === 'ios' ? 250 : 100,
                    useNativeDriver: false,
                }).start();
            }
        );
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // ============================================
    // LOAD DATA
    // ============================================

    useEffect(() => {
        async function loadOtherUser() {
            if (!id || !user?.id) return;
            setLoadingUser(true);

            const { data: conv } = await supabase
                .from('dm_conversations')
                .select('user1_id, user2_id')
                .eq('id', id)
                .single();

            if (conv) {
                const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherId).single();
                if (profile) setOtherUser(profile as Profile);
            }
            setLoadingUser(false);
        }
        loadOtherUser();
    }, [id, user?.id]);

    // Realtime is handled by useDMMessages hook

    // ============================================
    // REALTIME
    // ============================================



    // ============================================
    // SEND MESSAGE
    // ============================================

    const handleSend = useCallback(async (content: string, attachment?: { url: string; type: 'image' | 'video' | 'file' | 'gif'; name?: string }) => {
        if (!id || !otherUser) return;
        sendStopTyping();

        try {
            // Use the hook's sendMessage for optimistic updates
            const success = await sendMessage(content.trim() || (attachment ? '📎' : ''), attachment?.url);

            if (success) {
                const { data: senderProfile } = await supabase.from('profiles').select('username, full_name').eq('id', user?.id).single();
                const senderName = senderProfile?.full_name || senderProfile?.username || 'Alguém';

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
        }
    }, [id, sendStopTyping, sendMessage, otherUser, user]);

    // ============================================
    // RENDER
    // ============================================

    const displayName = otherUser?.full_name || otherUser?.username || 'Utilizador';

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar conversa...</Text>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Background */}
            <View style={styles.chatBackground}>
                <LinearGradient colors={['rgba(99, 102, 241, 0.05)', 'transparent', 'rgba(139, 92, 246, 0.05)']} style={StyleSheet.absoluteFill} />
            </View>

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Premium Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
                    </Pressable>

                    {/* Avatar with online indicator */}
                    <Pressable style={styles.headerAvatarWrap} onPress={() => otherUser && router.push(`/user/${otherUser.id}` as any)}>
                        {otherUser?.avatar_url ? (
                            <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
                        ) : (
                            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.headerAvatar}>
                                <Text style={styles.headerAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                        )}
                        {otherUserStatus === 'online' && <View style={styles.onlineBadge} />}
                    </Pressable>

                    {/* Info */}
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
                        <Text style={[styles.headerStatus, otherUserStatus === 'online' && styles.headerStatusOnline]}>
                            {typingText || (otherUserStatus === 'online' ? 'Online' : formatLastSeen())}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.headerActions}>
                        {/* Video Call Button */}
                        <Pressable
                            style={[styles.headerAction, isCallActiveForThis && { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}
                            onPress={isCallActiveForThis ? endCall : startCall}
                            disabled={joiningCall}
                        >
                            {joiningCall ? (
                                <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                                <Ionicons
                                    name={isCallActiveForThis ? "videocam" : "videocam-outline"}
                                    size={22}
                                    color={isCallActiveForThis ? "#10B981" : COLORS.text.secondary}
                                />
                            )}
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Messages with Infinite Scroll */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        const isMe = item.sender_id === user?.id;
                        const prevMsg = messages[index + 1];
                        const showAvatar = !prevMsg || prevMsg.sender_id !== item.sender_id;
                        return <MessageItem message={item} isMe={isMe} index={index} showAvatar={showAvatar} />;
                    }}
                    contentContainerStyle={styles.messagesList}
                    ListEmptyComponent={<EmptyMessages name={displayName} />}
                    ListHeaderComponent={typingText ? <TypingIndicator name={displayName} /> : null}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#6366F1" />
                                <Text style={{ fontSize: 12, color: COLORS.text.tertiary, marginTop: 4 }}>A carregar mais...</Text>
                            </View>
                        ) : null
                    }
                    inverted
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                />

                {/* Input */}
                <Animated.View style={Platform.OS === 'android' ? { marginBottom: keyboardHeight } : undefined}>
                    <BlurView intensity={80} tint="dark" style={[styles.inputBlur, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
                        <ChatInputBar onSend={handleSend} placeholder="Mensagem..." disabled={sending} />
                    </BlurView>
                </Animated.View>

                {/* Video Call Overlay - Fullscreen LiveKit */}
                {isCallActiveForThis && activeCall && (
                    <View style={StyleSheet.absoluteFill}>
                        <LiveKitRoom
                            token={activeCall.token}
                            serverUrl={activeCall.url}
                            roomName={`Chamada com ${displayName}`}
                            onLeave={endCall}
                            onError={(error: Error) => {
                                console.error('LiveKit error:', error);
                                alert('Erro na chamada: ' + error.message);
                                endCall();
                            }}
                        />
                    </View>
                )}
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    chatBackground: { ...StyleSheet.absoluteFillObject },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.3)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerAvatarWrap: { position: 'relative' },
    headerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerAvatarText: { fontSize: 18, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: COLORS.background },
    headerInfo: { flex: 1, marginLeft: SPACING.md },
    headerName: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    headerStatus: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
    headerStatusOnline: { color: '#22C55E' },
    headerActions: { flexDirection: 'row', gap: SPACING.xs },
    headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    // Messages
    messagesList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.sm },
    messageRowMe: { flexDirection: 'row-reverse' },
    messageAvatar: { marginRight: SPACING.xs },
    avatarImage: { width: 32, height: 32, borderRadius: 16 },
    avatarFallback: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 14, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    avatarSpacer: { width: 36 },
    bubbleWrapper: { maxWidth: SCREEN_WIDTH * 0.75 },
    bubbleWrapperMe: { marginLeft: SPACING.xl },
    bubble: { padding: SPACING.md, borderRadius: RADIUS.xl, ...SHADOWS.sm },
    bubbleMe: { borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: COLORS.surfaceElevated, borderBottomLeftRadius: 4 },
    bubbleTextMe: { fontSize: TYPOGRAPHY.size.base, color: '#FFF', lineHeight: 22 },
    bubbleTextOther: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, lineHeight: 22 },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    timestampMe: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
    timestampOther: { fontSize: 10, color: COLORS.text.tertiary, marginTop: 4, textAlign: 'right' },
    attachmentImage: { width: 220, height: 160, borderRadius: RADIUS.lg, marginBottom: SPACING.sm },

    // Typing
    typingContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
    typingBubble: { backgroundColor: COLORS.surfaceElevated, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.xl, borderBottomLeftRadius: 4 },
    typingDots: { flexDirection: 'row', gap: 4 },
    typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
    typingLabel: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, fontStyle: 'italic' },

    // Empty
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 250 },
    emptyIconWrap: { position: 'relative', marginBottom: SPACING.xl },
    emptyIconGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    emptyEmoji: { fontSize: 36 },
    emptyGlow: { position: 'absolute', top: -15, left: -15, right: -15, bottom: -15, borderRadius: 55, backgroundColor: 'rgba(99, 102, 241, 0.2)' },
    emptyTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.tertiary, marginTop: SPACING.xs, textAlign: 'center' },

    // Input
    inputBlur: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },

    // Media & Files (AttachmentRenderer)
    mediaContainer: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.xs },
    expandIcon: { position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    gifBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    gifBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    fileCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: RADIUS.lg, marginBottom: SPACING.xs },
    fileIconWrap: { width: 44, height: 44, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
    fileInfo: { flex: 1 },
    fileName: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.primary },
    fileNameMe: { color: '#FFF' },
    fileHint: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginTop: 2 },
    fileHintMe: { color: 'rgba(255,255,255,0.7)' },
});
