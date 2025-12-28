/**
 * MessageBubble Component
 * Renders chat messages with support for rich media (images, GIFs, files)
 */

import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

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

export function MessageBubble({
    content,
    isMe,
    senderName,
    attachmentUrl,
    attachmentType,
    attachmentName,
}: MessageBubbleProps) {

    // Handle file download/open
    const handleFilePress = () => {
        if (attachmentUrl) {
            Linking.openURL(attachmentUrl);
        }
    };

    // Get file extension icon
    const getFileIcon = (fileName?: string | null) => {
        if (!fileName) return 'document-outline';
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf':
                return 'document-text-outline';
            case 'doc':
            case 'docx':
                return 'document-outline';
            case 'xls':
            case 'xlsx':
                return 'grid-outline';
            case 'ppt':
            case 'pptx':
                return 'easel-outline';
            default:
                return 'document-outline';
        }
    };

    return (
        <View style={[styles.container, isMe && styles.containerMe]}>
            {/* Sender name (for group chats) */}
            {!isMe && senderName && (
                <Text style={styles.senderName}>{senderName}</Text>
            )}

            <View style={[styles.bubble, isMe && styles.bubbleMe]}>
                {/* Image Attachment */}
                {attachmentUrl && attachmentType === 'image' && (
                    <Pressable onPress={handleFilePress}>
                        <Image
                            source={{ uri: attachmentUrl }}
                            style={styles.imageAttachment}
                            resizeMode="cover"
                        />
                    </Pressable>
                )}

                {/* GIF Attachment */}
                {attachmentUrl && attachmentType === 'gif' && (
                    <Image
                        source={{ uri: attachmentUrl }}
                        style={styles.gifAttachment}
                        resizeMode="contain"
                    />
                )}

                {/* File Attachment */}
                {attachmentUrl && attachmentType === 'file' && (
                    <Pressable style={styles.fileAttachment} onPress={handleFilePress}>
                        <View style={styles.fileIcon}>
                            <Ionicons
                                name={getFileIcon(attachmentName) as any}
                                size={24}
                                color={isMe ? '#FFF' : colors.accent.primary}
                            />
                        </View>
                        <View style={styles.fileInfo}>
                            <Text
                                style={[styles.fileName, isMe && styles.fileNameMe]}
                                numberOfLines={1}
                            >
                                {attachmentName || 'Ficheiro'}
                            </Text>
                            <Text style={[styles.fileAction, isMe && styles.fileActionMe]}>
                                Toca para abrir
                            </Text>
                        </View>
                        <Ionicons
                            name="download-outline"
                            size={20}
                            color={isMe ? 'rgba(255,255,255,0.7)' : colors.text.tertiary}
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
    );
}

const styles = StyleSheet.create({
    container: {
        maxWidth: '85%',
        marginBottom: spacing.sm,
        alignSelf: 'flex-start',
    },
    containerMe: {
        alignSelf: 'flex-end',
    },
    senderName: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
        marginBottom: 2,
        marginLeft: spacing.xs,
    },
    bubble: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderTopLeftRadius: borderRadius.xs,
        padding: spacing.sm,
        overflow: 'hidden',
    },
    bubbleMe: {
        backgroundColor: colors.accent.primary,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.xs,
    },
    content: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        lineHeight: 20,
    },
    contentMe: {
        color: '#FFF',
    },

    // Image
    imageAttachment: {
        width: 200,
        height: 150,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },

    // GIF
    gifAttachment: {
        width: 200,
        height: 150,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },

    // File
    fileAttachment: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        gap: spacing.sm,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    fileNameMe: {
        color: '#FFF',
    },
    fileAction: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    fileActionMe: {
        color: 'rgba(255,255,255,0.7)',
    },
});
