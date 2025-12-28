/**
 * useAudioPlayer Hook
 * Global audio player for Study Rooms with lofi streams
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================
// RADIO STATIONS (Free lofi streams)
// ============================================

export interface RadioStation {
    id: string;
    name: string;
    emoji: string;
    streamUrl: string;
    description: string;
}

export const RADIO_STATIONS: RadioStation[] = [
    {
        id: 'lofi-girl',
        name: 'Lofi Beats',
        emoji: '🎧',
        streamUrl: 'https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/',
        description: 'Relaxing beats to study',
    },
    {
        id: 'chillhop',
        name: 'Chillhop',
        emoji: '☕',
        streamUrl: 'https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/',
        description: 'Chill instrumental hip-hop',
    },
    {
        id: 'jazz',
        name: 'Jazz Study',
        emoji: '🎷',
        streamUrl: 'https://streaming.radio.co/s774887f7b/listen',
        description: 'Smooth jazz for focus',
    },
    {
        id: 'nature',
        name: 'Nature Sounds',
        emoji: '🌿',
        streamUrl: 'https://rainymood.com/audio1112/0.m4a',
        description: 'Rain and nature ambience',
    },
    {
        id: 'classical',
        name: 'Classical',
        emoji: '🎻',
        streamUrl: 'https://live.musopen.org:8085/streamvbr0',
        description: 'Classical music for concentration',
    },
];

// ============================================
// TYPES
// ============================================

interface AudioPlayerState {
    isPlaying: boolean;
    isLoading: boolean;
    currentStation: RadioStation | null;
    volume: number;
    error: string | null;
}

// ============================================
// HOOK
// ============================================

export function useAudioPlayer() {
    const [state, setState] = useState<AudioPlayerState>({
        isPlaying: false,
        isLoading: false,
        currentStation: null,
        volume: 0.7,
        error: null,
    });

    const soundRef = useRef<Audio.Sound | null>(null);

    // ============================================
    // SETUP AUDIO MODE
    // ============================================

    useEffect(() => {
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: true,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch (err) {
                console.error('Error setting audio mode:', err);
            }
        };

        setupAudio();

        // Cleanup on unmount
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    // ============================================
    // PLAY STATION
    // ============================================

    const playStation = useCallback(async (station: RadioStation) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Stop current sound if playing
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            // Create new sound
            const { sound } = await Audio.Sound.createAsync(
                { uri: station.streamUrl },
                { 
                    shouldPlay: true, 
                    volume: state.volume,
                    isLooping: false, // Streams loop naturally
                },
                onPlaybackStatusUpdate
            );

            soundRef.current = sound;

            setState(prev => ({
                ...prev,
                isPlaying: true,
                isLoading: false,
                currentStation: station,
            }));
        } catch (err: any) {
            console.error('Error playing station:', err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Não foi possível reproduzir esta estação',
            }));
        }
    }, [state.volume]);

    // ============================================
    // PLAYBACK STATUS UPDATE
    // ============================================

    const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
            if (status.error) {
                console.error('Playback error:', status.error);
                setState(prev => ({
                    ...prev,
                    isPlaying: false,
                    error: 'Erro na reprodução',
                }));
            }
            return;
        }

        setState(prev => ({
            ...prev,
            isPlaying: status.isPlaying,
            isLoading: status.isBuffering,
        }));
    }, []);

    // ============================================
    // PLAY/PAUSE
    // ============================================

    const togglePlayPause = useCallback(async () => {
        if (!soundRef.current) {
            // If no sound, play first station
            if (RADIO_STATIONS[0]) {
                await playStation(RADIO_STATIONS[0]);
            }
            return;
        }

        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        if (status.isPlaying) {
            await soundRef.current.pauseAsync();
        } else {
            await soundRef.current.playAsync();
        }
    }, [playStation]);

    // ============================================
    // STOP
    // ============================================

    const stop = useCallback(async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }

        setState(prev => ({
            ...prev,
            isPlaying: false,
            currentStation: null,
        }));
    }, []);

    // ============================================
    // SET VOLUME
    // ============================================

    const setVolume = useCallback(async (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        
        setState(prev => ({ ...prev, volume: clampedVolume }));

        if (soundRef.current) {
            await soundRef.current.setVolumeAsync(clampedVolume);
        }
    }, []);

    // ============================================
    // NEXT STATION
    // ============================================

    const nextStation = useCallback(async () => {
        if (!state.currentStation) {
            await playStation(RADIO_STATIONS[0]);
            return;
        }

        const currentIndex = RADIO_STATIONS.findIndex(s => s.id === state.currentStation?.id);
        const nextIndex = (currentIndex + 1) % RADIO_STATIONS.length;
        await playStation(RADIO_STATIONS[nextIndex]);
    }, [state.currentStation, playStation]);

    // ============================================
    // PREVIOUS STATION
    // ============================================

    const prevStation = useCallback(async () => {
        if (!state.currentStation) {
            await playStation(RADIO_STATIONS[RADIO_STATIONS.length - 1]);
            return;
        }

        const currentIndex = RADIO_STATIONS.findIndex(s => s.id === state.currentStation?.id);
        const prevIndex = (currentIndex - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
        await playStation(RADIO_STATIONS[prevIndex]);
    }, [state.currentStation, playStation]);

    return {
        // State
        isPlaying: state.isPlaying,
        isLoading: state.isLoading,
        currentStation: state.currentStation,
        volume: state.volume,
        error: state.error,
        stations: RADIO_STATIONS,
        
        // Actions
        playStation,
        togglePlayPause,
        stop,
        setVolume,
        nextStation,
        prevStation,
    };
}
