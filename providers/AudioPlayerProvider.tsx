/**
 * AudioPlayerProvider
 * Global context for audio player state
 */

import { RADIO_STATIONS, RadioStation, useAudioPlayer } from '@/hooks/useAudioPlayer';
import React, { createContext, ReactNode, useContext } from 'react';

// ============================================
// CONTEXT TYPE
// ============================================

interface AudioPlayerContextType {
    // State
    isPlaying: boolean;
    isLoading: boolean;
    currentStation: RadioStation | null;
    volume: number;
    error: string | null;
    stations: RadioStation[];

    // Actions
    playStation: (station: RadioStation) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    stop: () => Promise<void>;
    setVolume: (volume: number) => Promise<void>;
    nextStation: () => Promise<void>;
    prevStation: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
    const audioPlayer = useAudioPlayer();

    return (
        <AudioPlayerContext.Provider value={audioPlayer}>
            {children}
        </AudioPlayerContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useAudioPlayerContext() {
    const context = useContext(AudioPlayerContext);
    if (!context) {
        throw new Error('useAudioPlayerContext must be used within AudioPlayerProvider');
    }
    return context;
}

// Re-export for convenience
export { RADIO_STATIONS };
export type { RadioStation };

