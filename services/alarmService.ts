/**
 * Alarm Service
 * Som de despertador quando o timer Pomodoro termina.
 * Funciona na web, iOS e Android (com app aberta ou em background via expo-av).
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export const ALARM_SOUND_URL =
    'https://archive.org/download/SSE_Library_ALARMS/CLOCK/ALRMClok_Mechanical%20alarm%20clock%20ringing%3B%20two%20different_CS_USC.mp3';

const AUTO_STOP_MS = 40000;

let alarmSound: Audio.Sound | null = null;
let autoStopTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Pré-carrega o som do alarme.
 * Deve ser chamado num gesto do utilizador (ex: start do timer)
 * para desbloquear o autoplay no web.
 */
export async function prepareAlarmSound(): Promise<void> {
    try {
        if (alarmSound) return;

        const { sound } = await Audio.Sound.createAsync(
            { uri: ALARM_SOUND_URL },
            { shouldPlay: false, volume: 1, isLooping: true }
        );

        alarmSound = sound;

        // Web: desbloquear o autoplay. O Chrome só permite play() durante um
        // gesto recente do utilizador — ao tocar em silêncio aqui (dentro do
        // clique em "Iniciar"), o elemento fica desbloqueado para o futuro,
        // mesmo com a aba em 2º plano.
        if (Platform.OS === 'web') {
            try {
                await sound.setVolumeAsync(0);
                await sound.playAsync();
                await new Promise((r) => setTimeout(r, 100));
                await sound.pauseAsync();
                await sound.setPositionAsync(0);
                await sound.setVolumeAsync(1);
            } catch (err) {
                console.warn('⚠️ Autoplay unlock falhou (web):', err);
            }
        }
    } catch (err) {
        console.error('Erro ao preparar alarme:', err);
    }
}

/**
 * Toca o alarme em loop.
 * Para automaticamente após AUTO_STOP_MS.
 */
export async function playAlarmSound(): Promise<void> {
    try {
        if (!alarmSound) await prepareAlarmSound();
        if (!alarmSound) return;

        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });

        await alarmSound.setVolumeAsync(1);
        await alarmSound.setPositionAsync(0);

        try {
            await alarmSound.playAsync();
        } catch (playErr) {
            // Retry uma vez (ex: elemento ainda a carregar no web)
            console.warn('⚠️ Primeiro play falhou, a tentar de novo:', playErr);
            await new Promise((r) => setTimeout(r, 300));
            await alarmSound.setPositionAsync(0);
            await alarmSound.playAsync();
        }

        if (autoStopTimeout) clearTimeout(autoStopTimeout);
        autoStopTimeout = setTimeout(() => {
            stopAlarmSound();
        }, AUTO_STOP_MS);
    } catch (err) {
        console.error('Erro ao tocar alarme:', err);
    }
}

/**
 * Para o alarme.
 */
export async function stopAlarmSound(): Promise<void> {
    try {
        if (autoStopTimeout) {
            clearTimeout(autoStopTimeout);
            autoStopTimeout = null;
        }

        if (alarmSound) {
            await alarmSound.stopAsync();
        }
    } catch (err) {
        console.error('Erro ao parar alarme:', err);
    }
}
