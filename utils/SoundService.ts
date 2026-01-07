/**
 * Sound Service - Discord-style Sounds
 * Singleton service for playing app sounds
 * Uses expo-av with pre-loading for zero-lag playback
 */

import { Audio, AVPlaybackSource } from 'expo-av';

// ============================================
// SOUND ASSETS
// ============================================

const SOUND_FILES = {
    join: require('@/assets/sounds/discord_join.mp3'),
    leave: require('@/assets/sounds/discord_leave.mp3'),
    notification: require('@/assets/sounds/discord_notify.mp3'),
    ring: require('@/assets/sounds/discord_ring.mp3'),
} as const;

export type SoundType = keyof typeof SOUND_FILES;

// ============================================
// SINGLETON SERVICE
// ============================================

class SoundServiceClass {
    private sounds: Map<SoundType, Audio.Sound> = new Map();
    private isInitialized = false;
    private isInitializing = false;

    /**
     * Initialize audio mode and pre-load all sounds
     * Call this once at app startup (e.g., in _layout.tsx)
     */
    async initialize(): Promise<void> {
        if (this.isInitialized || this.isInitializing) return;

        this.isInitializing = true;

        try {
            // Configure audio mode for optimal playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: false,
                playsInSilentModeIOS: true, // Play even in silent mode
                shouldDuckAndroid: true, // Lower volume of other apps
                playThroughEarpieceAndroid: false,
            });

            // Pre-load all sounds
            await Promise.all(
                (Object.keys(SOUND_FILES) as SoundType[]).map(async (key) => {
                    try {
                        const { sound } = await Audio.Sound.createAsync(
                            SOUND_FILES[key] as AVPlaybackSource,
                            { shouldPlay: false, volume: 1.0 }
                        );
                        this.sounds.set(key, sound);
                        console.log(`🔊 Sound loaded: ${key}`);
                    } catch (err) {
                        console.error(`Failed to load sound: ${key}`, err);
                    }
                })
            );

            this.isInitialized = true;
            console.log('🔊 SoundService initialized');
        } catch (err) {
            console.error('SoundService initialization failed:', err);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Play a sound by type
     */
    private async playSound(type: SoundType): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const sound = this.sounds.get(type);
        if (!sound) {
            console.warn(`Sound not loaded: ${type}`);
            return;
        }

        try {
            // Reset to beginning and play
            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (err) {
            console.error(`Error playing sound: ${type}`, err);
        }
    }

    // ============================================
    // PUBLIC METHODS
    // ============================================

    /** Play Discord-style join sound (someone joined room) */
    async playJoin(): Promise<void> {
        return this.playSound('join');
    }

    /** Play Discord-style leave sound (someone left room) */
    async playLeave(): Promise<void> {
        return this.playSound('leave');
    }

    /** Play notification sound (new message, mention) */
    async playNotification(): Promise<void> {
        return this.playSound('notification');
    }

    /** Play ring sound (incoming call) */
    async playRing(): Promise<void> {
        return this.playSound('ring');
    }

    /**
     * Cleanup all loaded sounds
     * Call on app shutdown if needed
     */
    async cleanup(): Promise<void> {
        for (const sound of this.sounds.values()) {
            try {
                await sound.unloadAsync();
            } catch (err) {
                console.error('Error unloading sound:', err);
            }
        }
        this.sounds.clear();
        this.isInitialized = false;
        console.log('🔊 SoundService cleaned up');
    }
}

// Export singleton instance
export const SoundService = new SoundServiceClass();
