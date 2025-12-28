/**
 * Study Room Page
 * Real-time Study Sessions with Custom Room Creation
 * V2: Chat + Vibe Sync (Synchronized Radio)
 * V3: Floating Reactions + Unread Badge
 */

import { FloatingReactions } from '@/components/FloatingReactions';
import { StudyRoomChat } from '@/components/StudyRoomChat';
import { useStartConversation } from '@/hooks/useDMs';
import { useStudyRoomAudio } from '@/hooks/useStudyRoomAudio';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    joined_at: string; // For DJ determination
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
const ROOM_COLORS = ['#1F2937', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#6366F1'];

// ============================================
// MAIN COMPONENT
// ============================================

export default function StudyRoomScreen() {
    const { user } = useAuthContext();
    const { startOrGetConversation } = useStartConversation();
    const [startingDM, setStartingDM] = useState(false);

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

    // Keep ref in sync with state for Realtime callbacks
    useEffect(() => {
        showChatRef.current = showChat;
        if (showChat) {
            setUnreadMessages(0); // Reset unread when chat opens
        }
    }, [showChat]);

    // DJ Logic: owner OR first participant (by joined_at) can control music
    const isOwner = currentRoom?.created_by === user?.id;

    // Check if user is the DJ (first participant in rooms without owner)
    const isDJ = (() => {
        if (!currentRoom || !user?.id) return false;
        if (currentRoom.created_by) return currentRoom.created_by === user.id;
        // For rooms without owner, first participant is DJ
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
        isOwner: isDJ  // Pass isDJ instead of isOwner for music control
    });

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingRoom, setPendingRoom] = useState<StudyRoom | null>(null);
    const [passwordInput, setPasswordInput] = useState('');

    // Create room form
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomEmoji, setNewRoomEmoji] = useState('📚');
    const [newRoomColor, setNewRoomColor] = useState('#1F2937');
    const [newRoomMusic, setNewRoomMusic] = useState('');
    const [newRoomPrivate, setNewRoomPrivate] = useState(false);
    const [newRoomPassword, setNewRoomPassword] = useState('');
    const [creating, setCreating] = useState(false);

    // ============================================
    // FETCH ROOMS
    // ============================================

    const fetchRooms = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('study_rooms')
                .select(`
                    id, name, description, emoji, theme, max_participants,
                    music_url, background_color, is_custom, password, created_by,
                    study_room_participants(count)
                `)
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

    // ============================================
    // CHECK CURRENT ROOM
    // ============================================

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

    // ============================================
    // FETCH PARTICIPANTS
    // ============================================

    const fetchParticipants = async (roomId: string) => {
        try {
            const { data } = await supabase
                .from('study_room_participants')
                .select(`
                    id, user_id, focus_minutes, status, joined_at,
                    profiles(id, username, full_name, avatar_url, current_tier)
                `)
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
    // JOIN ROOM
    // ============================================

    const handleJoinRoom = async (room: StudyRoom) => {
        // Check if room has password
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
            const params = password
                ? { p_room_id: roomId, p_password: password }
                : { p_room_id: roomId };

            const { data, error } = await supabase.rpc(rpcName, params);

            if (error) throw error;

            if (data?.success) {
                setCurrentRoom(data.room);
                setFocusMinutes(0);
                setShowPasswordModal(false);
                setPendingRoom(null);
                await fetchParticipants(roomId);
                await fetchRooms();
            } else {
                Alert.alert('Erro', data?.error || 'Não foi possível entrar na sala');
            }
        } catch (err: any) {
            Alert.alert('Erro', err.message);
        }
    };

    // ============================================
    // LEAVE ROOM
    // ============================================

    const leaveRoom = async () => {
        try {
            // Stop audio and cleanup
            await stopAndCleanup();
            setShowChat(false);

            const { data, error } = await supabase.rpc('leave_study_room');

            if (error) throw error;

            if (data?.xp_earned > 0) {
                Alert.alert(
                    '🎉 Sessão Terminada!',
                    `Estudaste ${data.focus_minutes} minutos e ganhaste ${data.xp_earned} XP!`
                );
            }

            setCurrentRoom(null);
            setParticipants([]);
            setFocusMinutes(0);
            await fetchRooms();
        } catch (err: any) {
            Alert.alert('Erro', err.message);
        }
    };

    // ============================================
    // CREATE CUSTOM ROOM
    // ============================================

    const createRoom = async () => {
        if (!newRoomName.trim()) {
            Alert.alert('Erro', 'Dá um nome à tua sala');
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

                // Fetch room details
                const { data: roomData } = await supabase
                    .from('study_rooms')
                    .select('*')
                    .eq('id', data.room_id)
                    .single();

                if (roomData) {
                    setCurrentRoom(roomData);
                    await fetchParticipants(data.room_id);
                }
                await fetchRooms();
            } else {
                Alert.alert('Erro', data?.error || 'Não foi possível criar a sala');
            }
        } catch (err: any) {
            Alert.alert('Erro', err.message);
        } finally {
            setCreating(false);
        }
    };

    const resetCreateForm = () => {
        setNewRoomName('');
        setNewRoomEmoji('📚');
        setNewRoomColor('#1F2937');
        setNewRoomMusic('');
        setNewRoomPrivate(false);
        setNewRoomPassword('');
    };

    // ============================================
    // DELETE MY ROOM
    // ============================================

    const deleteMyRoom = async () => {
        Alert.alert(
            'Apagar Sala',
            'Tens a certeza que queres apagar a tua sala?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.rpc('delete_my_room');
                            if (error) throw error;
                            setCurrentRoom(null);
                            await fetchRooms();
                        } catch (err: any) {
                            Alert.alert('Erro', err.message);
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // SEND REACTION
    // ============================================

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
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'study_room_participants',
                    filter: `room_id=eq.${currentRoom.id}`,
                },
                () => fetchParticipants(currentRoom.id)
            )
            .subscribe();

        // Reactions Realtime - now with floating emojis!
        const reactionsChannel = supabase
            .channel(`room-${currentRoom.id}-reactions`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'study_room_reactions',
                    filter: `room_id=eq.${currentRoom.id}`,
                },
                (payload) => {
                    const reaction = payload.new as Reaction;
                    setReactions(prev => [...prev, reaction].slice(-10));

                    // Add floating emoji with random X position
                    const screenWidth = Dimensions.get('window').width;
                    const floatingId = `${reaction.id}-${Date.now()}`;
                    setFloatingEmojis(prev => [...prev, {
                        id: floatingId,
                        emoji: reaction.emoji,
                        x: Math.random() * (screenWidth - 60) + 30,
                    }]);

                    setTimeout(() => {
                        setReactions(prev => prev.filter(r => r.id !== reaction.id));
                    }, 3000);
                }
            )
            .subscribe();

        // Messages Realtime - for unread badge (only when chat is closed)
        const messagesChannel = supabase
            .channel(`room-${currentRoom.id}-messages`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'study_room_messages',
                    filter: `room_id=eq.${currentRoom.id}`,
                },
                (payload) => {
                    const msg = payload.new as { user_id: string };
                    // Only increment if chat is closed AND message is not from me
                    if (!showChatRef.current && msg.user_id !== user?.id) {
                        setUnreadMessages(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(participantsChannel);
            supabase.removeChannel(reactionsChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, [currentRoom?.id, user?.id]);

    // Presence heartbeat
    useEffect(() => {
        if (!currentRoom) return;

        const interval = setInterval(async () => {
            await supabase.rpc('update_study_presence', {
                p_status: 'focusing',
                p_add_minutes: 1,
            });
            setFocusMinutes(prev => prev + 1);
        }, 60000);

        return () => clearInterval(interval);
    }, [currentRoom]);

    // Initial load
    useEffect(() => {
        fetchRooms();
        checkCurrentRoom();
    }, []);

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

    // If in a room, show room view
    if (currentRoom) {
        const isMyRoom = currentRoom.created_by === user?.id;

        return (
            <SafeAreaView style={[styles.container, currentRoom.background_color ? { backgroundColor: currentRoom.background_color } : null]} edges={['top']}>
                {/* Room Header */}
                <View style={styles.roomHeader}>
                    <Pressable style={styles.leaveButton} onPress={leaveRoom}>
                        <Ionicons name="exit-outline" size={24} color={colors.accent.primary} />
                        <Text style={styles.leaveText}>Sair</Text>
                    </Pressable>

                    <View style={styles.roomInfo}>
                        <Text style={styles.roomEmoji}>{currentRoom.emoji}</Text>
                        <Text style={styles.roomName}>{currentRoom.name}</Text>
                    </View>

                    <View style={styles.roomHeaderRight}>
                        {/* Participants Button */}
                        <Pressable
                            style={styles.musicButton}
                            onPress={() => setShowParticipantsDrawer(true)}
                        >
                            <Ionicons name="people-outline" size={20} color={colors.accent.primary} />
                            <View style={styles.participantCountBadge}>
                                <Text style={styles.participantCountText}>{participants.length}</Text>
                            </View>
                        </Pressable>

                        {/* Chat Toggle with Unread Badge */}
                        <Pressable
                            style={[
                                styles.musicButton,
                                showChat && { backgroundColor: colors.accent.primary }
                            ]}
                            onPress={() => {
                                setShowChat(!showChat);
                                if (!showChat) setUnreadMessages(0); // Reset on open
                            }}
                        >
                            <Ionicons
                                name={showChat ? "chatbubbles" : "chatbubbles-outline"}
                                size={20}
                                color={showChat ? "#FFF" : colors.accent.primary}
                            />
                            {unreadMessages > 0 && !showChat && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadBadgeText}>
                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                    </Text>
                                </View>
                            )}
                        </Pressable>

                        {/* DJ: Music Picker / Listener: Now Playing */}
                        {isOwner ? (
                            <Pressable
                                style={[
                                    styles.musicButton,
                                    isRoomPlaying && { backgroundColor: colors.success.primary }
                                ]}
                                onPress={() => setShowStationPicker(true)}
                            >
                                <Ionicons
                                    name="radio"
                                    size={20}
                                    color={isRoomPlaying ? "#FFF" : colors.accent.primary}
                                />
                            </Pressable>
                        ) : (
                            currentTrackName !== 'Nenhuma' && (
                                <View style={styles.nowPlayingBadge}>
                                    <Text style={styles.nowPlayingText}>🎵 {currentTrackName}</Text>
                                </View>
                            )
                        )}

                        <View style={styles.focusTimer}>
                            <Ionicons name="time-outline" size={16} color={colors.success.primary} />
                            <Text style={styles.focusTime}>{focusMinutes}m</Text>
                        </View>
                    </View>
                </View>

                {/* Owner Actions */}
                {isMyRoom && (
                    <View style={styles.ownerBar}>
                        <Text style={styles.ownerText}>🏠 A tua sala</Text>
                        <Pressable style={styles.deleteButton} onPress={deleteMyRoom}>
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            <Text style={styles.deleteText}>Apagar</Text>
                        </Pressable>
                    </View>
                )}

                {/* 🎵 MUSIC CONTROL BANNER */}
                <View style={styles.musicBanner}>
                    <View style={styles.musicBannerLeft}>
                        <Text style={styles.musicBannerEmoji}>
                            {isRoomPlaying ? '🎵' : '🔇'}
                        </Text>
                        <View>
                            <Text style={styles.musicBannerTitle}>
                                {currentTrackName === 'Nenhuma' ? 'Sem música' : currentTrackName}
                            </Text>
                            <Text style={styles.musicBannerSubtitle}>
                                {isDJ ? '🎧 Tu és o DJ' : 'O DJ controla a música'}
                            </Text>
                        </View>
                    </View>

                    {/* Music Controls - Only for DJ */}
                    {isDJ ? (
                        <View style={styles.musicBannerControls}>
                            {currentTrackName !== 'Nenhuma' && (
                                <Pressable
                                    style={styles.musicControlBtn}
                                    onPress={toggleRoomMusic}
                                >
                                    <Ionicons
                                        name={isRoomPlaying ? "pause" : "play"}
                                        size={20}
                                        color="#FFF"
                                    />
                                </Pressable>
                            )}
                            <Pressable
                                style={styles.musicPickerBtn}
                                onPress={() => setShowStationPicker(true)}
                            >
                                <Ionicons name="radio" size={20} color="#FFF" />
                                <Text style={styles.musicPickerBtnText}>Mudar</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.djBadge}>
                            <Ionicons name="headset" size={16} color={colors.text.tertiary} />
                        </View>
                    )}
                </View>

                {/* Floating Reactions - Animated */}
                <FloatingReactions
                    reactions={floatingEmojis}
                    onAnimationComplete={(id: string) => {
                        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
                    }}
                />

                {/* Participants Grid */}
                <ScrollView style={styles.participantsScroll}>
                    <Text style={styles.sectionTitle}>
                        👥 {participants.length} Estudantes Online
                    </Text>

                    <View style={styles.participantsGrid}>
                        {participants.map((p) => (
                            <Pressable
                                key={p.id}
                                style={styles.participantCard}
                                onPress={() => {
                                    if (p.user_id !== user?.id) {
                                        sendReaction('👋', p.user_id);
                                    }
                                }}
                            >
                                {p.profile?.avatar_url ? (
                                    <Image
                                        source={{ uri: p.profile.avatar_url }}
                                        style={styles.participantAvatar}
                                    />
                                ) : (
                                    <View style={styles.participantAvatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>
                                            {(p.profile?.username || 'U')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <Text style={styles.participantName} numberOfLines={1}>
                                    {p.profile?.username || 'User'}
                                </Text>
                                <View style={styles.participantStatus}>
                                    <View style={[
                                        styles.statusDot,
                                        { backgroundColor: p.status === 'focusing' ? colors.success.primary : colors.warning.primary }
                                    ]} />
                                    <Text style={styles.participantTime}>{p.focus_minutes}m</Text>
                                </View>
                                {p.user_id === user?.id && (
                                    <View style={styles.youBadge}>
                                        <Text style={styles.youText}>Tu</Text>
                                    </View>
                                )}
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>

                {/* Reaction Bar */}
                <View style={styles.reactionBar}>
                    <Text style={styles.reactionLabel}>Enviar incentivo:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {REACTION_EMOJIS.map((emoji) => (
                            <Pressable
                                key={emoji}
                                style={styles.reactionButton}
                                onPress={() => sendReaction(emoji)}
                            >
                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Now Playing Bar (for DJ) */}
                {isOwner && currentTrackName !== 'Nenhuma' && (
                    <View style={styles.nowPlayingBar}>
                        <Text style={styles.nowPlayingBarText}>
                            {isRoomPlaying ? '🎵' : '⏸️'} {currentTrackName}
                        </Text>
                        <Pressable onPress={toggleRoomMusic} style={styles.nowPlayingControl}>
                            <Ionicons
                                name={isRoomPlaying ? "pause" : "play"}
                                size={18}
                                color="#FFF"
                            />
                        </Pressable>
                    </View>
                )}

                {/* Chat Overlay */}
                {showChat && (
                    <View style={styles.chatOverlay}>
                        <StudyRoomChat
                            roomId={currentRoom.id}
                            onNewMessage={() => {
                                if (!showChat) {
                                    setUnreadMessages(prev => prev + 1);
                                }
                            }}
                        />
                    </View>
                )}

                {/* Station Picker Modal (DJ Only) */}
                <Modal
                    visible={showStationPicker}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowStationPicker(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.stationPickerModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>🎵 Escolher Vibe</Text>
                                <Pressable onPress={() => setShowStationPicker(false)}>
                                    <Ionicons name="close" size={24} color={colors.text.primary} />
                                </Pressable>
                            </View>
                            <Text style={styles.stationPickerSubtitle}>
                                Todos na sala vão ouvir a mesma música
                            </Text>
                            <ScrollView style={styles.stationsList}>
                                {vibeStations.map((station) => (
                                    <Pressable
                                        key={station.id}
                                        style={[
                                            styles.stationItem,
                                            currentTrackName === station.name && styles.stationItemActive
                                        ]}
                                        onPress={async () => {
                                            await changeStation(station);
                                            setShowStationPicker(false);
                                        }}
                                    >
                                        <Text style={styles.stationEmoji}>{station.emoji}</Text>
                                        <Text style={styles.stationName}>{station.name}</Text>
                                        {currentTrackName === station.name && (
                                            <Ionicons name="checkmark-circle" size={20} color={colors.success.primary} />
                                        )}
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Participants Drawer */}
                <Modal
                    visible={showParticipantsDrawer}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowParticipantsDrawer(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.participantsDrawer}>
                            <View style={styles.participantsDrawerHeader}>
                                <Text style={styles.participantsDrawerTitle}>
                                    👥 Participantes ({participants.length})
                                </Text>
                                <Pressable onPress={() => setShowParticipantsDrawer(false)}>
                                    <Ionicons name="close" size={24} color={colors.text.primary} />
                                </Pressable>
                            </View>

                            <ScrollView>
                                {participants.map((p, index) => {
                                    const isParticipantDJ = index === 0 && !currentRoom.created_by;
                                    const isOwnerDJ = p.user_id === currentRoom.created_by;
                                    const showDJBadge = isParticipantDJ || isOwnerDJ;

                                    return (
                                        <View key={p.id} style={styles.participantItem}>
                                            <View style={styles.participantItemAvatar}>
                                                <Text style={styles.participantItemAvatarText}>
                                                    {p.profile?.full_name?.[0] || p.profile?.username?.[0] || '?'}
                                                </Text>
                                            </View>
                                            <View style={styles.participantItemInfo}>
                                                <Text style={styles.participantItemName}>
                                                    {p.profile?.full_name || p.profile?.username}
                                                    {p.user_id === user?.id ? ' (Tu)' : ''}
                                                </Text>
                                                <Text style={styles.participantItemStatus}>
                                                    ⏱️ {p.focus_minutes}m de foco
                                                </Text>
                                                {showDJBadge && (
                                                    <Text style={styles.participantItemDJ}>🎧 DJ</Text>
                                                )}
                                            </View>
                                            {p.user_id !== user?.id && (
                                                <View style={styles.participantItemActions}>
                                                    <Pressable
                                                        style={styles.participantAction}
                                                        onPress={() => {
                                                            setShowParticipantsDrawer(false);
                                                            router.push(`/public-profile/${p.user_id}` as any);
                                                        }}
                                                    >
                                                        <Ionicons name="person-outline" size={18} color={colors.text.secondary} />
                                                    </Pressable>
                                                    <Pressable
                                                        style={[styles.participantAction, startingDM && { opacity: 0.5 }]}
                                                        disabled={startingDM}
                                                        onPress={async () => {
                                                            setStartingDM(true);
                                                            try {
                                                                const conversationId = await startOrGetConversation(p.user_id);
                                                                if (conversationId) {
                                                                    setShowParticipantsDrawer(false);
                                                                    router.push(`/dm/${conversationId}` as any);
                                                                }
                                                            } catch (err) {
                                                                console.error('Error starting DM:', err);
                                                            } finally {
                                                                setStartingDM(false);
                                                            }
                                                        }}
                                                    >
                                                        {startingDM ? (
                                                            <ActivityIndicator size="small" color={colors.text.secondary} />
                                                        ) : (
                                                            <Ionicons name="chatbubble-outline" size={18} color={colors.text.secondary} />
                                                        )}
                                                    </Pressable>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    }

    // Room Selection View
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                    </Pressable>
                    <View>
                        <Text style={styles.headerTitle}>🎧 Study Rooms</Text>
                        <Text style={styles.headerSubtitle}>Estuda com os teus colegas</Text>
                    </View>
                </View>

                {/* Info Banner */}
                <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.infoBanner}
                >
                    <Ionicons name="people" size={24} color="#FFF" />
                    <View style={styles.infoBannerText}>
                        <Text style={styles.infoBannerTitle}>Estudo em Grupo</Text>
                        <Text style={styles.infoBannerSubtitle}>
                            Entra numa sala ou cria a tua própria!
                        </Text>
                    </View>
                </LinearGradient>

                {/* Rooms List */}
                <Text style={styles.sectionTitle}>Salas Disponíveis</Text>

                {rooms.map((room) => (
                    <Pressable
                        key={room.id}
                        style={[
                            styles.roomCard,
                            room.is_custom && styles.customRoomCard,
                            room.background_color && { borderLeftColor: room.background_color, borderLeftWidth: 4 }
                        ]}
                        onPress={() => handleJoinRoom(room)}
                    >
                        <Text style={styles.roomCardEmoji}>{room.emoji}</Text>
                        <View style={styles.roomCardInfo}>
                            <View style={styles.roomCardNameRow}>
                                <Text style={styles.roomCardName}>{room.name}</Text>
                                {room.password && (
                                    <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} />
                                )}
                                {room.music_url && (
                                    <Ionicons name="musical-notes" size={14} color={colors.accent.primary} />
                                )}
                            </View>
                            <Text style={styles.roomCardDescription}>
                                {room.is_custom ? 'Sala Personalizada' : (room.description || 'Sala de estudo')}
                            </Text>
                        </View>
                        <View style={styles.roomCardMeta}>
                            <Ionicons name="people-outline" size={16} color={colors.text.tertiary} />
                            <Text style={styles.roomCardCount}>
                                {room.participant_count}/{room.max_participants}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                    </Pressable>
                ))}
            </ScrollView>

            {/* FAB - Create Room */}
            <Pressable style={styles.fab} onPress={() => setShowCreateModal(true)}>
                <LinearGradient
                    colors={['#7C3AED', '#5B21B6']}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </LinearGradient>
            </Pressable>

            {/* Create Room Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCreateModal(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Criar Sala</Text>
                                <Pressable onPress={() => setShowCreateModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text.primary} />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Room Name */}
                                <Text style={styles.inputLabel}>Nome da Sala</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Ex: Estudo de Matemática"
                                    placeholderTextColor={colors.text.tertiary}
                                    value={newRoomName}
                                    onChangeText={setNewRoomName}
                                    maxLength={30}
                                />

                                {/* Emoji Selector */}
                                <Text style={styles.inputLabel}>Emoji</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
                                    {ROOM_EMOJIS.map((emoji) => (
                                        <Pressable
                                            key={emoji}
                                            style={[
                                                styles.emojiOption,
                                                newRoomEmoji === emoji && styles.emojiSelected
                                            ]}
                                            onPress={() => setNewRoomEmoji(emoji)}
                                        >
                                            <Text style={styles.emojiText}>{emoji}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                {/* Color Selector */}
                                <Text style={styles.inputLabel}>Cor do Tema</Text>
                                <View style={styles.colorRow}>
                                    {ROOM_COLORS.map((color) => (
                                        <Pressable
                                            key={color}
                                            style={[
                                                styles.colorOption,
                                                { backgroundColor: color },
                                                newRoomColor === color && styles.colorSelected
                                            ]}
                                            onPress={() => setNewRoomColor(color)}
                                        />
                                    ))}
                                </View>

                                {/* Music URL */}
                                <Text style={styles.inputLabel}>Link da Música (Opcional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="https://spotify.com/... ou youtube.com/..."
                                    placeholderTextColor={colors.text.tertiary}
                                    value={newRoomMusic}
                                    onChangeText={setNewRoomMusic}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                />

                                {/* Private Switch */}
                                <View style={styles.switchRow}>
                                    <View>
                                        <Text style={styles.switchLabel}>🔒 Sala Privada</Text>
                                        <Text style={styles.switchHint}>Requer password para entrar</Text>
                                    </View>
                                    <Switch
                                        value={newRoomPrivate}
                                        onValueChange={setNewRoomPrivate}
                                        trackColor={{ true: colors.accent.primary }}
                                    />
                                </View>

                                {/* Password Input */}
                                {newRoomPrivate && (
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Define uma password"
                                        placeholderTextColor={colors.text.tertiary}
                                        value={newRoomPassword}
                                        onChangeText={setNewRoomPassword}
                                        secureTextEntry
                                    />
                                )}

                                {/* Create Button */}
                                <Pressable
                                    style={[styles.createButton, creating && styles.createButtonDisabled]}
                                    onPress={createRoom}
                                    disabled={creating}
                                >
                                    {creating ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.createButtonText}>Criar e Entrar</Text>
                                    )}
                                </Pressable>
                            </ScrollView>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Password Modal */}
            <Modal
                visible={showPasswordModal}
                animationType="fade"
                transparent
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.passwordModal}>
                            <Text style={styles.passwordTitle}>🔒 Sala Privada</Text>
                            <Text style={styles.passwordSubtitle}>
                                Introduz a password para entrar em "{pendingRoom?.name}"
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Password"
                                placeholderTextColor={colors.text.tertiary}
                                value={passwordInput}
                                onChangeText={setPasswordInput}
                                secureTextEntry
                                autoFocus
                            />
                            <View style={styles.passwordButtons}>
                                <Pressable
                                    style={styles.passwordCancel}
                                    onPress={() => {
                                        setShowPasswordModal(false);
                                        setPendingRoom(null);
                                    }}
                                >
                                    <Text style={styles.passwordCancelText}>Cancelar</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.passwordConfirm}
                                    onPress={() => pendingRoom && joinRoom(pendingRoom.id, passwordInput)}
                                >
                                    <Text style={styles.passwordConfirmText}>Entrar</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Info Banner
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        marginBottom: spacing.lg,
    },
    infoBannerText: {
        flex: 1,
    },
    infoBannerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    infoBannerSubtitle: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.9)',
    },

    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Room Card
    roomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        gap: spacing.md,
        ...shadows.sm,
    },
    customRoomCard: {
        borderWidth: 1,
        borderColor: colors.accent.primary + '40',
    },
    roomCardEmoji: {
        fontSize: 32,
    },
    roomCardInfo: {
        flex: 1,
    },
    roomCardNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    roomCardName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    roomCardDescription: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    roomCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    roomCardCount: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        ...shadows.lg,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Room View
    roomHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    roomHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    leaveText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },
    roomInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    roomEmoji: {
        fontSize: 24,
    },
    roomName: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    musicButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    focusTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.success.light,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    focusTime: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.success.primary,
    },

    // Owner Bar
    ownerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.accent.primary + '15',
    },
    ownerText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    deleteText: {
        fontSize: typography.size.sm,
        color: '#EF4444',
        fontWeight: typography.weight.medium,
    },

    // Floating Reactions
    floatingReactions: {
        position: 'absolute',
        top: 120,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        zIndex: 100,
    },
    floatingEmoji: {
        fontSize: 40,
    },

    // Participants
    participantsScroll: {
        flex: 1,
        padding: spacing.lg,
    },
    participantsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    participantCard: {
        width: '30%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.sm,
    },
    participantAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: spacing.xs,
    },
    participantAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    avatarInitial: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    participantName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        textAlign: 'center',
    },
    participantStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    participantTime: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    youBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.accent.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    youText: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },

    // Reaction Bar
    reactionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.surface,
    },
    reactionLabel: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginRight: spacing.md,
    },
    reactionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    reactionEmoji: {
        fontSize: 24,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },

    // Form
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    textInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    selectorRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    emojiOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    emojiSelected: {
        backgroundColor: colors.accent.light,
        borderWidth: 2,
        borderColor: colors.accent.primary,
    },
    emojiText: {
        fontSize: 24,
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    colorSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    switchLabel: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    switchHint: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    createButton: {
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },

    // Password Modal
    passwordModal: {
        backgroundColor: colors.background,
        margin: spacing.lg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    passwordTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    passwordSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    passwordButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    passwordCancel: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    passwordCancelText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    passwordConfirm: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
    },
    passwordConfirmText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },

    // V2: Chat & Vibe Sync Styles
    nowPlayingBadge: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        maxWidth: 120,
    },
    nowPlayingText: {
        fontSize: typography.size.xs,
        color: '#FFF',
    },
    nowPlayingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    nowPlayingBarText: {
        fontSize: typography.size.sm,
        color: '#FFF',
        fontWeight: typography.weight.medium,
    },
    nowPlayingControl: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatOverlay: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        height: '50%',
    },
    stationPickerModal: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        padding: spacing.lg,
        paddingBottom: 40,
        maxHeight: '60%',
    },
    stationPickerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginBottom: spacing.lg,
    },
    stationsList: {
        maxHeight: 300,
    },
    stationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xs,
        gap: spacing.md,
    },
    stationItemActive: {
        backgroundColor: colors.accent.light,
    },
    stationEmoji: {
        fontSize: 28,
    },
    stationName: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },

    // Music Control Banner
    musicBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.6)',
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        padding: spacing.md,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    musicBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    musicBannerEmoji: {
        fontSize: 32,
    },
    musicBannerTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    musicBannerSubtitle: {
        fontSize: typography.size.xs,
        color: 'rgba(255,255,255,0.6)',
    },
    musicBannerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    musicControlBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    musicPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    musicPickerBtnText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    djBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // V3: UX Enhancement Styles
    participantCountBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: colors.accent.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    participantCountText: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    participantsDrawer: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        padding: spacing.lg,
        maxHeight: '70%',
    },
    participantsDrawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    participantsDrawerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xs,
        backgroundColor: colors.surface,
    },
    participantItemAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    participantItemAvatarText: {
        fontSize: 20,
        color: '#FFF',
    },
    participantItemInfo: {
        flex: 1,
    },
    participantItemName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    participantItemStatus: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    participantItemDJ: {
        fontSize: typography.size.xs,
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },
    participantItemActions: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    participantAction: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
