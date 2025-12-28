/**
 * MiniPlayer Component
 * Floating audio player bar
 */

import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAudioPlayerContext } from '@/providers/AudioPlayerProvider';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export function MiniPlayer() {
    const {
        isPlaying,
        isLoading,
        currentStation,
        volume,
        stations,
        togglePlayPause,
        playStation,
        nextStation,
        prevStation,
        setVolume,
        stop,
    } = useAudioPlayerContext();

    const [showStationPicker, setShowStationPicker] = useState(false);

    // Don't render if no station is playing and not loading
    if (!currentStation && !isLoading) {
        return null;
    }

    return (
        <>
            {/* Mini Player Bar */}
            <View style={styles.container}>
                {/* Station Info - Tap to open picker */}
                <Pressable
                    style={styles.stationInfo}
                    onPress={() => setShowStationPicker(true)}
                >
                    <Text style={styles.stationEmoji}>
                        {currentStation?.emoji || '🎵'}
                    </Text>
                    <View style={styles.stationText}>
                        <Text style={styles.stationName} numberOfLines={1}>
                            {currentStation?.name || 'Selecionar estação'}
                        </Text>
                        <Text style={styles.stationDescription} numberOfLines={1}>
                            {isLoading ? 'A carregar...' : (currentStation?.description || '')}
                        </Text>
                    </View>
                </Pressable>

                {/* Controls */}
                <View style={styles.controls}>
                    {/* Previous */}
                    <Pressable style={styles.controlBtn} onPress={prevStation}>
                        <Ionicons name="play-skip-back" size={20} color={colors.text.secondary} />
                    </Pressable>

                    {/* Play/Pause */}
                    <Pressable
                        style={styles.playBtn}
                        onPress={togglePlayPause}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={24}
                                color="#FFF"
                            />
                        )}
                    </Pressable>

                    {/* Next */}
                    <Pressable style={styles.controlBtn} onPress={nextStation}>
                        <Ionicons name="play-skip-forward" size={20} color={colors.text.secondary} />
                    </Pressable>

                    {/* Stop/Close */}
                    <Pressable style={styles.controlBtn} onPress={stop}>
                        <Ionicons name="close" size={20} color={colors.text.tertiary} />
                    </Pressable>
                </View>
            </View>

            {/* Station Picker Modal */}
            <Modal
                visible={showStationPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowStationPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🎵 Escolher Estação</Text>
                            <Pressable
                                style={styles.modalClose}
                                onPress={() => setShowStationPicker(false)}
                            >
                                <Ionicons name="close" size={24} color={colors.text.primary} />
                            </Pressable>
                        </View>

                        {/* Volume Slider */}
                        <View style={styles.volumeContainer}>
                            <Ionicons name="volume-low" size={20} color={colors.text.tertiary} />
                            <Slider
                                style={styles.volumeSlider}
                                minimumValue={0}
                                maximumValue={1}
                                value={volume}
                                onValueChange={setVolume}
                                minimumTrackTintColor={colors.accent.primary}
                                maximumTrackTintColor={colors.surfaceSubtle}
                                thumbTintColor={colors.accent.primary}
                            />
                            <Ionicons name="volume-high" size={20} color={colors.text.tertiary} />
                        </View>

                        {/* Station List */}
                        <ScrollView style={styles.stationList}>
                            {stations.map((station) => (
                                <Pressable
                                    key={station.id}
                                    style={[
                                        styles.stationItem,
                                        currentStation?.id === station.id && styles.stationItemActive,
                                    ]}
                                    onPress={async () => {
                                        await playStation(station);
                                        setShowStationPicker(false);
                                    }}
                                >
                                    <Text style={styles.stationItemEmoji}>{station.emoji}</Text>
                                    <View style={styles.stationItemInfo}>
                                        <Text style={[
                                            styles.stationItemName,
                                            currentStation?.id === station.id && styles.stationItemNameActive,
                                        ]}>
                                            {station.name}
                                        </Text>
                                        <Text style={styles.stationItemDesc}>
                                            {station.description}
                                        </Text>
                                    </View>
                                    {currentStation?.id === station.id && isPlaying && (
                                        <View style={styles.nowPlaying}>
                                            <View style={styles.playingDot} />
                                            <Text style={styles.playingText}>A tocar</Text>
                                        </View>
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90, // Above tab bar
        left: spacing.md,
        right: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        paddingHorizontal: spacing.md,
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.divider,
    },

    // Station Info
    stationInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    stationEmoji: {
        fontSize: 28,
    },
    stationText: {
        flex: 1,
    },
    stationName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    stationDescription: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },

    // Controls
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    controlBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        paddingBottom: 40,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    modalClose: {
        padding: spacing.xs,
    },

    // Volume
    volumeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    volumeSlider: {
        flex: 1,
        height: 40,
    },

    // Station List
    stationList: {
        paddingHorizontal: spacing.md,
    },
    stationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xs,
    },
    stationItemActive: {
        backgroundColor: colors.accent.primary + '15',
    },
    stationItemEmoji: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    stationItemInfo: {
        flex: 1,
    },
    stationItemName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    stationItemNameActive: {
        color: colors.accent.primary,
        fontWeight: typography.weight.bold,
    },
    stationItemDesc: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Now Playing
    nowPlaying: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    playingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success.primary,
    },
    playingText: {
        fontSize: typography.size.xs,
        color: colors.success.primary,
        fontWeight: typography.weight.medium,
    },
});
