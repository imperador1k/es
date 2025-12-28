/**
 * AI Study Assistant Page
 * Chat interface with Gemini AI
 */

import { Message, useAI } from '@/hooks/useAI';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================

function MessageBubble({ message }: { message: Message }) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
        <View style={[
            styles.bubbleContainer,
            isUser ? styles.bubbleContainerRight : styles.bubbleContainerLeft,
        ]}>
            {/* Avatar */}
            {!isUser && (
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarEmoji}>
                        {isSystem ? '⚠️' : '🤖'}
                    </Text>
                </View>
            )}

            {/* Bubble */}
            <View style={[
                styles.bubble,
                isUser ? styles.bubbleUser : (isSystem ? styles.bubbleSystem : styles.bubbleAI),
                message.isLoading && styles.bubbleLoading,
            ]}>
                {/* Image if present */}
                {message.imageUrl && (
                    <Image
                        source={{ uri: message.imageUrl }}
                        style={styles.messageImage}
                        resizeMode="cover"
                    />
                )}

                {/* Text content */}
                {message.isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.accent.primary} />
                        <Text style={styles.loadingText}>A pensar...</Text>
                    </View>
                ) : (
                    <Text style={[
                        styles.bubbleText,
                        isUser && styles.bubbleTextUser,
                    ]}>
                        {message.content}
                    </Text>
                )}

                {/* Timestamp */}
                <Text style={[
                    styles.timestamp,
                    isUser && styles.timestampUser,
                ]}>
                    {message.timestamp.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AITutorScreen() {
    const { messages, isLoading, sendMessage, clearChat } = useAI();
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<{ base64: string; uri: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // ============================================
    // PICK IMAGE
    // ============================================

    const pickImage = useCallback(async (useCamera: boolean) => {
        try {
            const permission = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert('Permissão necessária', 'Precisamos de acesso à câmara/galeria');
                return;
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.7,
                    base64: true,
                })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.7,
                    base64: true,
                });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.base64) {
                    setSelectedImage({
                        base64: asset.base64,
                        uri: asset.uri,
                    });
                }
            }
        } catch (err) {
            console.error('Image picker error:', err);
            Alert.alert('Erro', 'Não foi possível selecionar imagem');
        }
    }, []);

    const showImageOptions = useCallback(() => {
        Alert.alert(
            'Anexar Imagem',
            'Escolhe uma opção',
            [
                { text: 'Câmara 📷', onPress: () => pickImage(true) },
                { text: 'Galeria 🖼️', onPress: () => pickImage(false) },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    }, [pickImage]);

    // ============================================
    // SEND MESSAGE
    // ============================================

    const handleSend = useCallback(async () => {
        if (!inputText.trim() && !selectedImage) return;

        const prompt = inputText.trim() || 'O que vês nesta imagem? Explica-me.';

        await sendMessage({
            prompt,
            imageBase64: selectedImage?.base64,
            mimeType: 'image/jpeg',
        });

        setInputText('');
        setSelectedImage(null);
        Keyboard.dismiss();
    }, [inputText, selectedImage, sendMessage]);

    // ============================================
    // RENDER
    // ============================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>🤖 AI Study Assistant</Text>
                    <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
                </View>
                <Pressable style={styles.clearButton} onPress={clearChat}>
                    <Ionicons name="trash-outline" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Chat Messages */}
            <FlatList
                ref={flatListRef}
                data={[...messages].reverse()}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <MessageBubble message={item} />}
                inverted
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
            />

            {/* Selected Image Preview */}
            {selectedImage && (
                <View style={styles.imagePreview}>
                    <Image
                        source={{ uri: selectedImage.uri }}
                        style={styles.previewImage}
                    />
                    <Pressable
                        style={styles.removeImageBtn}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Ionicons name="close-circle" size={24} color="#FFF" />
                    </Pressable>
                </View>
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={10}
            >
                <View style={styles.inputContainer}>
                    {/* Attach Button */}
                    <Pressable style={styles.attachButton} onPress={showImageOptions}>
                        <Ionicons name="attach" size={24} color={colors.text.tertiary} />
                    </Pressable>

                    {/* Text Input */}
                    <TextInput
                        style={styles.textInput}
                        placeholder="Escreve a tua dúvida..."
                        placeholderTextColor={colors.text.tertiary}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={1000}
                        editable={!isLoading}
                    />

                    {/* Send Button */}
                    <Pressable
                        style={[styles.sendButton, (!inputText.trim() && !selectedImage) && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={isLoading || (!inputText.trim() && !selectedImage)}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons name="send" size={20} color="#FFF" />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: colors.surface,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    clearButton: {
        padding: spacing.sm,
    },

    // Messages List
    messagesList: {
        padding: spacing.md,
        paddingBottom: spacing.xl,
    },

    // Bubble
    bubbleContainer: {
        flexDirection: 'row',
        marginBottom: spacing.md,
        maxWidth: '85%',
    },
    bubbleContainerLeft: {
        alignSelf: 'flex-start',
    },
    bubbleContainerRight: {
        alignSelf: 'flex-end',
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.xs,
        alignSelf: 'flex-end',
    },
    avatarEmoji: {
        fontSize: 18,
    },
    bubble: {
        borderRadius: borderRadius.xl,
        padding: spacing.md,
        ...shadows.sm,
    },
    bubbleUser: {
        backgroundColor: colors.accent.primary,
        borderBottomRightRadius: 4,
    },
    bubbleAI: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 4,
    },
    bubbleSystem: {
        backgroundColor: '#FEF3C7',
        borderBottomLeftRadius: 4,
    },
    bubbleLoading: {
        backgroundColor: colors.surface,
    },
    bubbleText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        lineHeight: 22,
    },
    bubbleTextUser: {
        color: '#FFF',
    },
    timestamp: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
        textAlign: 'right',
    },
    timestampUser: {
        color: 'rgba(255,255,255,0.7)',
    },

    // Loading
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        fontStyle: 'italic',
    },

    // Message Image
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    },

    // Image Preview
    imagePreview: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.md,
    },
    removeImageBtn: {
        position: 'absolute',
        top: spacing.sm,
        left: 70,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
    },

    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        gap: spacing.sm,
    },
    attachButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textInput: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.size.base,
        color: colors.text.primary,
        maxHeight: 100,
        minHeight: 44,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
