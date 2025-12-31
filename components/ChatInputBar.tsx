/**
 * ChatInputBar Component - PREMIUM DARK DESIGN
 * Rich input bar with attachments and dark theme
 */

import { GiphyPicker } from '@/components/GiphyPicker';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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

    const handleSend = () => {
        if (!text.trim() || disabled) return;
        onSend(text.trim());
        setText('');
    };

    const uploadToStorage = async (uri: string, fileName: string, mimeType: string): Promise<string | null> => {
        if (!user?.id) return null;
        try {
            const base64Data = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const ext = fileName.split('.').pop() || 'jpg';
            const path = `${user.id}/${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('chat-files').upload(path, decode(base64Data), { contentType: mimeType, cacheControl: '3600' });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
            return urlData.publicUrl;
        } catch (err) {
            console.error('Upload error:', err);
            return null;
        }
    };

    const handleCamera = async () => {
        setShowMenu(false);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmara');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
        if (!result.canceled && result.assets[0]) {
            setUploading(true);
            const asset = result.assets[0];
            const fileName = asset.uri.split('/').pop() || 'photo.jpg';
            const url = await uploadToStorage(asset.uri, fileName, 'image/jpeg');
            setUploading(false);
            if (url) onSend('📷', { url, type: 'image', name: fileName });
            else Alert.alert('Erro', 'Não foi possível enviar a imagem');
        }
    };

    const handleGallery = async () => {
        setShowMenu(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: false });
        if (!result.canceled && result.assets[0]) {
            setUploading(true);
            const asset = result.assets[0];
            const fileName = asset.uri.split('/').pop() || 'image.jpg';
            const mimeType = asset.mimeType || 'image/jpeg';
            const url = await uploadToStorage(asset.uri, fileName, mimeType);
            setUploading(false);
            if (url) onSend('📷', { url, type: 'image', name: fileName });
            else Alert.alert('Erro', 'Não foi possível enviar a imagem');
        }
    };

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
                if (url) onSend('📎', { url, type: 'file', name: asset.name });
                else Alert.alert('Erro', 'Não foi possível enviar o ficheiro');
            }
        } catch (err) {
            console.error('Document picker error:', err);
            setUploading(false);
        }
    };

    const handleGifSelect = (gifUrl: string) => {
        onSend('🎬', { url: gifUrl, type: 'gif' });
    };

    const handleGif = () => {
        setShowMenu(false);
        setShowGiphy(true);
    };

    const canSend = text.trim() && !disabled;

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                {/* Attach Button */}
                <Pressable
                    style={styles.actionButton}
                    onPress={() => setShowMenu(true)}
                    disabled={disabled || uploading}
                >
                    {uploading ? (
                        <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.actionGradient}>
                            <Ionicons name="add" size={20} color="#FFF" />
                        </LinearGradient>
                    )}
                </Pressable>

                {/* Text Input */}
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor={COLORS.text.tertiary}
                        value={text}
                        onChangeText={setText}
                        multiline
                        maxLength={1000}
                        editable={!disabled && !uploading}
                    />
                </View>

                {/* Emoji Button */}
                <Pressable style={styles.emojiButton} onPress={handleGif}>
                    <Text style={styles.emojiText}>😀</Text>
                </Pressable>

                {/* Send Button */}
                <Pressable
                    style={styles.sendButton}
                    onPress={handleSend}
                    disabled={!canSend || uploading}
                >
                    <LinearGradient
                        colors={canSend ? ['#6366F1', '#4F46E5'] : [COLORS.surfaceMuted, COLORS.surfaceMuted]}
                        style={styles.sendGradient}
                    >
                        <Ionicons name="arrow-up" size={18} color={canSend ? '#FFF' : COLORS.text.tertiary} />
                    </LinearGradient>
                </Pressable>
            </View>

            {/* Attachment Menu Modal */}
            <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
                <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
                    <View style={styles.menuContainer}>
                        <View style={styles.menuHandle} />
                        <Text style={styles.menuTitle}>Anexar</Text>

                        <View style={styles.menuGrid}>
                            <Pressable style={styles.menuItem} onPress={handleCamera}>
                                <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.menuIcon}>
                                    <Ionicons name="camera" size={24} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.menuText}>Câmara</Text>
                            </Pressable>

                            <Pressable style={styles.menuItem} onPress={handleGallery}>
                                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.menuIcon}>
                                    <Ionicons name="images" size={24} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.menuText}>Galeria</Text>
                            </Pressable>

                            <Pressable style={styles.menuItem} onPress={handleDocument}>
                                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.menuIcon}>
                                    <Ionicons name="document" size={24} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.menuText}>Ficheiro</Text>
                            </Pressable>

                            <Pressable style={styles.menuItem} onPress={handleGif}>
                                <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.menuIcon}>
                                    <Text style={styles.gifText}>GIF</Text>
                                </LinearGradient>
                                <Text style={styles.menuText}>GIF</Text>
                            </Pressable>
                        </View>

                        <Pressable style={styles.cancelButton} onPress={() => setShowMenu(false)}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Giphy Picker */}
            <GiphyPicker visible={showGiphy} onClose={() => setShowGiphy(false)} onSelect={handleGifSelect} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.sm,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS['2xl'],
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.15)',
    },
    actionButton: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    actionGradient: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputWrapper: {
        flex: 1,
    },
    input: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        maxHeight: 100,
        minHeight: 36,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
    },
    emojiButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiText: {
        fontSize: 22,
    },
    sendButton: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    sendGradient: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Menu
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: COLORS.surfaceElevated,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.md,
        paddingBottom: SPACING['2xl'],
    },
    menuHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.text.tertiary,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: SPACING.lg,
        opacity: 0.5,
    },
    menuTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    menuGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: SPACING.xl,
    },
    menuItem: {
        alignItems: 'center',
        gap: SPACING.sm,
    },
    menuIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    gifText: {
        fontSize: 14,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    cancelButton: {
        backgroundColor: COLORS.surfaceMuted,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
});
