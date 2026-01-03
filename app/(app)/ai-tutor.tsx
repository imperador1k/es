/**
 * 🤖 AI Study Assistant - ULTRA PREMIUM DESIGN
 * Experiência de chat futurista inspirada em ChatGPT/Claude
 * Escola+ App
 */

import { Message, useAI } from '@/hooks/useAI';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// QUICK PROMPTS
// ============================================

const QUICK_PROMPTS = [
    { emoji: '📚', label: 'Explica-me...', prompt: 'Explica-me de forma simples: ' },
    { emoji: '🧮', label: 'Resolve', prompt: 'Resolve este problema passo a passo: ' },
    { emoji: '📝', label: 'Resume', prompt: 'Resume o seguinte texto: ' },
    { emoji: '💡', label: 'Dica', prompt: 'Dá-me uma dica sobre: ' },
    { emoji: '🔍', label: 'Analisa', prompt: 'Analisa esta imagem e diz-me o que vês.' },
];

// ============================================
// TYPING INDICATOR
// ============================================

function TypingIndicator() {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (dot: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                ])
            ).start();
        };

        animate(dot1, 0);
        animate(dot2, 150);
        animate(dot3, 300);
    }, []);

    return (
        <View style={styles.typingContainer}>
            <View style={styles.typingAvatar}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.aiAvatarGradient}>
                    <Text style={styles.aiAvatarEmoji}>🤖</Text>
                </LinearGradient>
            </View>
            <View style={styles.typingBubble}>
                <View style={styles.dotsContainer}>
                    {[dot1, dot2, dot3].map((dot, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.typingDot,
                                { transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }] },
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.typingText}>A pensar...</Text>
            </View>
        </View>
    );
}

// ============================================
// MESSAGE BUBBLE - PREMIUM
// ============================================

interface MessageBubbleProps {
    message: Message;
    index: number;
    userName?: string;
}

function MessageBubble({ message, index, userName }: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    if (message.isLoading) return <TypingIndicator />;

    return (
        <Animated.View style={[
            styles.messageRow,
            isUser && styles.messageRowUser,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
        ]}>
            {/* AI Avatar */}
            {!isUser && (
                <View style={styles.avatarWrap}>
                    <LinearGradient
                        colors={isSystem ? ['#F59E0B', '#D97706'] : ['#6366F1', '#8B5CF6']}
                        style={styles.aiAvatarGradient}
                    >
                        <Text style={styles.aiAvatarEmoji}>{isSystem ? '⚠️' : '🤖'}</Text>
                    </LinearGradient>
                </View>
            )}

            {/* Message Content */}
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
                {/* Sender Label */}
                <Text style={[styles.senderLabel, isUser && styles.senderLabelUser]}>
                    {isUser ? (userName || 'Tu') : (isSystem ? 'Sistema' : 'AI Tutor')}
                </Text>

                {/* Image if present */}
                {message.imageUrl && (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: message.imageUrl }} style={styles.messageImage} />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)']} style={styles.imageOverlay} />
                    </View>
                )}

                {/* Text Content */}
                <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
                    {message.content}
                </Text>

                {/* Timestamp */}
                <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
                    {message.timestamp.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>

            {/* User Avatar */}
            {isUser && (
                <View style={styles.userAvatarWrap}>
                    <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.userAvatarGradient}>
                        <Text style={styles.userAvatarText}>{(userName || 'U').charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                </View>
            )}
        </Animated.View>
    );
}

// ============================================
// WELCOME SCREEN
// ============================================

function WelcomeScreen({ onQuickPrompt }: { onQuickPrompt: (prompt: string) => void }) {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            {/* Hero Icon */}
            <View style={styles.welcomeIconWrap}>
                <LinearGradient colors={['#6366F1', '#8B5CF6', '#A855F7']} style={styles.welcomeIconGradient}>
                    <Text style={styles.welcomeEmoji}>🤖</Text>
                </LinearGradient>
                <View style={styles.welcomeGlow} />
            </View>

            {/* Title */}
            <Text style={styles.welcomeTitle}>AI Study Assistant</Text>
            <Text style={styles.welcomeSubtitle}>
                Powered by Gemini AI ✨{'\n'}
                Pergunta qualquer coisa sobre os teus estudos!
            </Text>

            {/* Features */}
            <View style={styles.featuresRow}>
                <View style={styles.featureChip}>
                    <Text style={styles.featureEmoji}>📷</Text>
                    <Text style={styles.featureText}>Análise de imagens</Text>
                </View>
                <View style={styles.featureChip}>
                    <Text style={styles.featureEmoji}>💬</Text>
                    <Text style={styles.featureText}>Chat natural</Text>
                </View>
            </View>

            {/* Quick Prompts */}
            <Text style={styles.quickPromptsTitle}>Começa com:</Text>
            <View style={styles.quickPromptsGrid}>
                {QUICK_PROMPTS.map((item, index) => (
                    <Pressable
                        key={index}
                        style={styles.quickPromptCard}
                        onPress={() => onQuickPrompt(item.prompt)}
                    >
                        <Text style={styles.quickPromptEmoji}>{item.emoji}</Text>
                        <Text style={styles.quickPromptLabel}>{item.label}</Text>
                    </Pressable>
                ))}
            </View>
        </Animated.View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AITutorScreen() {
    const { messages, isLoading, sendMessage, clearChat } = useAI();
    const { profile } = useProfile();
    const { showAlert } = useAlert();
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<{ base64: string; uri: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }, []);

    // ============================================
    // IMAGE PICKER
    // ============================================

    const pickImage = useCallback(async (useCamera: boolean) => {
        try {
            const permission = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                showAlert({ title: 'Permissão necessária', message: 'Precisamos de acesso à câmara/galeria' });
                return;
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true })
                : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true });

            if (!result.canceled && result.assets[0]?.base64) {
                setSelectedImage({ base64: result.assets[0].base64, uri: result.assets[0].uri });
            }
        } catch {
            showAlert({ title: 'Erro', message: 'Não foi possível selecionar imagem' });
        }
    }, []);

    const showImageOptions = useCallback(() => {
        showAlert({
            title: '📸 Adicionar Imagem',
            message: 'Escolhe uma opção:',
            buttons: [
                { text: '📷 Câmara', onPress: () => pickImage(true) },
                { text: '🖼️ Galeria', onPress: () => pickImage(false) },
                { text: 'Cancelar', style: 'cancel' },
            ]
        });
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

    const handleQuickPrompt = (prompt: string) => {
        setInputText(prompt);
        inputRef.current?.focus();
    };

    const handleClearChat = () => {
        showAlert({
            title: '🗑️ Limpar Conversa',
            message: 'Tens a certeza que queres apagar toda a conversa?',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Limpar', style: 'destructive', onPress: clearChat },
            ]
        });
    };

    // ============================================
    // RENDER
    // ============================================

    const userName = profile?.full_name || profile?.username;

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={['rgba(99, 102, 241, 0.1)', 'transparent', 'rgba(139, 92, 246, 0.05)']}
                style={styles.backgroundGradient}
            />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Premium Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>

                    <View style={styles.headerCenter}>
                        <View style={styles.headerTitleRow}>
                            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.headerIcon}>
                                <Text style={styles.headerEmoji}>🤖</Text>
                            </LinearGradient>
                            <View>
                                <Text style={styles.headerTitle}>AI Tutor</Text>
                                <View style={styles.statusRow}>
                                    <View style={styles.onlineDot} />
                                    <Text style={styles.statusText}>Online • Gemini</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Pressable style={styles.menuButton} onPress={handleClearChat}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.text.secondary} />
                    </Pressable>
                </Animated.View>

                {/* Chat Messages */}
                {messages.length === 0 ? (
                    <WelcomeScreen onQuickPrompt={handleQuickPrompt} />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={[...messages].reverse()}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => (
                            <MessageBubble message={item} index={index} userName={userName ?? undefined} />
                        )}
                        inverted
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* Image Preview */}
                {selectedImage && (
                    <BlurView intensity={80} tint="dark" style={styles.imagePreviewOverlay}>
                        <View style={styles.imagePreviewCard}>
                            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                            <Pressable style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                                <Ionicons name="close-circle" size={28} color="#FFF" />
                            </Pressable>
                            <Text style={styles.imagePreviewText}>Imagem anexada</Text>
                        </View>
                    </BlurView>
                )}

                {/* Premium Input Bar */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
                    <View style={styles.inputWrapper}>
                        <View style={styles.inputContainer}>
                            {/* Attach Button */}
                            <Pressable style={styles.attachButton} onPress={showImageOptions}>
                                <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.attachGradient}>
                                    <Ionicons name="camera" size={18} color="#FFF" />
                                </LinearGradient>
                            </Pressable>

                            {/* Text Input */}
                            <TextInput
                                ref={inputRef}
                                style={styles.textInput}
                                placeholder="Pergunta qualquer coisa..."
                                placeholderTextColor={COLORS.text.tertiary}
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                maxLength={2000}
                                editable={!isLoading}
                            />

                            {/* Send Button */}
                            <Pressable
                                style={[styles.sendButton, (!inputText.trim() && !selectedImage) && styles.sendButtonDisabled]}
                                onPress={handleSend}
                                disabled={isLoading || (!inputText.trim() && !selectedImage)}
                            >
                                <LinearGradient
                                    colors={inputText.trim() || selectedImage ? ['#6366F1', '#4F46E5'] : [COLORS.surfaceMuted, COLORS.surfaceMuted]}
                                    style={styles.sendGradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Ionicons name="arrow-up" size={20} color={inputText.trim() || selectedImage ? '#FFF' : COLORS.text.tertiary} />
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </View>
                        <Text style={styles.disclaimerText}>
                            AI pode cometer erros. Verifica informação importante.
                        </Text>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    backgroundGradient: { ...StyleSheet.absoluteFillObject },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, marginLeft: SPACING.md },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerEmoji: { fontSize: 20 },
    headerTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
    statusText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
    menuButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    // Messages
    messagesList: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xl },
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.lg, gap: SPACING.sm },
    messageRowUser: { flexDirection: 'row-reverse' },
    avatarWrap: { marginBottom: 4 },
    aiAvatarGradient: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    aiAvatarEmoji: { fontSize: 18 },
    userAvatarWrap: { marginBottom: 4 },
    userAvatarGradient: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    userAvatarText: { fontSize: 16, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    messageBubble: { maxWidth: SCREEN_WIDTH * 0.75, padding: SPACING.md, borderRadius: RADIUS.xl, ...SHADOWS.sm },
    userBubble: { backgroundColor: '#6366F1', borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: COLORS.surfaceElevated, borderBottomLeftRadius: 4 },
    senderLabel: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.tertiary, marginBottom: 4 },
    senderLabelUser: { color: 'rgba(255,255,255,0.7)' },
    imageContainer: { marginBottom: SPACING.sm, borderRadius: RADIUS.lg, overflow: 'hidden' },
    messageImage: { width: 220, height: 180, borderRadius: RADIUS.lg },
    imageOverlay: { ...StyleSheet.absoluteFillObject },
    messageText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, lineHeight: 22 },
    messageTextUser: { color: '#FFF' },
    timestamp: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginTop: SPACING.xs, textAlign: 'right' },
    timestampUser: { color: 'rgba(255,255,255,0.6)' },

    // Typing
    typingContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.lg, gap: SPACING.sm, paddingHorizontal: SPACING.md },
    typingAvatar: { marginBottom: 4 },
    typingBubble: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, padding: SPACING.md, borderRadius: RADIUS.xl, borderBottomLeftRadius: 4 },
    dotsContainer: { flexDirection: 'row', gap: 4 },
    typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
    typingText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, fontStyle: 'italic' },

    // Welcome
    welcomeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
    welcomeIconWrap: { position: 'relative', marginBottom: SPACING.xl },
    welcomeIconGradient: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    welcomeEmoji: { fontSize: 48 },
    welcomeGlow: { position: 'absolute', top: -20, left: -20, right: -20, bottom: -20, borderRadius: 70, backgroundColor: 'rgba(99, 102, 241, 0.2)' },
    welcomeTitle: { fontSize: 28, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.sm },
    welcomeSubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 22 },
    featuresRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
    featureChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceElevated, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
    featureEmoji: { fontSize: 14 },
    featureText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
    quickPromptsTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.tertiary, marginTop: SPACING['2xl'], marginBottom: SPACING.md },
    quickPromptsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' },
    quickPromptCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceElevated, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
    quickPromptEmoji: { fontSize: 16 },
    quickPromptLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.primary },

    // Image Preview
    imagePreviewOverlay: { position: 'absolute', bottom: 80, left: SPACING.lg, borderRadius: RADIUS.xl, overflow: 'hidden' },
    imagePreviewCard: { padding: SPACING.sm },
    previewImage: { width: 80, height: 80, borderRadius: RADIUS.lg },
    removeImageBtn: { position: 'absolute', top: 0, right: 0 },
    imagePreviewText: { fontSize: TYPOGRAPHY.size.xs, color: '#FFF', textAlign: 'center', marginTop: 4 },

    // Input
    inputWrapper: { padding: SPACING.md, paddingBottom: SPACING.lg, backgroundColor: 'rgba(0,0,0,0.2)' },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.sm, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
    attachButton: { borderRadius: 18, overflow: 'hidden' },
    attachGradient: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    textInput: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, maxHeight: 120, minHeight: 36, paddingHorizontal: SPACING.sm },
    sendButton: { borderRadius: 18, overflow: 'hidden' },
    sendButtonDisabled: { opacity: 0.6 },
    sendGradient: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    disclaimerText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, textAlign: 'center', marginTop: SPACING.sm },
});
