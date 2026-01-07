/**
 * 💬 Channel Chat Screen - PREMIUM DESIGN
 * Team channel with premium dark design + keyboard fix
 * Escola+ App
 */

import { CachedAvatar } from '@/components/CachedImage';
import { ChatInputBar } from '@/components/ChatInputBar';
import { Message, useChannelMessages } from '@/hooks/queries/useChannelMessages';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { useTeam } from '@/providers/TeamsProvider';
import { notifyNewMessage } from '@/services/teamNotifications';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types are now imported from useChannelMessages hook
type MessageAuthor = import('@/hooks/queries/useChannelMessages').MessageAuthor;

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
// MESSAGE ITEM
// ============================================

interface MessageItemProps {
    message: Message;
    isMe: boolean;
    index: number;
    showAvatar: boolean;
}

function MessageItem({ message, isMe, index, showAvatar }: MessageItemProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(isMe ? 30 : -30)).current;
    const [viewerVisible, setViewerVisible] = useState(false);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, delay: index * 30, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

    const getFileIcon = (name?: string | null) => {
        if (!name) return 'document';
        const ext = name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return 'document-text';
            case 'doc': case 'docx': return 'document';
            default: return 'document';
        }
    };

    const handleImagePress = () => {
        if (message.attachment_url && (message.attachment_type === 'image' || message.attachment_type === 'gif')) {
            setViewerVisible(true);
        }
    };

    const handleFilePress = () => {
        if (message.attachment_url) Linking.openURL(message.attachment_url);
    };

    const hasMedia = message.attachment_type === 'image' || message.attachment_type === 'gif';
    const hasFile = message.attachment_type === 'file';

    return (
        <>
            <Animated.View style={[
                styles.messageRow,
                isMe && styles.messageRowMe,
                { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
            ]}>
                {/* Avatar */}
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        {showAvatar ? (
                            message.author?.avatar_url ? (
                                <CachedAvatar uri={message.author.avatar_url} size={32} />
                            ) : (
                                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {(message.author?.full_name || message.author?.username || '?').charAt(0).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            )
                        ) : (
                            <View style={styles.avatarSpacer} />
                        )}
                    </View>
                )}

                {/* Bubble */}
                <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
                    {isMe ? (
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={[styles.bubble, styles.bubbleMe]}>
                            {/* Media */}
                            {hasMedia && message.attachment_url && (
                                <Pressable onPress={handleImagePress} style={styles.mediaContainer}>
                                    <Image source={{ uri: message.attachment_url }} style={styles.attachmentImage} />
                                    <View style={styles.expandIcon}>
                                        <Ionicons name="expand-outline" size={14} color="#FFF" />
                                    </View>
                                    {message.attachment_type === 'gif' && (
                                        <View style={styles.gifBadge}><Text style={styles.gifBadgeText}>GIF</Text></View>
                                    )}
                                </Pressable>
                            )}
                            {/* File */}
                            {hasFile && message.attachment_url && (
                                <Pressable style={styles.fileCard} onPress={handleFilePress}>
                                    <View style={styles.fileIconWrapMe}>
                                        <Ionicons name={getFileIcon(message.attachment_name) as any} size={22} color="#FFF" />
                                    </View>
                                    <View style={styles.fileInfo}>
                                        <Text style={styles.fileNameMe} numberOfLines={1}>{message.attachment_name || 'Ficheiro'}</Text>
                                        <Text style={styles.fileHintMe}>Toca para abrir</Text>
                                    </View>
                                    <Ionicons name="download-outline" size={18} color="rgba(255,255,255,0.7)" />
                                </Pressable>
                            )}
                            {/* Text */}
                            {message.content && message.content !== '📷' && message.content !== '📎' && message.content !== '🎬' && (
                                <Text style={styles.bubbleTextMe}>{message.content}</Text>
                            )}
                            <Text style={styles.timestampMe}>{formatTime(message.created_at)}</Text>
                        </LinearGradient>
                    ) : (
                        <View style={[styles.bubble, styles.bubbleOther]}>
                            {showAvatar && (
                                <Text style={styles.authorName}>
                                    {message.author?.full_name || message.author?.username || 'Utilizador'}
                                </Text>
                            )}
                            {/* Media */}
                            {hasMedia && message.attachment_url && (
                                <Pressable onPress={handleImagePress} style={styles.mediaContainer}>
                                    <Image source={{ uri: message.attachment_url }} style={styles.attachmentImage} />
                                    <View style={styles.expandIcon}>
                                        <Ionicons name="expand-outline" size={14} color="#FFF" />
                                    </View>
                                    {message.attachment_type === 'gif' && (
                                        <View style={styles.gifBadge}><Text style={styles.gifBadgeText}>GIF</Text></View>
                                    )}
                                </Pressable>
                            )}
                            {/* File */}
                            {hasFile && message.attachment_url && (
                                <Pressable style={styles.fileCard} onPress={handleFilePress}>
                                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.fileIconWrap}>
                                        <Ionicons name={getFileIcon(message.attachment_name) as any} size={22} color="#FFF" />
                                    </LinearGradient>
                                    <View style={styles.fileInfo}>
                                        <Text style={styles.fileName} numberOfLines={1}>{message.attachment_name || 'Ficheiro'}</Text>
                                        <Text style={styles.fileHint}>Toca para abrir</Text>
                                    </View>
                                    <Ionicons name="download-outline" size={18} color={COLORS.text.tertiary} />
                                </Pressable>
                            )}
                            {/* Text */}
                            {message.content && message.content !== '📷' && message.content !== '📎' && message.content !== '🎬' && (
                                <Text style={styles.bubbleTextOther}>{message.content}</Text>
                            )}
                            <Text style={styles.timestampOther}>{formatTime(message.created_at)}</Text>
                        </View>
                    )}
                </View>
            </Animated.View >

            {/* Image Viewer */}
            {
                message.attachment_url && hasMedia && (
                    <ImageViewerModal visible={viewerVisible} imageUrl={message.attachment_url} onClose={() => setViewerVisible(false)} />
                )
            }
        </>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyMessages({ channelName }: { channelName: string }) {
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
            <Text style={styles.emptyTitle}>#{channelName}</Text>
            <Text style={styles.emptySubtitle}>Sê o primeiro a enviar uma mensagem!</Text>
        </Animated.View>
    );
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
    const headerAnim = useRef(new Animated.Value(0)).current;

    // TanStack Query hook for messages (with caching + realtime)
    const { messages, isLoading: loading } = useChannelMessages(channelId);

    const [channelName, setChannelName] = useState('');
    const [sending, setSending] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

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
    // LOAD CHANNEL INFO
    // ============================================

    const loadChannelInfo = useCallback(async () => {
        if (!channelId) return;
        const { data } = await supabase.from('channels').select('name').eq('id', channelId).single();
        if (data) setChannelName(data.name);
    }, [channelId]);

    useEffect(() => {
        loadChannelInfo();
    }, [loadChannelInfo]);

    // ============================================
    // SEND MESSAGE
    // ============================================

    const handleSend = async (content: string, attachment?: { url: string; type: 'image' | 'video' | 'file' | 'gif'; name?: string }) => {
        if ((!content.trim() && !attachment) || !channelId || !user?.id || !teamId) return;
        setSending(true);
        try {
            const { error } = await supabase.rpc('send_team_message', {
                p_channel_id: channelId,
                p_content: content.trim() || (attachment ? '📎' : ''),
                p_attachment_url: attachment?.url || null,
                p_attachment_type: attachment?.type || null,
                p_attachment_name: attachment?.name || null,
            });
            if (!error) {
                // HANDLE NOTIFICATIONS
                const isAll = content.toLowerCase().includes('@all');
                const senderName = profile?.full_name || profile?.username || 'Alguém';

                if (isAll) {
                    // 1. @all - Notify All Members
                    const { data: members } = await supabase
                        .from('team_members')
                        .select('user_id')
                        .eq('team_id', teamId)
                        .neq('user_id', user.id);

                    if (members && members.length > 0) {
                        try {
                            const { notifyUser } = await import('@/services/teamNotifications');

                            // Send Push to all
                            members.forEach(m => {
                                notifyUser({
                                    userId: m.user_id,
                                    title: `📢 Equipa • ${channelName || 'Canal'}`,
                                    body: `${senderName}: ${content}`,
                                    data: { type: 'mention', channelId, teamId },
                                    type: 'mention'
                                });
                            });

                            // Create DB Notifications
                            const notifications = members.map(m => ({
                                user_id: m.user_id,
                                actor_id: user.id,
                                type: 'mention',
                                title: `📢 ${channelName || 'Canal'} (@all)`,
                                content: `${senderName}: ${content}`,
                                resource_id: channelId,
                                resource_type: 'channel'
                            }));
                            await supabase.from('notifications').insert(notifications);
                        } catch (err) {
                            console.error('Error sending @all notifications:', err);
                        }
                    }
                } else {
                    // 2. Mentions & Standard Notification
                    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
                    const matches = [...content.matchAll(mentionRegex)].map(m => m[1]);

                    if (matches.length > 0) {
                        try {
                            const { data: mentionedUsers } = await supabase.from('profiles').select('id, username').in('username', matches);
                            if (mentionedUsers && mentionedUsers.length > 0) {
                                const { notifyUser } = await import('@/services/teamNotifications');
                                const validUsers = mentionedUsers.filter(u => u.id !== user.id);

                                // Send Push to mentioned
                                validUsers.forEach(u => {
                                    notifyUser({
                                        userId: u.id,
                                        title: `💬 Menção • ${channelName}`,
                                        body: `${senderName}: ${content}`,
                                        data: { type: 'mention', channelId, teamId },
                                        type: 'mention'
                                    });
                                });

                                // Create DB Notifications
                                const notifications = validUsers.map(u => ({
                                    user_id: u.id,
                                    actor_id: user.id,
                                    type: 'mention',
                                    title: `💬 Foste mencionado em ${channelName}`,
                                    content: `${senderName}: ${content}`,
                                    resource_id: channelId,
                                    resource_type: 'channel'
                                }));
                                await supabase.from('notifications').insert(notifications);
                            }
                        } catch (err) {
                            console.error('Error handling mentions:', err);
                        }
                    }

                    // Standard notification (for everyone else)
                    notifyNewMessage({
                        channelId,
                        channelName: channelName || 'Canal',
                        teamId,
                        teamName: team?.name || 'Equipa',
                        senderName: senderName,
                        messagePreview: content.trim() || '📎 Anexo',
                        senderId: user.id,
                    });
                }
            }
        } catch (err) {
            console.error('Erro ao enviar:', err);
        } finally {
            setSending(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar mensagens...</Text>
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

                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.channelIcon}>
                        <Text style={styles.channelIconText}>#</Text>
                    </LinearGradient>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName} numberOfLines={1}>#{channelName}</Text>
                        <Text style={styles.headerStatus}>{messages.length} mensagens • {team?.name}</Text>
                    </View>

                    <Pressable style={styles.headerAction}>
                        <Ionicons name="search-outline" size={22} color={COLORS.text.secondary} />
                    </Pressable>
                    <Pressable style={styles.headerAction}>
                        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text.secondary} />
                    </Pressable>
                </Animated.View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        const isMe = item.user_id === user?.id;
                        const nextMsg = messages[index + 1];
                        const showAvatar = !isMe && (!nextMsg || nextMsg.user_id !== item.user_id);
                        return <MessageItem message={item} isMe={isMe} index={index} showAvatar={showAvatar} />;
                    }}
                    contentContainerStyle={styles.messagesList}
                    ListEmptyComponent={<EmptyMessages channelName={channelName} />}
                    inverted
                    showsVerticalScrollIndicator={false}
                />

                {/* Input */}
                <Animated.View style={Platform.OS === 'android' ? { marginBottom: keyboardHeight } : undefined}>
                    <BlurView intensity={80} tint="dark" style={[styles.inputBlur, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
                        <ChatInputBar
                            onSend={handleSend}
                            placeholder="Mensagem..."
                            disabled={sending}
                            teamId={teamId}
                            showAllMention={true}
                        />
                    </BlurView>
                </Animated.View>
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
    channelIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    channelIconText: { fontSize: 20, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    headerInfo: { flex: 1, marginLeft: SPACING.md },
    headerName: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    headerStatus: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
    headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    // Messages
    messagesList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.sm },
    messageRowMe: { flexDirection: 'row-reverse' },
    avatarContainer: { width: 36, marginRight: SPACING.xs },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    avatarSpacer: { width: 32 },
    bubbleWrapper: { maxWidth: SCREEN_WIDTH * 0.75 },
    bubbleWrapperMe: { marginLeft: SPACING.xl },
    bubble: { padding: SPACING.md, borderRadius: RADIUS.xl, ...SHADOWS.sm },
    bubbleMe: { borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: COLORS.surfaceElevated, borderBottomLeftRadius: 4 },
    authorName: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.semibold, color: '#6366F1', marginBottom: 4 },
    bubbleTextMe: { fontSize: TYPOGRAPHY.size.base, color: '#FFF', lineHeight: 22 },
    bubbleTextOther: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, lineHeight: 22 },
    timestampMe: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' },
    timestampOther: { fontSize: 10, color: COLORS.text.tertiary, marginTop: 4, textAlign: 'right' },

    // Media & Files
    mediaContainer: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.xs },
    attachmentImage: { width: 220, height: 160, borderRadius: RADIUS.lg },
    expandIcon: { position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    gifBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    gifBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    fileCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: RADIUS.lg, marginBottom: SPACING.xs },
    fileIconWrap: { width: 44, height: 44, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
    fileIconWrapMe: { width: 44, height: 44, borderRadius: RADIUS.lg, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    fileInfo: { flex: 1 },
    fileName: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.primary },
    fileNameMe: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: '#FFF' },
    fileHint: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginTop: 2 },
    fileHintMe: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

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
});
