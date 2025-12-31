/**
 * MessageBubble Component - PREMIUM
 * Renders chat messages with rich media + Image Viewer Modal
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MessageBubbleProps {
    content: string;
    isMe: boolean;
    senderName?: string;
    senderAvatar?: string | null;
    timestamp?: string;
    attachmentUrl?: string | null;
    attachmentType?: 'image' | 'video' | 'file' | 'gif' | null;
    attachmentName?: string | null;
}

// ============================================
// IMAGE VIEWER MODAL
// ============================================

function ImageViewerModal({
    visible,
    imageUrl,
    onClose
}: {
    visible: boolean;
    imageUrl: string;
    onClose: () => void;
}) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
            <View style={viewerStyles.container}>
                {/* Backdrop */}
                <Pressable style={viewerStyles.backdrop} onPress={onClose} />

                {/* Header */}
                <SafeAreaView edges={['top']} style={viewerStyles.header}>
                    <Pressable style={viewerStyles.closeButton} onPress={onClose}>
                        <BlurView intensity={60} tint="dark" style={viewerStyles.closeBlur}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </BlurView>
                    </Pressable>
                    <View style={viewerStyles.headerSpacer} />
                    <Pressable
                        style={viewerStyles.actionButton}
                        onPress={() => Linking.openURL(imageUrl)}
                    >
                        <BlurView intensity={60} tint="dark" style={viewerStyles.closeBlur}>
                            <Ionicons name="download-outline" size={22} color="#FFF" />
                        </BlurView>
                    </Pressable>
                </SafeAreaView>

                {/* Image */}
                <View style={viewerStyles.imageContainer}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={viewerStyles.fullImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Bottom hint */}
                <SafeAreaView edges={['bottom']} style={viewerStyles.footer}>
                    <Text style={viewerStyles.hint}>Toca fora para fechar</Text>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const viewerStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        zIndex: 10,
    },
    closeButton: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    closeBlur: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerSpacer: {
        flex: 1,
    },
    actionButton: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    imageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.md,
    },
    fullImage: {
        width: SCREEN_WIDTH - SPACING.lg * 2,
        height: SCREEN_HEIGHT * 0.7,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: SPACING.lg,
    },
    hint: {
        fontSize: TYPOGRAPHY.size.sm,
        color: 'rgba(255,255,255,0.5)',
    },
});

// ============================================
// MESSAGE BUBBLE
// ============================================

export function MessageBubble({
    content,
    isMe,
    senderName,
    attachmentUrl,
    attachmentType,
    attachmentName,
}: MessageBubbleProps) {
    const [viewerVisible, setViewerVisible] = useState(false);

    const handleFilePress = () => {
        if (attachmentUrl) {
            Linking.openURL(attachmentUrl);
        }
    };

    const handleImagePress = () => {
        if (attachmentUrl && (attachmentType === 'image' || attachmentType === 'gif')) {
            setViewerVisible(true);
        }
    };

    const getFileIcon = (fileName?: string | null) => {
        if (!fileName) return 'document-outline';
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return 'document-text-outline';
            case 'doc':
            case 'docx': return 'document-outline';
            case 'xls':
            case 'xlsx': return 'grid-outline';
            case 'ppt':
            case 'pptx': return 'easel-outline';
            default: return 'document-outline';
        }
    };

    const isMediaMessage = attachmentType === 'image' || attachmentType === 'gif';

    return (
        <>
            <View style={[styles.container, isMe && styles.containerMe]}>
                {/* Sender name */}
                {!isMe && senderName && (
                    <Text style={styles.senderName}>{senderName}</Text>
                )}

                <View style={[styles.bubble, isMe && styles.bubbleMe]}>
                    {/* Image Attachment */}
                    {attachmentUrl && attachmentType === 'image' && (
                        <Pressable onPress={handleImagePress} style={styles.mediaPress}>
                            <Image
                                source={{ uri: attachmentUrl }}
                                style={styles.imageAttachment}
                                resizeMode="cover"
                            />
                            {/* Zoom hint overlay */}
                            <View style={styles.zoomOverlay}>
                                <View style={styles.zoomIcon}>
                                    <Ionicons name="expand-outline" size={16} color="#FFF" />
                                </View>
                            </View>
                        </Pressable>
                    )}

                    {/* GIF Attachment */}
                    {attachmentUrl && attachmentType === 'gif' && (
                        <Pressable onPress={handleImagePress} style={styles.mediaPress}>
                            <Image
                                source={{ uri: attachmentUrl }}
                                style={styles.gifAttachment}
                                resizeMode="contain"
                            />
                            {/* GIF badge */}
                            <View style={styles.gifBadge}>
                                <Text style={styles.gifBadgeText}>GIF</Text>
                            </View>
                            {/* Zoom hint */}
                            <View style={styles.zoomOverlay}>
                                <View style={styles.zoomIcon}>
                                    <Ionicons name="expand-outline" size={16} color="#FFF" />
                                </View>
                            </View>
                        </Pressable>
                    )}

                    {/* File Attachment */}
                    {attachmentUrl && attachmentType === 'file' && (
                        <Pressable style={styles.fileAttachment} onPress={handleFilePress}>
                            <LinearGradient
                                colors={isMe ? ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'] : ['#6366F1', '#4F46E5']}
                                style={styles.fileIcon}
                            >
                                <Ionicons
                                    name={getFileIcon(attachmentName) as any}
                                    size={22}
                                    color="#FFF"
                                />
                            </LinearGradient>
                            <View style={styles.fileInfo}>
                                <Text style={[styles.fileName, isMe && styles.fileNameMe]} numberOfLines={1}>
                                    {attachmentName || 'Ficheiro'}
                                </Text>
                                <Text style={[styles.fileAction, isMe && styles.fileActionMe]}>
                                    Toca para abrir
                                </Text>
                            </View>
                            <Ionicons
                                name="download-outline"
                                size={20}
                                color={isMe ? 'rgba(255,255,255,0.7)' : COLORS.text.tertiary}
                            />
                        </Pressable>
                    )}

                    {/* Text Content */}
                    {content && content !== '📷' && content !== '📎' && content !== '🎬' && (
                        <Text style={[styles.content, isMe && styles.contentMe]}>
                            {content}
                        </Text>
                    )}
                </View>
            </View>

            {/* Image Viewer Modal */}
            {attachmentUrl && isMediaMessage && (
                <ImageViewerModal
                    visible={viewerVisible}
                    imageUrl={attachmentUrl}
                    onClose={() => setViewerVisible(false)}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        maxWidth: '85%',
        marginBottom: SPACING.sm,
        alignSelf: 'flex-start',
    },
    containerMe: {
        alignSelf: 'flex-end',
    },
    senderName: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#6366F1',
        marginBottom: 2,
        marginLeft: SPACING.xs,
    },
    bubble: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        borderTopLeftRadius: RADIUS.xs,
        padding: SPACING.sm,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    bubbleMe: {
        backgroundColor: '#6366F1',
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xs,
    },
    content: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        lineHeight: 22,
    },
    contentMe: {
        color: '#FFF',
    },

    // Media
    mediaPress: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    imageAttachment: {
        width: 220,
        height: 165,
        borderRadius: RADIUS.lg,
    },
    gifAttachment: {
        width: 220,
        height: 165,
        borderRadius: RADIUS.lg,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    zoomOverlay: {
        position: 'absolute',
        bottom: SPACING.sm,
        right: SPACING.sm,
    },
    zoomIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gifBadge: {
        position: 'absolute',
        top: SPACING.sm,
        left: SPACING.sm,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    gifBadgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // File
    fileAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.xs,
        gap: SPACING.sm,
    },
    fileIcon: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    fileNameMe: {
        color: '#FFF',
    },
    fileAction: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    fileActionMe: {
        color: 'rgba(255,255,255,0.7)',
    },
});
