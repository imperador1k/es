/**
 * 📚 Study Room - PREMIUM REDESIGN V2
 * Complete structural redesign with modern layout
 * Features: Immersive room view, modern cards, glassmorphism
 */

import { FloatingReactions } from '@/components/FloatingReactions';
import { LiveKitRoom } from '@/components/StudyRoom/LiveKitRoom';
import { StudyRoomChat } from '@/components/StudyRoomChat';
import { useStartConversation } from '@/hooks/useDMs';
import { useStudyRoomAudio } from '@/hooks/useStudyRoomAudio';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { getLiveKitToken, getRoomName } from '@/services/livekitService';
import { SoundService } from '@/utils/SoundService';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface StudyRoom {
    id: string;
    name: string;
    description: string | null;
    emoji: string;
    theme: string;
    max_participants: number;
    participant_count?: number;
    music_url?: string | null;
    background_color?: string;
    is_custom?: boolean;
    password?: string | null;
    created_by?: string | null;
}

interface Participant {
    id: string;
    user_id: string;
    focus_minutes: number;
    status: string;
    joined_at: string;
    profile?: {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
        current_tier: string;
    };
}

interface Reaction {
    id: string;
    emoji: string;
    from_user_id: string;
    to_user_id: string | null;
    created_at: string;
}

// ============================================
// CONSTANTS
// ============================================

const REACTION_EMOJIS = ['🔥', '💪', '👋', '☕', '🎉', '❤️', '👏', '🙌'];
const ROOM_EMOJIS = ['📚', '🎧', '☕', '🌧️', '🌲', '🔥', '💻', '🧠', '✨', '🎮'];
const ROOM_COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6'];

// ============================================
// ROOM CARD COMPONENT - Premium Design
// ============================================

function RoomCard({ room, onJoin }: { room: StudyRoom; onJoin: () => void }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isActive = (room.participant_count || 0) > 0;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
            <Pressable onPress={onJoin} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <LinearGradient
                    colors={room.background_color
                        ? [room.background_color, `${room.background_color}CC`]
                        : ['#1E1E2E', '#2D2D3F']
                    }
                    style={styles.roomCard}
                >
                    {/* Glow effect for active rooms */}
                    {isActive && <View style={[styles.roomGlow, { backgroundColor: room.background_color || '#6366F1' }]} />}

                    {/* Top row: emoji + icons */}
                    <View style={styles.roomCardTop}>
                        <View style={styles.roomEmojiWrap}>
                            <Text style={styles.roomCardEmoji}>{room.emoji}</Text>
                        </View>
                        <View style={styles.roomCardIcons}>
                            {room.password && (
                                <View style={styles.roomIconBadge}>
                                    <Ionicons name="lock-closed" size={12} color="#FFF" />
                                </View>
                            )}
                            {room.music_url && (
                                <View style={[styles.roomIconBadge, { backgroundColor: '#10B981' }]}>
                                    <Ionicons name="musical-note" size={12} color="#FFF" />
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Room name */}
                    <Text style={styles.roomCardName} numberOfLines={1}>{room.name}</Text>

                    {/* Room description */}
                    <Text style={styles.roomCardDesc} numberOfLines={1}>
                        {room.is_custom ? '✨ Custom Room' : (room.description || 'Sala de estudo')}
                    </Text>

                    {/* Bottom: participants */}
                    <View style={styles.roomCardBottom}>
                        <View style={styles.roomParticipants}>
                            {isActive && (
                                <View style={styles.liveDot} />
                            )}
                            <Ionicons name="people" size={14} color={isActive ? '#10B981' : COLORS.text.tertiary} />
                            <Text style={[styles.roomParticipantsText, isActive && { color: '#10B981' }]}>
                                {room.participant_count}/{room.max_participants}
                            </Text>
                        </View>
                        <View style={styles.joinBtn}>
                            <Text style={styles.joinBtnText}>Entrar</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFF" />
                        </View>
                    </View>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// PARTICIPANT AVATAR COMPONENT
// ============================================

function ParticipantAvatar({ participant, isMe, onPress }: { participant: Participant; isMe: boolean; onPress?: () => void }) {
    const isFocusing = participant.status === 'focusing';

    return (
        <Pressable onPress={onPress} style={styles.participantItem}>
            <View style={styles.participantAvatarWrap}>
                {participant.profile?.avatar_url ? (
                    <Image source={{ uri: participant.profile.avatar_url }} style={styles.participantAvatar} />
                ) : (
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.participantAvatar}>
                        <Text style={styles.avatarInitial}>
                            {(participant.profile?.username || 'U')[0].toUpperCase()}
                        </Text>
                    </LinearGradient>
                )}
                {/* Status ring */}
                <View style={[styles.statusRing, { borderColor: isFocusing ? '#10B981' : '#F59E0B' }]} />
                {isMe && (
                    <View style={styles.meBadge}>
                        <Text style={styles.meBadgeText}>Tu</Text>
                    </View>
                )}
            </View>
            <Text style={styles.participantName} numberOfLines={1}>
                {participant.profile?.username || 'User'}
            </Text>
            <Text style={styles.participantTime}>{participant.focus_minutes}m</Text>
        </Pressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function StudyRoomScreen() {
    const { user } = useAuthContext();
    const { startOrGetConversation } = useStartConversation();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const [startingDM, setStartingDM] = useState(false);
    const headerAnim = useRef(new Animated.Value(0)).current;

    // State
    const [loading, setLoading] = useState(true);
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [focusMinutes, setFocusMinutes] = useState(0);

    // V2: Chat and Vibe Sync
    const [showChat, setShowChat] = useState(false);
    const [showStationPicker, setShowStationPicker] = useState(false);

    // V3: UX Enhancements
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [showParticipantsDrawer, setShowParticipantsDrawer] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

    // V3: Floating Reactions
    const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
    const showChatRef = useRef(showChat);
    const previousParticipantsRef = useRef<Participant[]>([]);

    useEffect(() => {
        showChatRef.current = showChat;
        if (showChat) setUnreadMessages(0);
    }, [showChat]);

    useEffect(() => {
        Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }, []);

    // DJ Logic
    const isOwner = currentRoom?.created_by === user?.id;
    const isDJ = (() => {
        if (!currentRoom || !user?.id) return false;
        if (currentRoom.created_by) return currentRoom.created_by === user.id;
        if (participants.length > 0) {
            const sortedByJoinTime = [...participants].sort(
                (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
            );
            return sortedByJoinTime[0]?.user_id === user.id;
        }
        return false;
    })();

    const {
        currentTrackName,
        isPlaying: isRoomPlaying,
        isLoading: audioLoading,
        stations: vibeStations,
        changeStation,
        togglePlayPause: toggleRoomMusic,
        stopAndCleanup
    } = useStudyRoomAudio({
        roomId: currentRoom?.id || null,
        isOwner: isDJ
    });

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingRoom, setPendingRoom] = useState<StudyRoom | null>(null);
    const [passwordInput, setPasswordInput] = useState('');

    // Create room form
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomEmoji, setNewRoomEmoji] = useState('📚');
    const [newRoomColor, setNewRoomColor] = useState('#6366F1');
    const [newRoomMusic, setNewRoomMusic] = useState('');
    const [newRoomPrivate, setNewRoomPrivate] = useState(false);
    const [newRoomPassword, setNewRoomPassword] = useState('');
    const [creating, setCreating] = useState(false);

    // V4: LiveKit Video Call
    const [isCallActive, setIsCallActive] = useState(false);
    const [livekitToken, setLivekitToken] = useState<string | null>(null);
    const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
    const [joiningCall, setJoiningCall] = useState(false);

    // Join video call
    const joinCall = async () => {
        if (!currentRoom || !user) return;
        console.log('[Study Room] joinCall triggered');
        console.log('[Study Room] Current room ID:', currentRoom.id);
        console.log('[Study Room] User ID:', user.id);

        setJoiningCall(true);
        try {
            const myParticipant = participants.find(p => p.user_id === user.id);
            const roomName = getRoomName(currentRoom.id);
            const username = myParticipant?.profile?.username || user.email?.split('@')[0] || 'User';

            console.log('[Study Room] Calling getLiveKitToken with:');
            console.log('[Study Room] - roomName:', roomName);
            console.log('[Study Room] - username:', username);

            // NOTE: Do NOT pass avatar_url if it's a base64 image - it will make the JWT token huge!
            // Only pass if it's a real URL (starts with http)
            const avatarUrl = myParticipant?.profile?.avatar_url;
            const safeAvatarUrl = avatarUrl && avatarUrl.startsWith('http') ? avatarUrl : undefined;

            const response = await getLiveKitToken(
                roomName,
                username,
                user.id,
                safeAvatarUrl
            );

            console.log('[Study Room] Token response received');
            console.log('[Study Room] Token length:', response.token?.length);
            console.log('[Study Room] URL:', response.url);

            setLivekitToken(response.token);
            setLivekitUrl(response.url);
            setIsCallActive(true);
        } catch (error) {
            console.error('[Study Room] Failed to join call:', error);
            showAlert({ title: 'Erro', message: 'Não foi possível entrar na chamada' });
        } finally {
            setJoiningCall(false);
        }
    };

    // Leave video call
    const leaveCall = () => {
        setIsCallActive(false);
        setLivekitToken(null);
        setLivekitUrl(null);
    };

    // ============================================
    // DATA FETCHING (same as before)
    // ============================================

    const fetchRooms = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('study_rooms')
                .select(`id, name, description, emoji, theme, max_participants, music_url, background_color, is_custom, password, created_by, study_room_participants(count)`)
                .or('is_public.eq.true,created_by.eq.' + user?.id)
                .order('is_custom', { ascending: true })
                .order('name');

            if (error) throw error;
            const roomsWithCount = (data || []).map(room => ({
                ...room,
                participant_count: room.study_room_participants?.[0]?.count || 0,
            }));
            setRooms(roomsWithCount);
        } catch (err) {
            console.error('Error fetching rooms:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    const checkCurrentRoom = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data } = await supabase.rpc('get_my_current_room');
            if (data?.room) {
                setCurrentRoom(data.room);
                setFocusMinutes(data.participation?.focus_minutes || 0);
                await fetchParticipants(data.room.id);
            }
        } catch (err) {
            console.error('Error checking current room:', err);
        }
    }, [user?.id]);

    const fetchParticipants = async (roomId: string) => {
        try {
            const { data } = await supabase
                .from('study_room_participants')
                .select(`id, user_id, focus_minutes, status, joined_at, profiles(id, username, full_name, avatar_url, current_tier)`)
                .eq('room_id', roomId)
                .order('joined_at');

            const mapped = (data || []).map(p => ({
                ...p,
                profile: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
            })) as Participant[];
            setParticipants(mapped);
        } catch (err) {
            console.error('Error fetching participants:', err);
        }
    };

    // ============================================
    // ROOM ACTIONS
    // ============================================

    const handleJoinRoom = async (room: StudyRoom) => {
        if (room.password && room.created_by !== user?.id) {
            setPendingRoom(room);
            setPasswordInput('');
            setShowPasswordModal(true);
            return;
        }
        await joinRoom(room.id);
    };

    const joinRoom = async (roomId: string, password?: string) => {
        try {
            const rpcName = password ? 'join_study_room_with_password' : 'join_study_room';
            const params = password ? { p_room_id: roomId, p_password: password } : { p_room_id: roomId };
            const { data, error } = await supabase.rpc(rpcName, params);

            if (error) throw error;
            if (data?.success) {
                setCurrentRoom(data.room);
                setFocusMinutes(0);
                setShowPasswordModal(false);
                setPendingRoom(null);
                await fetchParticipants(roomId);
                await fetchRooms();

                // Play join sound
                SoundService.playJoin();
            } else {
                showAlert({ title: 'Erro', message: data?.error || 'Não foi possível entrar na sala' });
            }
        } catch (err: any) {
            showAlert({ title: 'Erro', message: err.message });
        }
    };

    const leaveRoom = async () => {
        try {
            await stopAndCleanup();
            setShowChat(false);
            const { data, error } = await supabase.rpc('leave_study_room');
            if (error) throw error;
            if (data?.xp_earned > 0) {
                showAlert({ title: '🎉 Sessão Terminada!', message: `Estudaste ${data.focus_minutes} minutos e ganhaste ${data.xp_earned} XP!` });
            }
            setCurrentRoom(null);
            setParticipants([]);
            setFocusMinutes(0);

            // Play leave sound
            SoundService.playLeave();

            await fetchRooms();
        } catch (err: any) {
            showAlert({ title: 'Erro', message: err.message });
        }
    };

    const createRoom = async () => {
        if (!newRoomName.trim()) {
            showAlert({ title: 'Erro', message: 'Dá um nome à tua sala' });
            return;
        }
        setCreating(true);
        try {
            const { data, error } = await supabase.rpc('create_custom_room', {
                p_name: newRoomName.trim(),
                p_emoji: newRoomEmoji,
                p_theme: 'custom',
                p_music_url: newRoomMusic.trim() || null,
                p_background_color: newRoomColor,
                p_password: newRoomPrivate ? newRoomPassword : null,
            });

            if (error) throw error;
            if (data?.success) {
                setShowCreateModal(false);
                resetCreateForm();
                const { data: roomData } = await supabase.from('study_rooms').select('*').eq('id', data.room_id).single();
                if (roomData) {
                    setCurrentRoom(roomData);
                    await fetchParticipants(data.room_id);
                }
                await fetchRooms();
            } else {
                showAlert({ title: 'Erro', message: data?.error || 'Não foi possível criar a sala' });
            }
        } catch (err: any) {
            showAlert({ title: 'Erro', message: err.message });
        } finally {
            setCreating(false);
        }
    };

    const resetCreateForm = () => {
        setNewRoomName('');
        setNewRoomEmoji('📚');
        setNewRoomColor('#6366F1');
        setNewRoomMusic('');
        setNewRoomPrivate(false);
        setNewRoomPassword('');
    };

    const deleteMyRoom = async () => {
        showAlert({
            title: 'Apagar Sala',
            message: 'Tens a certeza que queres apagar a tua sala?',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar', style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.rpc('delete_my_room');
                            if (error) throw error;
                            setCurrentRoom(null);
                            await fetchRooms();
                        } catch (err: any) {
                            showAlert({ title: 'Erro', message: err.message });
                        }
                    },
                },
            ]
        });
    };

    const sendReaction = async (emoji: string, toUserId?: string) => {
        if (!currentRoom) return;
        try {
            await supabase.rpc('send_room_reaction', {
                p_room_id: currentRoom.id,
                p_emoji: emoji,
                p_to_user_id: toUserId || null,
            });
        } catch (err) {
            console.error('Error sending reaction:', err);
        }
    };

    // ============================================
    // REALTIME SUBSCRIPTIONS
    // ============================================

    useEffect(() => {
        if (!currentRoom) return;

        const participantsChannel = supabase
            .channel(`room-${currentRoom.id}-participants`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'study_room_participants', filter: `room_id=eq.${currentRoom.id}` }, async (payload) => {
                const oldCount = previousParticipantsRef.current.length;
                await fetchParticipants(currentRoom.id);
                const newCount = participants.length;

                // Play sounds based on participant changes
                if (payload.eventType === 'INSERT' && payload.new.user_id !== user?.id) {
                    SoundService.playJoin();
                } else if (payload.eventType === 'DELETE' && payload.old.user_id !== user?.id) {
                    SoundService.playLeave();
                }
            })
            .subscribe();

        const reactionsChannel = supabase
            .channel(`room-${currentRoom.id}-reactions`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_room_reactions', filter: `room_id=eq.${currentRoom.id}` }, (payload) => {
                const reaction = payload.new as Reaction;
                setReactions(prev => [...prev, reaction].slice(-10));
                const screenWidth = Dimensions.get('window').width;
                const floatingId = `${reaction.id}-${Date.now()}`;
                setFloatingEmojis(prev => [...prev, { id: floatingId, emoji: reaction.emoji, x: Math.random() * (screenWidth - 60) + 30 }]);
                setTimeout(() => { setReactions(prev => prev.filter(r => r.id !== reaction.id)); }, 3000);
            })
            .subscribe();

        const messagesChannel = supabase
            .channel(`room-${currentRoom.id}-messages`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_room_messages', filter: `room_id=eq.${currentRoom.id}` }, (payload) => {
                const msg = payload.new as { user_id: string };
                if (msg.user_id !== user?.id) {
                    // Play notification sound for new messages from others
                    SoundService.playNotification();

                    if (!showChatRef.current) {
                        setUnreadMessages(prev => prev + 1);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(participantsChannel);
            supabase.removeChannel(reactionsChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, [currentRoom?.id, user?.id]);

    useEffect(() => {
        if (!currentRoom) return;
        const interval = setInterval(async () => {
            await supabase.rpc('update_study_presence', { p_status: 'focusing', p_add_minutes: 1 });
            setFocusMinutes(prev => prev + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, [currentRoom]);

    useEffect(() => {
        fetchRooms();
        checkCurrentRoom();
    }, []);

    // ============================================
    // RENDER - LOADING
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar salas...</Text>
                </View>
            </View>
        );
    }

    // ============================================
    // RENDER - IN ROOM (Immersive View)
    // ============================================

    if (currentRoom) {
        const isMyRoom = currentRoom.created_by === user?.id;

        return (
            <View style={[styles.container, currentRoom.background_color ? { backgroundColor: currentRoom.background_color } : null]}>
                {/* Gradient overlay */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.5)']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Floating Reactions */}
                <FloatingReactions
                    reactions={floatingEmojis}
                    onAnimationComplete={(id: string) => { setFloatingEmojis(prev => prev.filter(e => e.id !== id)); }}
                />

                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    {/* Premium Header */}
                    <BlurView intensity={60} tint="dark" style={styles.inRoomHeader}>
                        <Pressable style={styles.leaveBtn} onPress={leaveRoom}>
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </Pressable>

                        <View style={styles.roomTitleWrap}>
                            <Text style={styles.roomTitleEmoji}>{currentRoom.emoji}</Text>
                            <View>
                                <Text style={styles.roomTitle} numberOfLines={1}>{currentRoom.name}</Text>
                                <Text style={styles.roomSubtitle}>
                                    {participants.length} estudantes • {focusMinutes}m de foco
                                </Text>
                            </View>
                        </View>

                        <View style={styles.headerActions}>
                            {/* Participants Button */}
                            <Pressable
                                style={styles.headerBtn}
                                onPress={() => setShowParticipantsDrawer(true)}
                            >
                                <Ionicons name="people" size={20} color="#FFF" />
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{participants.length}</Text>
                                </View>
                            </Pressable>

                            {/* Chat Button */}
                            <Pressable
                                style={[styles.headerBtn, showChat && styles.headerBtnActive]}
                                onPress={() => { setShowChat(!showChat); if (!showChat) setUnreadMessages(0); }}
                            >
                                <Ionicons name={showChat ? "chatbubbles" : "chatbubbles-outline"} size={20} color="#FFF" />
                                {unreadMessages > 0 && !showChat && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{unreadMessages > 9 ? '9+' : unreadMessages}</Text>
                                    </View>
                                )}
                            </Pressable>

                            {/* Video Call Button */}
                            <Pressable
                                style={[styles.headerBtn, isCallActive && styles.headerBtnActive]}
                                onPress={isCallActive ? leaveCall : joinCall}
                                disabled={joiningCall}
                            >
                                {joiningCall ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons
                                        name={isCallActive ? "videocam" : "videocam-outline"}
                                        size={20}
                                        color={isCallActive ? "#10B981" : "#FFF"}
                                    />
                                )}
                            </Pressable>

                            {/* Settings/Delete for owner */}
                            {isMyRoom && (
                                <Pressable style={styles.headerBtn} onPress={deleteMyRoom}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </Pressable>
                            )}
                        </View>
                    </BlurView>

                    {/* Music Control Card */}
                    <View style={styles.musicCard}>
                        <LinearGradient colors={['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.2)']} style={styles.musicCardGradient}>
                            <View style={styles.musicCardLeft}>
                                <View style={styles.musicIcon}>
                                    <Text style={styles.musicIconText}>{isRoomPlaying ? '🎵' : '🔇'}</Text>
                                </View>
                                <View style={styles.musicInfo}>
                                    <Text style={styles.musicTitle}>{currentTrackName === 'Nenhuma' ? 'Sem música' : currentTrackName}</Text>
                                    <Text style={styles.musicSubtitle}>{isDJ ? '🎧 Tu controlas a música' : 'O DJ controla'}</Text>
                                </View>
                            </View>
                            {isDJ && (
                                <View style={styles.musicControls}>
                                    {currentTrackName !== 'Nenhuma' && (
                                        <Pressable style={styles.musicControlBtn} onPress={toggleRoomMusic}>
                                            <Ionicons name={isRoomPlaying ? "pause" : "play"} size={18} color="#FFF" />
                                        </Pressable>
                                    )}
                                    <Pressable style={styles.musicPickerBtn} onPress={() => setShowStationPicker(true)}>
                                        <Ionicons name="radio" size={16} color="#FFF" />
                                    </Pressable>
                                </View>
                            )}
                        </LinearGradient>
                    </View>

                    {/* Participants Section */}
                    <View style={styles.participantsSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>👥 Estudantes Online</Text>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDotSmall} />
                                <Text style={styles.liveText}>{participants.length} LIVE</Text>
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.participantsScroll}>
                            {participants.map((p) => (
                                <ParticipantAvatar
                                    key={p.id}
                                    participant={p}
                                    isMe={p.user_id === user?.id}
                                    onPress={() => { if (p.user_id !== user?.id) sendReaction('👋', p.user_id); }}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {/* Focus Timer Card */}
                    <View style={styles.focusCard}>
                        <LinearGradient colors={['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.1)']} style={styles.focusCardGradient}>
                            <Ionicons name="timer-outline" size={28} color="#10B981" />
                            <View style={styles.focusInfo}>
                                <Text style={styles.focusTime}>{focusMinutes}</Text>
                                <Text style={styles.focusLabel}>minutos de foco</Text>
                            </View>
                            <View style={styles.focusBadge}>
                                <Text style={styles.focusBadgeText}>🔥 Em modo foco</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Reaction Bar */}
                    <BlurView intensity={80} tint="dark" style={styles.reactionBar}>
                        <Text style={styles.reactionLabel}>Enviar:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {REACTION_EMOJIS.map((emoji) => (
                                <Pressable key={emoji} style={styles.reactionBtn} onPress={() => sendReaction(emoji)}>
                                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </BlurView>

                    {/* Chat Overlay */}
                    {showChat && (
                        <View style={styles.chatOverlay}>
                            <StudyRoomChat roomId={currentRoom.id} onNewMessage={() => { if (!showChat) setUnreadMessages(prev => prev + 1); }} onClose={() => setShowChat(false)} />
                        </View>
                    )}

                    {/* Video Call Overlay */}
                    {isCallActive && livekitToken && livekitUrl && (
                        <View style={StyleSheet.absoluteFill}>
                            <LiveKitRoom
                                token={livekitToken}
                                serverUrl={livekitUrl}
                                roomName={currentRoom.name}
                                onLeave={leaveCall}
                                onError={(error) => {
                                    console.error('LiveKit error:', error);
                                    showAlert({ title: 'Erro na Chamada', message: error.message });
                                    leaveCall();
                                }}
                            />
                        </View>
                    )}
                </SafeAreaView>

                {/* Station Picker Modal */}
                <Modal visible={showStationPicker} animationType="slide" transparent onRequestClose={() => setShowStationPicker(false)}>
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={100} tint="dark" style={styles.stationModal}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>🎵 Escolher Vibe</Text>
                            <Text style={styles.modalSubtitle}>Todos na sala vão ouvir a mesma música</Text>
                            <ScrollView style={styles.stationsList}>
                                {vibeStations.map((station) => (
                                    <Pressable
                                        key={station.id}
                                        style={[styles.stationItem, currentTrackName === station.name && styles.stationItemActive]}
                                        onPress={async () => { await changeStation(station); setShowStationPicker(false); }}
                                    >
                                        <Text style={styles.stationEmoji}>{station.emoji}</Text>
                                        <Text style={styles.stationName}>{station.name}</Text>
                                        {currentTrackName === station.name && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </BlurView>
                    </View>
                </Modal>

                {/* Participants Drawer Modal */}
                <Modal visible={showParticipantsDrawer} animationType="slide" transparent onRequestClose={() => setShowParticipantsDrawer(false)}>
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={100} tint="dark" style={styles.participantsModal}>
                            <View style={styles.modalHandle} />
                            <View style={styles.participantsModalHeader}>
                                <Text style={styles.modalTitle}>👥 Participantes ({participants.length})</Text>
                                <Pressable onPress={() => setShowParticipantsDrawer(false)}>
                                    <Ionicons name="close" size={24} color="#FFF" />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.participantsList}>
                                {participants.map((p) => (
                                    <View key={p.id} style={styles.participantRow}>
                                        <View style={styles.participantRowLeft}>
                                            {p.profile?.avatar_url ? (
                                                <Image source={{ uri: p.profile.avatar_url }} style={styles.participantRowAvatar} />
                                            ) : (
                                                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.participantRowAvatar}>
                                                    <Text style={styles.participantRowInitial}>{(p.profile?.username || 'U')[0].toUpperCase()}</Text>
                                                </LinearGradient>
                                            )}
                                            <View style={styles.participantRowInfo}>
                                                <View style={styles.participantRowNameRow}>
                                                    <Text style={styles.participantRowName}>{p.profile?.username || 'User'}</Text>
                                                    {p.user_id === user?.id && <View style={styles.youTag}><Text style={styles.youTagText}>Tu</Text></View>}
                                                    {p.user_id === currentRoom?.created_by && <View style={styles.djTag}><Text style={styles.djTagText}>🎧 DJ</Text></View>}
                                                </View>
                                                <Text style={styles.participantRowStatus}>
                                                    {p.status === 'focusing' ? '🟢 Focando' : '🟡 Pausa'} • {p.focus_minutes}m
                                                </Text>
                                            </View>
                                        </View>
                                        {p.user_id !== user?.id && (
                                            <View style={styles.participantRowActions}>
                                                <Pressable
                                                    style={styles.participantRowBtn}
                                                    onPress={() => { setShowParticipantsDrawer(false); router.push(`/public-profile/${p.user_id}` as any); }}
                                                >
                                                    <Ionicons name="person" size={18} color="#6366F1" />
                                                </Pressable>
                                                <Pressable
                                                    style={styles.participantRowBtn}
                                                    onPress={async () => {
                                                        setShowParticipantsDrawer(false);
                                                        setStartingDM(true);
                                                        try {
                                                            const convId = await startOrGetConversation(p.user_id);
                                                            if (convId) router.push(`/dm/${convId}` as any);
                                                        } finally { setStartingDM(false); }
                                                    }}
                                                >
                                                    <Ionicons name="chatbubble" size={18} color="#6366F1" />
                                                </Pressable>
                                                <Pressable
                                                    style={styles.participantRowBtn}
                                                    onPress={() => sendReaction('👋', p.user_id)}
                                                >
                                                    <Text style={{ fontSize: 18 }}>👋</Text>
                                                </Pressable>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </BlurView>
                    </View>
                </Modal>
            </View>
        );
    }

    // ============================================
    // RENDER - ROOM SELECTION (Premium Grid)
    // ============================================

    return (
        <View style={styles.container}>
            <LinearGradient colors={['rgba(99, 102, 241, 0.1)', 'transparent']} style={styles.bgGradient} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Premium Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerEmoji}>🎧</Text>
                        <View>
                            <Text style={styles.headerTitle}>Study Rooms</Text>
                            <Text style={styles.headerSubtitle}>Estuda com os teus colegas</Text>
                        </View>
                    </View>
                </Animated.View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Stats Banner */}
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.statsBanner}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{rooms.length}</Text>
                            <Text style={styles.statLabel}>Salas</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{rooms.reduce((acc, r) => acc + (r.participant_count || 0), 0)}</Text>
                            <Text style={styles.statLabel}>Online</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{rooms.filter(r => r.music_url).length}</Text>
                            <Text style={styles.statLabel}>Com Música</Text>
                        </View>
                    </LinearGradient>

                    {/* Active Rooms */}
                    {rooms.filter(r => (r.participant_count || 0) > 0).length > 0 && (
                        <>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitleMain}>🔴 Salas Ativas</Text>
                                <View style={styles.liveIndicator}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveCountText}>{rooms.filter(r => (r.participant_count || 0) > 0).length}</Text>
                                </View>
                            </View>
                            <View style={styles.roomsGrid}>
                                {rooms.filter(r => (r.participant_count || 0) > 0).map((room) => (
                                    <RoomCard key={room.id} room={room} onJoin={() => handleJoinRoom(room)} />
                                ))}
                            </View>
                        </>
                    )}

                    {/* All Rooms */}
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitleMain}>📚 Todas as Salas</Text>
                    </View>
                    <View style={styles.roomsGrid}>
                        {rooms.filter(r => (r.participant_count || 0) === 0).map((room) => (
                            <RoomCard key={room.id} room={room} onJoin={() => handleJoinRoom(room)} />
                        ))}
                    </View>

                    {rooms.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📚</Text>
                            <Text style={styles.emptyTitle}>Nenhuma sala disponível</Text>
                            <Text style={styles.emptySubtitle}>Cria a primeira sala de estudo!</Text>
                        </View>
                    )}
                </ScrollView>

                {/* FAB */}
                <Pressable style={styles.fab} onPress={() => setShowCreateModal(true)}>
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.fabGradient}>
                        <Ionicons name="add" size={28} color="#FFF" />
                    </LinearGradient>
                </Pressable>
            </SafeAreaView>

            {/* Create Room Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
                <TouchableWithoutFeedback onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined}>
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={100} tint="dark" style={styles.createModal}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>✨ Criar Sala</Text>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.inputLabel}>Nome da Sala</Text>
                                <TextInput style={styles.textInput} placeholder="Ex: Matemática 12º" placeholderTextColor={COLORS.text.tertiary} value={newRoomName} onChangeText={setNewRoomName} maxLength={30} />

                                <Text style={styles.inputLabel}>Emoji</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                                    {ROOM_EMOJIS.map((emoji) => (
                                        <Pressable key={emoji} style={[styles.emojiOption, newRoomEmoji === emoji && styles.emojiSelected]} onPress={() => setNewRoomEmoji(emoji)}>
                                            <Text style={styles.emojiText}>{emoji}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                <Text style={styles.inputLabel}>Cor</Text>
                                <View style={styles.colorRow}>
                                    {ROOM_COLORS.map((color) => (
                                        <Pressable key={color} style={[styles.colorOption, { backgroundColor: color }, newRoomColor === color && styles.colorSelected]} onPress={() => setNewRoomColor(color)} />
                                    ))}
                                </View>

                                <View style={styles.switchRow}>
                                    <View>
                                        <Text style={styles.switchLabel}>🔒 Sala Privada</Text>
                                        <Text style={styles.switchHint}>Requer password</Text>
                                    </View>
                                    <Switch value={newRoomPrivate} onValueChange={setNewRoomPrivate} trackColor={{ true: '#6366F1' }} />
                                </View>

                                {newRoomPrivate && (
                                    <TextInput style={styles.textInput} placeholder="Password" placeholderTextColor={COLORS.text.tertiary} value={newRoomPassword} onChangeText={setNewRoomPassword} secureTextEntry />
                                )}

                                <Pressable style={[styles.createBtn, creating && { opacity: 0.6 }]} onPress={createRoom} disabled={creating}>
                                    {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createBtnText}>Criar e Entrar</Text>}
                                </Pressable>
                            </ScrollView>
                        </BlurView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Password Modal */}
            <Modal visible={showPasswordModal} animationType="fade" transparent onRequestClose={() => setShowPasswordModal(false)}>
                <TouchableWithoutFeedback onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined}>
                    <View style={styles.modalOverlayCentered}>
                        <BlurView intensity={100} tint="dark" style={styles.passwordModal}>
                            <Text style={styles.passwordTitle}>🔒 Sala Privada</Text>
                            <Text style={styles.passwordSubtitle}>Introduz a password para "{pendingRoom?.name}"</Text>
                            <TextInput style={styles.textInput} placeholder="Password" placeholderTextColor={COLORS.text.tertiary} value={passwordInput} onChangeText={setPasswordInput} secureTextEntry autoFocus />
                            <View style={styles.passwordBtns}>
                                <Pressable style={styles.passwordCancelBtn} onPress={() => { setShowPasswordModal(false); setPendingRoom(null); }}>
                                    <Text style={styles.passwordCancelText}>Cancelar</Text>
                                </Pressable>
                                <Pressable style={styles.passwordConfirmBtn} onPress={() => pendingRoom && joinRoom(pendingRoom.id, passwordInput)}>
                                    <Text style={styles.passwordConfirmText}>Entrar</Text>
                                </Pressable>
                            </View>
                        </BlurView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

// ============================================
// STYLES - Premium Modern Design
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },
    bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginLeft: SPACING.md },
    headerEmoji: { fontSize: 32 },
    headerTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },

    scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },

    // Stats Banner
    statsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: SPACING.lg, borderRadius: RADIUS.xl, marginBottom: SPACING.xl },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: 28, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    statLabel: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.8)' },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },

    // Section Headers
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md, marginTop: SPACING.lg },
    sectionTitleMain: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    liveCountText: { fontSize: TYPOGRAPHY.size.xs, color: '#EF4444', fontWeight: TYPOGRAPHY.weight.bold },

    // Room Card
    roomsGrid: { gap: SPACING.md },
    roomCard: { padding: SPACING.lg, borderRadius: RADIUS.xl, overflow: 'hidden', position: 'relative' },
    roomGlow: { position: 'absolute', top: -50, right: -50, width: 100, height: 100, borderRadius: 50, opacity: 0.3 },
    roomCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
    roomEmojiWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    roomCardEmoji: { fontSize: 24 },
    roomCardIcons: { flexDirection: 'row', gap: 6 },
    roomIconBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    roomCardName: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF', marginBottom: 4 },
    roomCardDesc: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.6)', marginBottom: SPACING.md },
    roomCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roomParticipants: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    roomParticipantsText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
    joinBtnText: { fontSize: TYPOGRAPHY.size.sm, color: '#FFF', fontWeight: TYPOGRAPHY.weight.medium },

    // Empty State
    emptyState: { alignItems: 'center', paddingVertical: SPACING.xl * 2 },
    emptyEmoji: { fontSize: 64, marginBottom: SPACING.md },
    emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.tertiary, marginTop: SPACING.xs },

    // FAB
    fab: { position: 'absolute', bottom: 100, right: SPACING.lg, ...SHADOWS.lg },
    fabGradient: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },

    // In Room View
    inRoomHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    leaveBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    roomTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginLeft: SPACING.md },
    roomTitleEmoji: { fontSize: 28 },
    roomTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    roomSubtitle: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.6)' },
    headerActions: { flexDirection: 'row', gap: SPACING.xs },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    headerBtnActive: { backgroundColor: '#6366F1' },
    unreadBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    unreadText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    countBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#6366F1', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    countBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Music Card
    musicCard: { marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: RADIUS.xl, overflow: 'hidden' },
    musicCardGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
    musicCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
    musicIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    musicIconText: { fontSize: 24 },
    musicInfo: { flex: 1 },
    musicTitle: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
    musicSubtitle: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.6)' },
    musicControls: { flexDirection: 'row', gap: SPACING.xs },
    musicControlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    musicPickerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },

    // Participants Section
    participantsSection: { marginTop: SPACING.xl, paddingHorizontal: SPACING.md },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
    sectionTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
    liveDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    liveText: { fontSize: TYPOGRAPHY.size.xs, color: '#10B981', fontWeight: TYPOGRAPHY.weight.bold },
    participantsScroll: { gap: SPACING.md },
    participantItem: { alignItems: 'center', marginRight: SPACING.md },
    participantAvatarWrap: { position: 'relative', marginBottom: SPACING.xs },
    participantAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 24, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    statusRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 35, borderWidth: 3, borderColor: 'transparent' },
    meBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#6366F1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
    meBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    participantName: { fontSize: TYPOGRAPHY.size.sm, color: '#FFF', fontWeight: TYPOGRAPHY.weight.medium, textAlign: 'center', width: 70 },
    participantTime: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.5)' },

    // Focus Card
    focusCard: { marginHorizontal: SPACING.md, marginTop: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden' },
    focusCardGradient: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
    focusInfo: { flex: 1 },
    focusTime: { fontSize: 40, fontWeight: TYPOGRAPHY.weight.bold, color: '#10B981' },
    focusLabel: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.6)' },
    focusBadge: { backgroundColor: 'rgba(16, 185, 129, 0.3)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
    focusBadgeText: { fontSize: TYPOGRAPHY.size.sm, color: '#10B981', fontWeight: TYPOGRAPHY.weight.medium },

    // Reaction Bar
    reactionBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginHorizontal: SPACING.md, marginTop: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden' },
    reactionLabel: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.5)', marginRight: SPACING.md },
    reactionBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.xs },
    reactionEmoji: { fontSize: 24 },

    // Chat Overlay
    chatOverlay: { position: 'absolute', bottom: 100, left: 0, right: 0, height: '45%' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalOverlayCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
    modalTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF', textAlign: 'center', marginBottom: SPACING.xs },
    modalSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: SPACING.lg },

    stationModal: { borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: SPACING.lg, paddingBottom: 40, maxHeight: '60%' },
    stationsList: { maxHeight: 300 },
    stationItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.xs, gap: SPACING.md },
    stationItemActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
    stationEmoji: { fontSize: 28 },
    stationName: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: '#FFF', fontWeight: TYPOGRAPHY.weight.medium },

    createModal: { borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: SPACING.lg, paddingBottom: 40, maxHeight: '85%' },
    inputLabel: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: 'rgba(255,255,255,0.7)', marginBottom: SPACING.xs, marginTop: SPACING.md },
    textInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: TYPOGRAPHY.size.base, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emojiRow: { flexDirection: 'row', marginBottom: SPACING.sm },
    emojiOption: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
    emojiSelected: { backgroundColor: 'rgba(99, 102, 241, 0.3)', borderWidth: 2, borderColor: '#6366F1' },
    emojiText: { fontSize: 28 },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    colorOption: { width: 44, height: 44, borderRadius: 22 },
    colorSelected: { borderWidth: 3, borderColor: '#FFF' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.lg },
    switchLabel: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.medium, color: '#FFF' },
    switchHint: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.5)' },
    createBtn: { backgroundColor: '#6366F1', borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
    createBtnText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    passwordModal: { borderRadius: RADIUS.xl, padding: SPACING.lg, width: SCREEN_WIDTH - SPACING.lg * 2 },
    passwordTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF', textAlign: 'center', marginBottom: SPACING.xs },
    passwordSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: SPACING.lg },
    passwordBtns: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
    passwordCancelBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    passwordCancelText: { fontSize: TYPOGRAPHY.size.base, color: 'rgba(255,255,255,0.7)' },
    passwordConfirmBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: '#6366F1', alignItems: 'center' },
    passwordConfirmText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Participants Modal
    participantsModal: { borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: SPACING.lg, paddingBottom: 40, maxHeight: '70%' },
    participantsModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
    participantsList: { maxHeight: 400 },
    participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg, marginBottom: SPACING.sm },
    participantRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
    participantRowAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    participantRowInitial: { fontSize: 18, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    participantRowInfo: { flex: 1 },
    participantRowNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap' },
    participantRowName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
    participantRowStatus: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    youTag: { backgroundColor: '#6366F1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    youTagText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    djTag: { backgroundColor: 'rgba(16, 185, 129, 0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    djTagText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#10B981' },
    participantRowActions: { flexDirection: 'row', gap: SPACING.xs },
    participantRowBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
});
