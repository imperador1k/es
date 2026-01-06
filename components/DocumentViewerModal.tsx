/**
 * DocumentViewerModal
 * In-app document viewer using Google Docs Viewer (WebView)
 * Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images
 */

import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// File extensions that can be viewed with Google Docs Viewer
const GOOGLE_VIEWER_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

interface DocumentViewerModalProps {
    visible: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName?: string | null;
}

function getFileExtension(fileName?: string | null, url?: string): string {
    if (fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext) return ext;
    }
    if (url) {
        // Try to get extension from URL (before query params)
        const urlPath = url.split('?')[0];
        const ext = urlPath.split('.').pop()?.toLowerCase();
        if (ext) return ext;
    }
    return '';
}

function getFileIcon(ext: string): keyof typeof Ionicons.glyphMap {
    switch (ext) {
        case 'pdf': return 'document-text';
        case 'doc':
        case 'docx': return 'document';
        case 'xls':
        case 'xlsx': return 'grid';
        case 'ppt':
        case 'pptx': return 'easel';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp': return 'image';
        default: return 'document-outline';
    }
}

function getFileColor(ext: string): string {
    switch (ext) {
        case 'pdf': return '#E53935';
        case 'doc':
        case 'docx': return '#2196F3';
        case 'xls':
        case 'xlsx': return '#4CAF50';
        case 'ppt':
        case 'pptx': return '#FF9800';
        default: return '#6366F1';
    }
}

export function DocumentViewerModal({
    visible,
    onClose,
    fileUrl,
    fileName,
}: DocumentViewerModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const extension = getFileExtension(fileName, fileUrl);
    const isImage = IMAGE_EXTENSIONS.includes(extension);
    const isGoogleViewable = GOOGLE_VIEWER_EXTENSIONS.includes(extension);

    // Build the viewer URL
    let viewerUrl = fileUrl;
    if (isGoogleViewable && !isImage) {
        // Use Google Docs Viewer for documents
        viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
    }

    const displayName = fileName || 'Documento';
    const fileColor = getFileColor(extension);
    const fileIcon = getFileIcon(extension);

    const handleShare = async () => {
        try {
            if (await Sharing.isAvailableAsync()) {
                // For sharing, we'd need to download first - for now open in browser
                await Linking.openURL(fileUrl);
            } else {
                await Linking.openURL(fileUrl);
            }
        } catch (error) {
            console.error('Error sharing:', error);
            await Linking.openURL(fileUrl);
        }
    };

    const handleOpenExternal = () => {
        Linking.openURL(fileUrl);
    };

    const handleRetry = () => {
        setHasError(false);
        setIsLoading(true);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
            <View style={styles.container}>
                {/* Header */}
                <SafeAreaView edges={['top']} style={styles.header}>
                    {/* Close Button */}
                    <Pressable style={styles.headerButton} onPress={onClose}>
                        <BlurView intensity={40} tint="dark" style={styles.headerButtonBlur}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </BlurView>
                    </Pressable>

                    {/* File Info */}
                    <View style={styles.fileInfo}>
                        <View style={[styles.fileIconSmall, { backgroundColor: `${fileColor}20` }]}>
                            <Ionicons name={fileIcon} size={16} color={fileColor} />
                        </View>
                        <Text style={styles.fileName} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.headerActions}>
                        <Pressable style={styles.headerButton} onPress={handleShare}>
                            <BlurView intensity={40} tint="dark" style={styles.headerButtonBlur}>
                                <Ionicons name="share-outline" size={20} color="#FFF" />
                            </BlurView>
                        </Pressable>
                        <Pressable style={styles.headerButton} onPress={handleOpenExternal}>
                            <BlurView intensity={40} tint="dark" style={styles.headerButtonBlur}>
                                <Ionicons name="open-outline" size={20} color="#FFF" />
                            </BlurView>
                        </Pressable>
                    </View>
                </SafeAreaView>

                {/* WebView Content */}
                <View style={styles.webviewContainer}>
                    {/* Loading Indicator */}
                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <View style={[styles.loadingIcon, { backgroundColor: `${fileColor}20` }]}>
                                <Ionicons name={fileIcon} size={40} color={fileColor} />
                            </View>
                            <Text style={styles.loadingTitle}>A carregar documento...</Text>
                            <Text style={styles.loadingSubtitle}>{displayName}</Text>
                            <ActivityIndicator size="large" color={fileColor} style={{ marginTop: 20 }} />
                        </View>
                    )}

                    {/* Error State */}
                    {hasError && (
                        <View style={styles.errorContainer}>
                            <View style={styles.errorIcon}>
                                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                            </View>
                            <Text style={styles.errorTitle}>Não foi possível carregar</Text>
                            <Text style={styles.errorSubtitle}>
                                O documento pode não estar disponível ou o formato não é suportado.
                            </Text>
                            <View style={styles.errorActions}>
                                <Pressable style={styles.retryButton} onPress={handleRetry}>
                                    <Ionicons name="refresh" size={18} color="#FFF" />
                                    <Text style={styles.retryButtonText}>Tentar novamente</Text>
                                </Pressable>
                                <Pressable style={styles.externalButton} onPress={handleOpenExternal}>
                                    <Ionicons name="open-outline" size={18} color="#6366F1" />
                                    <Text style={styles.externalButtonText}>Abrir no browser</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {/* WebView */}
                    {!hasError && (
                        <WebView
                            source={{ uri: viewerUrl }}
                            style={[styles.webview, isLoading && styles.webviewHidden]}
                            onLoadStart={() => setIsLoading(true)}
                            onLoadEnd={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                            onHttpError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            startInLoadingState={false}
                            scalesPageToFit={true}
                            allowsFullscreenVideo={true}
                            allowsInlineMediaPlayback={true}
                        />
                    )}
                </View>

                {/* Bottom Bar */}
                <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
                    <Pressable style={styles.downloadButton} onPress={handleOpenExternal}>
                        <Ionicons name="download-outline" size={20} color="#FFF" />
                        <Text style={styles.downloadButtonText}>Transferir ficheiro</Text>
                    </Pressable>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        gap: SPACING.sm,
    },
    headerButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    headerButtonBlur: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    fileIconSmall: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileName: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    headerActions: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },

    // WebView
    webviewContainer: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    webviewHidden: {
        opacity: 0,
    },

    // Loading
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
        zIndex: 10,
    },
    loadingIcon: {
        width: 80,
        height: 80,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    loadingTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
        marginBottom: SPACING.xs,
    },
    loadingSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: 'rgba(255,255,255,0.5)',
    },

    // Error
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
        paddingHorizontal: SPACING.xl,
        zIndex: 10,
    },
    errorIcon: {
        marginBottom: SPACING.lg,
    },
    errorTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 22,
    },
    errorActions: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginTop: SPACING.xl,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: '#6366F1',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    retryButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    externalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: 'rgba(99,102,241,0.15)',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    externalButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#6366F1',
    },

    // Bottom Bar
    bottomBar: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: '#6366F1',
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        ...SHADOWS.md,
    },
    downloadButtonText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
});
