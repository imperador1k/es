/**
 * ChatInputBar Component
 * Rich input bar with support for attachments (images, files, GIFs)
 */

import { GiphyPicker } from '@/components/GiphyPicker';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface ChatInputBarProps {
    onSend: (content: string, attachment?: {
        url: string;
        type: 'image' | 'video' | 'file' | 'gif';
        name?: string;
    }) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ChatInputBar({
    onSend,
    placeholder = 'Escreve uma mensagem...',
    disabled = false
}: ChatInputBarProps) {
    const { user } = useAuthContext();
    const [text, setText] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [showGiphy, setShowGiphy] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Send text message
    const handleSend = () => {
        if (!text.trim() || disabled) return;
        onSend(text.trim());
        setText('');
    };

    // Upload file to Supabase Storage using base64
    const uploadToStorage = async (uri: string, fileName: string, mimeType: string): Promise<string | null> => {
        if (!user?.id) return null;

        try {
            // Read file as base64 (works with file:// URIs in React Native)
            const base64Data = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            // Generate unique path
            const ext = fileName.split('.').pop() || 'jpg';
            const path = `${user.id}/${Date.now()}.${ext}`;

            // Decode base64 to ArrayBuffer and upload
            const { data, error } = await supabase.storage
                .from('chat-files')
                .upload(path, decode(base64Data), {
                    contentType: mimeType,
                    cacheControl: '3600',
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('chat-files')
                .getPublicUrl(path);

            return urlData.publicUrl;
        } catch (err) {
            console.error('Upload error:', err);
            return null;
        }
    };

    // Pick image from camera
    const handleCamera = async () => {
        setShowMenu(false);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmara');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            setUploading(true);
            const asset = result.assets[0];
            const fileName = asset.uri.split('/').pop() || 'photo.jpg';
            const url = await uploadToStorage(asset.uri, fileName, 'image/jpeg');
            setUploading(false);

            if (url) {
                onSend('📷', { url, type: 'image', name: fileName });
            } else {
                Alert.alert('Erro', 'Não foi possível enviar a imagem');
            }
        }
    };

    // Pick image from gallery
    const handleGallery = async () => {
        setShowMenu(false);

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsMultipleSelection: false,
        });

        if (!result.canceled && result.assets[0]) {
            setUploading(true);
            const asset = result.assets[0];
            const fileName = asset.uri.split('/').pop() || 'image.jpg';
            const mimeType = asset.mimeType || 'image/jpeg';
            const url = await uploadToStorage(asset.uri, fileName, mimeType);
            setUploading(false);

            if (url) {
                onSend('📷', { url, type: 'image', name: fileName });
            } else {
                Alert.alert('Erro', 'Não foi possível enviar a imagem');
            }
        }
    };

    // Pick document
    const handleDocument = async () => {
        setShowMenu(false);

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                setUploading(true);
                const asset = result.assets[0];
                const url = await uploadToStorage(asset.uri, asset.name, asset.mimeType || 'application/pdf');
                setUploading(false);

                if (url) {
                    onSend('📎', { url, type: 'file', name: asset.name });
                } else {
                    Alert.alert('Erro', 'Não foi possível enviar o ficheiro');
                }
            }
        } catch (err) {
            console.error('Document picker error:', err);
            setUploading(false);
        }
    };

    // Handle GIF selection
    const handleGifSelect = (gifUrl: string) => {
        onSend('🎬', { url: gifUrl, type: 'gif' });
    };

    // Handle GIF button
    const handleGif = () => {
        setShowMenu(false);
        setShowGiphy(true);
    };

    return (
        <View style={styles.container}>
            {/* Attachment Menu Button */}
            <Pressable
                style={styles.menuButton}
                onPress={() => setShowMenu(true)}
                disabled={disabled || uploading}
            >
                {uploading ? (
                    <ActivityIndicator size="small" color={colors.accent.primary} />
                ) : (
                    <Ionicons name="add-circle" size={28} color={colors.accent.primary} />
                )}
            </Pressable>

            {/* Text Input */}
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={colors.text.tertiary}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
                editable={!disabled && !uploading}
            />

            {/* Send Button */}
            <Pressable
                style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!text.trim() || disabled || uploading}
            >
                <Ionicons
                    name="send"
                    size={18}
                    color={text.trim() && !disabled ? '#FFF' : colors.text.tertiary}
                />
            </Pressable>

            {/* Attachment Menu Modal */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
                    <View style={styles.menuContainer}>
                        <Pressable style={styles.menuItem} onPress={handleCamera}>
                            <View style={[styles.menuIcon, { backgroundColor: '#10B981' }]}>
                                <Ionicons name="camera" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.menuText}>Câmara</Text>
                        </Pressable>

                        <Pressable style={styles.menuItem} onPress={handleGallery}>
                            <View style={[styles.menuIcon, { backgroundColor: '#3B82F6' }]}>
                                <Ionicons name="images" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.menuText}>Galeria</Text>
                        </Pressable>

                        <Pressable style={styles.menuItem} onPress={handleDocument}>
                            <View style={[styles.menuIcon, { backgroundColor: '#F59E0B' }]}>
                                <Ionicons name="document" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.menuText}>Ficheiro</Text>
                        </Pressable>

                        <Pressable style={styles.menuItem} onPress={handleGif}>
                            <View style={[styles.menuIcon, { backgroundColor: '#8B5CF6' }]}>
                                <Ionicons name="logo-youtube" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.menuText}>GIF</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Giphy Picker */}
            <GiphyPicker
                visible={showGiphy}
                onClose={() => setShowGiphy(false)}
                onSelect={handleGifSelect}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
    },
    menuButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.size.sm,
        color: colors.text.primary,
        maxHeight: 100,
        minHeight: 36,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.surfaceSubtle,
    },

    // Menu Modal
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        padding: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    menuItem: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    menuIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        fontWeight: typography.weight.medium,
    },
});
