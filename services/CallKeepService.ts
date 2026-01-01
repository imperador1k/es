/**
 * 📞 CallKeep Service - Native Call UI
 * Integrates with iOS CallKit and Android ConnectionService
 * Shows native incoming call UI when app is in background/killed
 */

import { router } from 'expo-router';
import { Platform } from 'react-native';

// CallKeep types (react-native-callkeep)
interface CallKeepOptions {
    ios: {
        appName: string;
        imageName?: string;
        ringtoneSound?: string;
        supportsVideo?: boolean;
    };
    android: {
        alertTitle: string;
        alertDescription: string;
        cancelButton: string;
        okButton: string;
        imageName?: string;
        additionalPermissions?: string[];
        selfManaged?: boolean;
    };
}

// We'll dynamically import CallKeep to avoid crashes on web
let RNCallKeep: any = null;

// Store pending calls
const pendingCalls = new Map<string, {
    conversationId: string;
    callerName: string;
}>();

/**
 * Initialize CallKeep with app configuration
 */
export async function setupCallKeep(): Promise<boolean> {
    if (Platform.OS === 'web') {
        console.log('[CallKeep] Web platform - skipping setup');
        return false;
    }

    try {
        // Dynamic import to avoid bundling issues
        RNCallKeep = require('react-native-callkeep').default;

        const options: CallKeepOptions = {
            ios: {
                appName: 'Escola+',
                imageName: 'CallKitIcon',
                ringtoneSound: 'ringtone.wav',
                supportsVideo: true,
            },
            android: {
                alertTitle: 'Permissões de Chamada',
                alertDescription: 'A app precisa de permissões para mostrar chamadas',
                cancelButton: 'Cancelar',
                okButton: 'OK',
                imageName: 'ic_launcher',
                selfManaged: true,
                additionalPermissions: [],
            },
        };

        await RNCallKeep.setup(options);
        RNCallKeep.setAvailable(true);

        // Register event listeners
        registerCallKeepListeners();

        console.log('[CallKeep] Setup complete');
        return true;
    } catch (error) {
        console.error('[CallKeep] Setup failed:', error);
        return false;
    }
}

/**
 * Register CallKeep event listeners
 */
function registerCallKeepListeners() {
    if (!RNCallKeep) return;

    // User answered the call from native UI
    RNCallKeep.addEventListener('answerCall', async ({ callUUID }: { callUUID: string }) => {
        console.log('[CallKeep] Call answered:', callUUID);
        
        const pendingCall = pendingCalls.get(callUUID);
        if (pendingCall) {
            // Navigate to the DM and start the call
            router.push({
                pathname: '/dm/[id]',
                params: { 
                    id: pendingCall.conversationId,
                    answerCall: 'true',
                },
            } as any);
            
            pendingCalls.delete(callUUID);
        }

        // End the native call UI
        RNCallKeep.endCall(callUUID);
    });

    // User declined the call from native UI
    RNCallKeep.addEventListener('endCall', ({ callUUID }: { callUUID: string }) => {
        console.log('[CallKeep] Call ended/declined:', callUUID);
        pendingCalls.delete(callUUID);
        // The rejection will be handled by CallContext when user opens app
    });

    // iOS specific: Audio session activated
    RNCallKeep.addEventListener('didActivateAudioSession', () => {
        console.log('[CallKeep] Audio session activated');
    });

    // Call state changed (for debugging)
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', ({ muted, callUUID }: any) => {
        console.log('[CallKeep] Mute changed:', muted, callUUID);
    });

    console.log('[CallKeep] Event listeners registered');
}

/**
 * Display incoming call using native UI
 */
export function displayIncomingCall(
    uuid: string,
    callerName: string,
    conversationId: string,
    hasVideo: boolean = true
): void {
    if (!RNCallKeep) {
        console.log('[CallKeep] Not available - using in-app modal');
        return;
    }

    console.log('[CallKeep] Displaying incoming call from:', callerName);

    // Store call info for when user answers
    pendingCalls.set(uuid, {
        conversationId,
        callerName,
    });

    // Display the native incoming call UI
    RNCallKeep.displayIncomingCall(
        uuid,
        callerName, // handle
        callerName, // localizedCallerName
        'generic', // handleType
        hasVideo,   // hasVideo
    );
}

/**
 * Report outgoing call started
 */
export function startOutgoingCall(uuid: string, callerName: string): void {
    if (!RNCallKeep) return;

    RNCallKeep.startCall(uuid, callerName, callerName, 'generic', true);
    console.log('[CallKeep] Started outgoing call to:', callerName);
}

/**
 * Report call connected
 */
export function reportCallConnected(uuid: string): void {
    if (!RNCallKeep) return;

    RNCallKeep.reportConnectedOutgoingCallWithUUID(uuid);
    console.log('[CallKeep] Reported call connected:', uuid);
}

/**
 * End a call
 */
export function endCall(uuid: string): void {
    if (!RNCallKeep) return;

    RNCallKeep.endCall(uuid);
    pendingCalls.delete(uuid);
    console.log('[CallKeep] Ended call:', uuid);
}

/**
 * End all calls
 */
export function endAllCalls(): void {
    if (!RNCallKeep) return;

    RNCallKeep.endAllCalls();
    pendingCalls.clear();
    console.log('[CallKeep] Ended all calls');
}

/**
 * Generate a unique UUID for a call
 */
export function generateCallUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Check if CallKeep is available
 */
export function isCallKeepAvailable(): boolean {
    return RNCallKeep !== null && Platform.OS !== 'web';
}

export default {
    setupCallKeep,
    displayIncomingCall,
    startOutgoingCall,
    reportCallConnected,
    endCall,
    endAllCalls,
    generateCallUUID,
    isCallKeepAvailable,
};
