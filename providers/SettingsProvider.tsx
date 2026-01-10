import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export type UiMode = 'tabs' | 'drawer';

interface SettingsContextType {
    // Sound Effects
    soundEffectsEnabled: boolean;
    setSoundEffectsEnabled: (enabled: boolean) => Promise<void>;
    playSound: (soundName: SoundName) => Promise<void>;
    // UI Mode
    uiMode: UiMode;
    setUiMode: (mode: UiMode) => Promise<void>;
}

// Map sound names to require() paths (mocked for now until assets exist)
// In the future: 'success': require('@/assets/sounds/success.mp3'),
export type SoundName = 'success' | 'error' | 'tap';

const SOUND_MAP: Record<SoundName, any> = {
    success: null, // Placeholder
    error: null,   // Placeholder
    tap: null,     // Placeholder
};

// ============================================
// CONTEXT
// ============================================

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ============================================
// CONSTANTS
// ============================================

const SETTINGS_STORAGE_KEY = '@escolaa_settings_v2';

// ============================================
// PROVIDER
// ============================================

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [soundEffectsEnabled, setSoundEffectsState] = useState(true);
    const [uiMode, setUiModeState] = useState<UiMode>('drawer');
    const [isLoading, setIsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
            if (jsonValue != null) {
                const settings = JSON.parse(jsonValue);
                if (typeof settings.soundEffectsEnabled === 'boolean') {
                    setSoundEffectsState(settings.soundEffectsEnabled);
                }
                if (settings.uiMode === 'tabs' || settings.uiMode === 'drawer') {
                    setUiModeState(settings.uiMode);
                }
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings: { soundEffectsEnabled: boolean; uiMode: UiMode }) => {
        try {
            const jsonValue = JSON.stringify(newSettings);
            await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, jsonValue);
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const setSoundEffectsEnabled = async (enabled: boolean) => {
        setSoundEffectsState(enabled);
        await saveSettings({ soundEffectsEnabled: enabled, uiMode });
    };

    const setUiMode = async (mode: UiMode) => {
        setUiModeState(mode);
        await saveSettings({ soundEffectsEnabled, uiMode: mode });
    };

    const playSound = async (soundName: SoundName) => {
        if (!soundEffectsEnabled) return;

        const soundSource = SOUND_MAP[soundName];
        if (!soundSource) return; // No asset yet

        try {
            const { sound } = await Audio.Sound.createAsync(
                soundSource,
                { shouldPlay: true }
            );

            // Cleanup after playback
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    return (
        <SettingsContext.Provider
            value={{
                soundEffectsEnabled,
                setSoundEffectsEnabled,
                playSound,
                uiMode,
                setUiMode,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}

