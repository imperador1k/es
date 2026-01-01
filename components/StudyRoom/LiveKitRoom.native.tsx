/**
 * LiveKit Room Component - NATIVE (iOS/Android)
 * Brutal/Glassmorphism Design - Custom UI for audio/video calls
 * 
 * This file is used for React Native (iOS/Android) only.
 * For web, see LiveKitRoom.web.tsx
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { AudioSession, VideoView } from '@livekit/react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ConnectionState,
    Room,
    RoomEvent,
    Track
} from 'livekit-client';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// DEBUG LOGGING
// ============================================

const DEBUG = true;
const log = (...args: any[]) => {
    if (DEBUG) {
        console.log('[LiveKit Native]', ...args);
    }
};

// ============================================
// TYPES
// ============================================

interface LiveKitRoomProps {
    token: string;
    serverUrl: string;
    roomName: string;
    onLeave: () => void;
    onError?: (error: Error) => void;
}

interface ParticipantData {
    identity: string;
    name: string;
    avatarUrl?: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isCameraOff: boolean;
    videoTrack?: Track;
    isLocal: boolean;
}

// ============================================
// SPEAKING INDICATOR (Animated Glow)
// ============================================

function SpeakingGlow({ isSpeaking }: { isSpeaking: boolean }) {
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isSpeaking) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
                    Animated.timing(glowAnim, { toValue: 0.4, duration: 400, useNativeDriver: false }),
                ])
            ).start();
        } else {
            glowAnim.stopAnimation();
            glowAnim.setValue(0);
        }
    }, [isSpeaking]);

    const borderColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', '#10B981'],
    });

    const shadowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.8],
    });

    if (!isSpeaking) return null;

    return (
        <Animated.View
            style={[
                styles.speakingGlow,
                {
                    borderColor,
                    shadowColor: '#10B981',
                    shadowOpacity,
                },
            ]}
            pointerEvents="none"
        />
    );
}

// ============================================
// PARTICIPANT TILE
// ============================================

function ParticipantTile({ participant }: { participant: ParticipantData }) {
    const { name, avatarUrl, isSpeaking, isMuted, isCameraOff, videoTrack, isLocal } = participant;

    return (
        <View style={styles.tile}>
            {/* Video or Avatar */}
            {videoTrack && !isCameraOff ? (
                <VideoView
                    style={styles.videoView}
                    videoTrack={videoTrack as any}
                    objectFit="cover"
                    mirror={isLocal}
                />
            ) : (
                <View style={styles.avatarContainer}>
                    <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        style={styles.avatarGradient}
                    >
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarInitial}>
                                {(name || '?').charAt(0).toUpperCase()}
                            </Text>
                        )}
                    </LinearGradient>
                </View>
            )}

            {/* Speaking Glow */}
            <SpeakingGlow isSpeaking={isSpeaking} />

            {/* Name Badge */}
            <View style={styles.nameBadge}>
                <BlurView intensity={30} tint="dark" style={styles.nameBadgeBlur}>
                    {isMuted && (
                        <Ionicons name="mic-off" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                    )}
                    <Text style={styles.nameText} numberOfLines={1}>
                        {isLocal ? `${name} (Tu)` : name}
                    </Text>
                </BlurView>
            </View>
        </View>
    );
}

// ============================================
// CONTROL BUTTON
// ============================================

function ControlButton({
    icon,
    iconOff,
    active,
    onPress,
    danger,
}: {
    icon: string;
    iconOff?: string;
    active: boolean;
    onPress: () => void;
    danger?: boolean;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    const iconName = active ? icon : (iconOff || icon);
    const iconColor = danger ? '#FFF' : active ? '#FFF' : '#EF4444';
    const bgColor = danger ? '#EF4444' : active ? COLORS.surfaceElevated : 'rgba(239, 68, 68, 0.2)';

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.controlButton, { backgroundColor: bgColor, transform: [{ scale }] }]}>
                <Ionicons name={iconName as any} size={24} color={iconColor} />
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveKitRoom({ token, serverUrl, roomName, onLeave, onError }: LiveKitRoomProps) {
    const [room] = useState(() => new Room());
    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
    const [participants, setParticipants] = useState<ParticipantData[]>([]);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [isSpeakerMode, setIsSpeakerMode] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Debug: Log mount
    useEffect(() => {
        log('🚀 Mounting LiveKitRoom component...');
        log('📍 Platform:', Platform.OS);
        log('🎫 Token length:', token?.length || 0);
        log('🌐 Server URL:', serverUrl);
        log('🏠 Room Name:', roomName);

        if (!token) {
            log('❌ ERROR: Token is empty or null!');
            setErrorMessage('Token vazio');
        }
        if (!serverUrl) {
            log('❌ ERROR: Server URL is empty or null!');
            setErrorMessage('URL do servidor vazio');
        }

        return () => {
            log('🔌 Unmounting LiveKitRoom component...');
        };
    }, []);

    // Setup audio session
    useEffect(() => {
        const setupAudio = async () => {
            log('🔊 Setting up audio session...');
            try {
                await AudioSession.configureAudio({
                    android: {
                        preferredOutputList: ['speaker'],
                    },
                    ios: {
                        defaultOutput: 'speaker',
                    },
                } as any);
                await AudioSession.startAudioSession();
                log('✅ Audio session started');
            } catch (error) {
                log('❌ Audio session error:', error);
            }
        };
        setupAudio();

        return () => {
            log('🔇 Stopping audio session...');
            AudioSession.stopAudioSession();
        };
    }, []);

    // Connect to room
    useEffect(() => {
        if (!token || !serverUrl) {
            log('⚠️ Skipping connection - missing token or serverUrl');
            return;
        }

        const connect = async () => {
            log('🔗 Starting connection...');
            log('📡 Connecting to:', serverUrl);

            try {
                setConnectionState(ConnectionState.Connecting);
                log('📶 Connection state: Connecting');

                await room.connect(serverUrl, token, {
                    autoSubscribe: true,
                });

                log('✅ Connected to room!');
                log('👤 Local participant:', room.localParticipant.identity);

                // Enable mic and camera
                log('🎤 Enabling microphone...');
                await room.localParticipant.setMicrophoneEnabled(true);
                log('📹 Enabling camera...');
                await room.localParticipant.setCameraEnabled(true);

                setConnectionState(ConnectionState.Connected);
                log('📶 Connection state: Connected');
            } catch (error: any) {
                log('❌ Connection failed!');
                log('❌ Error message:', error?.message);
                log('❌ Error details:', JSON.stringify(error, null, 2));
                setConnectionState(ConnectionState.Disconnected);
                setErrorMessage(error?.message || 'Erro de conexão');
                onError?.(error as Error);
            }
        };

        connect();

        return () => {
            log('🔌 Disconnecting from room...');
            room.disconnect();
        };
    }, [token, serverUrl]);

    // Listen to room events
    useEffect(() => {
        const updateParticipants = () => {
            const allParticipants: ParticipantData[] = [];

            // Add local participant
            const local = room.localParticipant;
            if (local) {
                const metadata = local.metadata ? JSON.parse(local.metadata) : {};
                allParticipants.push({
                    identity: local.identity,
                    name: local.name || local.identity,
                    avatarUrl: metadata.avatar_url,
                    isSpeaking: local.isSpeaking,
                    isMuted: !local.isMicrophoneEnabled,
                    isCameraOff: !local.isCameraEnabled,
                    videoTrack: local.getTrackPublication(Track.Source.Camera)?.track || undefined,
                    isLocal: true,
                });
            }

            // Add remote participants
            room.remoteParticipants.forEach((participant) => {
                const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
                allParticipants.push({
                    identity: participant.identity,
                    name: participant.name || participant.identity,
                    avatarUrl: metadata.avatar_url,
                    isSpeaking: participant.isSpeaking,
                    isMuted: !participant.isMicrophoneEnabled,
                    isCameraOff: !participant.isCameraEnabled,
                    videoTrack: participant.getTrackPublication(Track.Source.Camera)?.track || undefined,
                    isLocal: false,
                });
            });

            log('👥 Participants updated:', allParticipants.length);
            setParticipants(allParticipants);
        };

        // Room event listeners with logging
        const onConnected = () => {
            log('🎉 Room Event: Connected');
            setConnectionState(ConnectionState.Connected);
            updateParticipants();
        };

        const onDisconnected = (reason?: any) => {
            log('🔌 Room Event: Disconnected', reason);
            setConnectionState(ConnectionState.Disconnected);
        };

        const onReconnecting = () => {
            log('🔄 Room Event: Reconnecting...');
            setConnectionState(ConnectionState.Reconnecting);
        };

        const onReconnected = () => {
            log('✅ Room Event: Reconnected');
            setConnectionState(ConnectionState.Connected);
        };

        const onConnectionStateChanged = (state: ConnectionState) => {
            log('📶 Room State Changed:', state);
            setConnectionState(state);
        };

        room.on(RoomEvent.Connected, onConnected);
        room.on(RoomEvent.Disconnected, onDisconnected);
        room.on(RoomEvent.Reconnecting, onReconnecting);
        room.on(RoomEvent.Reconnected, onReconnected);
        room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
        room.on(RoomEvent.ParticipantConnected, updateParticipants);
        room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
        room.on(RoomEvent.TrackPublished, updateParticipants);
        room.on(RoomEvent.TrackUnpublished, updateParticipants);
        room.on(RoomEvent.TrackMuted, updateParticipants);
        room.on(RoomEvent.TrackUnmuted, updateParticipants);
        room.on(RoomEvent.ActiveSpeakersChanged, updateParticipants);

        // Initial update
        updateParticipants();

        return () => {
            log('🧹 Removing room event listeners...');
            room.removeAllListeners();
        };
    }, [room]);

    // Toggle functions
    const toggleMic = async () => {
        const newState = !isMicEnabled;
        log('🎤 Toggle mic:', newState);
        await room.localParticipant.setMicrophoneEnabled(newState);
        setIsMicEnabled(newState);
    };

    const toggleCamera = async () => {
        const newState = !isCameraEnabled;
        log('📹 Toggle camera:', newState);
        await room.localParticipant.setCameraEnabled(newState);
        setIsCameraEnabled(newState);
    };

    const toggleSpeaker = async () => {
        const newMode = !isSpeakerMode;
        log('🔊 Toggle speaker:', newMode);
        await AudioSession.configureAudio({
            android: {
                preferredOutputList: [newMode ? 'speaker' : 'earpiece'],
            },
            ios: {
                defaultOutput: newMode ? 'speaker' : 'earpiece',
            },
        } as any);
        setIsSpeakerMode(newMode);
    };

    const handleLeave = () => {
        log('👋 Leaving room...');
        room.disconnect();
        onLeave();
    };

    // Calculate grid layout
    const numParticipants = participants.length;
    const numCols = numParticipants <= 2 ? 1 : 2;
    const tileWidth = numCols === 1 ? SCREEN_WIDTH - 32 : (SCREEN_WIDTH - 48) / 2;
    const tileHeight = numParticipants <= 2 ? (SCREEN_HEIGHT - 240) / Math.max(numParticipants, 1) : (SCREEN_HEIGHT - 300) / Math.ceil(numParticipants / 2);

    // Error state
    if (errorMessage) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="warning-outline" size={48} color="#EF4444" />
                <Text style={[styles.loadingText, { color: '#EF4444' }]}>Erro: {errorMessage}</Text>
                <Pressable style={styles.retryButton} onPress={onLeave}>
                    <Text style={styles.retryText}>Voltar</Text>
                </Pressable>
            </View>
        );
    }

    // Connecting state
    if (connectionState === ConnectionState.Connecting) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>A conectar à sala...</Text>
                <Text style={styles.debugText}>{serverUrl?.substring(0, 30)}...</Text>
            </View>
        );
    }

    // Disconnected state
    if (connectionState === ConnectionState.Disconnected && participants.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="wifi-outline" size={48} color={COLORS.text.tertiary} />
                <Text style={styles.loadingText}>Desconectado</Text>
                <Pressable style={styles.retryButton} onPress={onLeave}>
                    <Text style={styles.retryText}>Voltar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Room Name Header */}
            <View style={styles.header}>
                <View style={styles.roomInfo}>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveIndicator} />
                        <Text style={styles.liveText}>AO VIVO</Text>
                    </View>
                    <Text style={styles.roomName}>{roomName}</Text>
                    <Text style={styles.participantCount}>{participants.length} participantes</Text>
                </View>
            </View>

            {/* Participants Grid */}
            <View style={styles.grid}>
                {participants.map((participant) => (
                    <View key={participant.identity} style={[styles.tileWrapper, { width: tileWidth, height: tileHeight }]}>
                        <ParticipantTile participant={participant} />
                    </View>
                ))}
            </View>

            {/* Floating Controls */}
            <View style={styles.controlsWrapper}>
                <BlurView intensity={60} tint="dark" style={styles.controlsBlur}>
                    <View style={styles.controlsRow}>
                        <ControlButton
                            icon="mic"
                            iconOff="mic-off"
                            active={isMicEnabled}
                            onPress={toggleMic}
                        />
                        <ControlButton
                            icon="videocam"
                            iconOff="videocam-off"
                            active={isCameraEnabled}
                            onPress={toggleCamera}
                        />
                        <ControlButton
                            icon="volume-high"
                            iconOff="volume-mute"
                            active={isSpeakerMode}
                            onPress={toggleSpeaker}
                        />
                        <ControlButton
                            icon="call"
                            active={true}
                            onPress={handleLeave}
                            danger
                        />
                    </View>
                </BlurView>
            </View>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    debugText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },
    retryButton: {
        marginTop: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.lg,
    },
    retryText: {
        color: COLORS.text.primary,
        fontWeight: 'bold' as const,
    },

    // Header
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    roomInfo: {
        alignItems: 'center',
        gap: 4,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        gap: 6,
    },
    liveIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
    liveText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#EF4444',
        letterSpacing: 1,
    },
    roomName: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginTop: 4,
    },
    participantCount: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // Grid
    grid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    tileWrapper: {
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
    },

    // Tile
    tile: {
        flex: 1,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        position: 'relative',
    },
    videoView: {
        flex: 1,
        borderRadius: RADIUS['2xl'],
    },
    avatarContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 92,
        height: 92,
        borderRadius: 46,
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // Speaking Glow
    speakingGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: RADIUS['2xl'],
        borderWidth: 3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
    },

    // Name Badge
    nameBadge: {
        position: 'absolute',
        bottom: SPACING.sm,
        left: SPACING.sm,
        right: SPACING.sm,
    },
    nameBadgeBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
    },
    nameText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },

    // Controls
    controlsWrapper: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    controlsBlur: {
        borderRadius: RADIUS['3xl'],
        overflow: 'hidden',
        backgroundColor: 'rgba(20, 22, 28, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
    },
});

export default LiveKitRoom;
