/**
 * LiveKit Room Component - WEB Version
 * Uses @livekit/components-react for browser support
 * 
 * This file is used for Web only.
 * For React Native, see LiveKitRoom.native.tsx
 */

'use client';

import { LiveKitRoom as LKRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import React from 'react';

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

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveKitRoom({ token, serverUrl, roomName, onLeave, onError }: LiveKitRoomProps) {
    console.log('[LiveKit Web] Mounting with:', { serverUrl, roomName, tokenLength: token?.length });

    if (!token || !serverUrl) {
        return (
            <div style={styles.errorContainer}>
                <h2 style={styles.errorTitle}>❌ Erro de Configuração</h2>
                <p style={styles.errorText}>Token ou URL do servidor em falta</p>
                <button style={styles.button} onClick={onLeave}>Voltar</button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <LKRoom
                serverUrl={serverUrl}
                token={token}
                connect={true}
                video={true}
                audio={true}
                onDisconnected={() => {
                    console.log('[LiveKit Web] Disconnected');
                    onLeave();
                }}
                onError={(error) => {
                    console.error('[LiveKit Web] Error:', error);
                    onError?.(error);
                }}
                style={{ height: '100%' }}
            >
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.liveBadge}>
                        <span style={styles.liveIndicator} />
                        <span style={styles.liveText}>AO VIVO</span>
                    </div>
                    <h1 style={styles.roomName}>{roomName}</h1>
                </div>

                {/* Video Grid */}
                <div style={styles.videoContainer}>
                    <VideoConference />
                </div>

                {/* Audio Renderer (for remote participants) */}
                <RoomAudioRenderer />
            </LKRoom>
        </div>
    );
}

// ============================================
// STYLES (CSS-in-JS for Web)
// ============================================

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0D0F14',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
    },
    header: {
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    liveBadge: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        padding: '4px 12px',
        borderRadius: '999px',
        gap: '6px',
    },
    liveIndicator: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#EF4444',
        animation: 'pulse 1.5s infinite',
    },
    liveText: {
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#EF4444',
        letterSpacing: '1px',
    },
    roomName: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        margin: 0,
    },
    videoContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    errorContainer: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0D0F14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        zIndex: 9999,
    },
    errorTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#EF4444',
        margin: 0,
    },
    errorText: {
        fontSize: '16px',
        color: '#9CA3AF',
        margin: 0,
    },
    button: {
        marginTop: '16px',
        padding: '12px 32px',
        backgroundColor: '#6366F1',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
    },
};

export default LiveKitRoom;
