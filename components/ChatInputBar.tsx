/**
 * ChatInputBar Component - PREMIUM DARK DESIGN
 * Rich input bar with attachments, GIFs, and @mention autocomplete
 */

import { GiphyPicker } from '@/components/GiphyPicker';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

// ============================================
// TYPES
// ============================================

export interface MentionableMember {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
}

interface ChatInputBarProps {
    onSend: (content: string, attachment?: {
        url: string;
        type: 'image' | 'video' | 'file' | 'gif';
        name?: string;
    }) => void;
    placeholder?: string;
    disabled?: boolean;
    // For @mentions
    teamId?: string;                    // If team channel, pass teamId
    members?: MentionableMember[];       // Pre-loaded members (optional optimization)
    dmRecipient?: MentionableMember;     // For DMs, just the other person
    showAllMention?: boolean;            // Show @all option (true for channels, false for DMs)
}

// ============================================
// MENTION AUTOCOMPLETE POPUP
// ============================================

interface MentionPopupProps {
    visible: boolean;
    members: MentionableMember[];
    showAll: boolean;
    searchQuery: string;
    onSelect: (mention: string, displayName: string) => void;
    onClose: () => void;
}

function MentionPopup({ visible, members, showAll, searchQuery, onSelect, onClose }: MentionPopupProps) {
    // Filter members based on search
    const filteredMembers = useMemo(() => {
        if (!searchQuery) return members;
        const query = searchQuery.toLowerCase();
        return members.filter(m =>
            m.username?.toLowerCase().includes(query) ||
            m.full_name?.toLowerCase().includes(query)
        );
    }, [members, searchQuery]);

    // Show @all at top if enabled and matches search
    const showAllOption = showAll && (!searchQuery || 'all'.includes(searchQuery.toLowerCase()));

    if (!visible || (filteredMembers.length === 0 && !showAllOption)) {
        return null;
    }

    return (
        <View style={mentionStyles.container}>
            <View style={mentionStyles.header}>
                <Text style={mentionStyles.headerTitle}>MEMBROS</Text>
            </View>
            <FlatList
                data={filteredMembers}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                style={mentionStyles.list}
                ListHeaderComponent={showAllOption ? (
                    <>
                        <Pressable
                            style={mentionStyles.item}
                            onPress={() => onSelect('@all', '@all')}
                        >
                            <View style={[mentionStyles.avatar, mentionStyles.allAvatar]}>
                                <Ionicons name="people" size={16} color="#FFF" />
                            </View>
                            <View style={mentionStyles.info}>
                                <Text style={mentionStyles.name}>@all</Text>
                                <Text style={mentionStyles.hint}>Notifica todos os membros</Text>
                            </View>
                        </Pressable>
                        <View style={mentionStyles.divider} />
                    </>
                ) : null}
                renderItem={({ item }) => (
                    <Pressable
                        style={mentionStyles.item}
                        onPress={() => onSelect(
                            `@${item.username || item.id}`,
                            item.full_name || item.username || 'Utilizador'
                        )}
                    >
                        {item.avatar_url ? (
                            <Image source={{ uri: item.avatar_url }} style={mentionStyles.avatar} />
                        ) : (
                            <View style={[mentionStyles.avatar, mentionStyles.avatarPlaceholder]}>
                                <Text style={mentionStyles.avatarText}>
                                    {(item.full_name || item.username || '?').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={mentionStyles.info}>
                            <Text style={mentionStyles.name}>
                                {item.full_name || item.username || 'Utilizador'}
                            </Text>
                            {item.username && (
                                <Text style={mentionStyles.username}>@{item.username}</Text>
                            )}
                        </View>
                    </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={mentionStyles.divider} />}
            />
        </View>
    );
}

const mentionStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: '100%',
        left: SPACING.md,
        right: SPACING.md,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        maxHeight: 250,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.tertiary,
        letterSpacing: 1,
    },
    list: {
        maxHeight: 200,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarPlaceholder: {
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    allAvatar: {
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    username: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    hint: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginLeft: 48,
    },
});

// ============================================
// MAIN COMPONENT
// ============================================

export function ChatInputBar({
    onSend,
    placeholder = 'Escreve uma mensagem...',
    disabled = false,
    teamId,
    members: propMembers,
    dmRecipient,
    showAllMention = true,
}: ChatInputBarProps) {
    const { user } = useAuthContext();
    const { showAlert } = useAlert();
    const [text, setText] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [showGiphy, setShowGiphy] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Mention state
    const [showMentionPopup, setShowMentionPopup] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
    const [teamMembers, setTeamMembers] = useState<MentionableMember[]>([]);

    // ============================================
    // LOAD TEAM MEMBERS
    // ============================================

    useEffect(() => {
        if (propMembers) {
            setTeamMembers(propMembers.filter(m => m.id !== user?.id));
            return;
        }

        if (dmRecipient) {
            setTeamMembers([dmRecipient]);
            return;
        }

        if (!teamId || !user?.id) return;

        const loadMembers = async () => {
            const { data, error } = await supabase
                .from('team_members')
                .select(`
                    user_id,
                    profiles!user_id (
                        id,
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('team_id', teamId)
                .neq('user_id', user.id);

            if (error) {
                console.error('Error loading team members:', error);
                return;
            }

            const members: MentionableMember[] = (data || [])
                .map((m: any) => {
                    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                    return p ? {
                        id: p.id,
                        username: p.username,
                        full_name: p.full_name,
                        avatar_url: p.avatar_url,
                    } : null;
                })
                .filter(Boolean) as MentionableMember[];

            setTeamMembers(members);
        };

        loadMembers();
    }, [teamId, user?.id, propMembers, dmRecipient]);

    // ============================================
    // MENTION DETECTION
    // ============================================

    const handleTextChange = useCallback((newText: string) => {
        setText(newText);

        // Detect @ symbol and trigger mention popup
        const lastAtIndex = newText.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            // Check if @ is at start or after a space
            const charBefore = lastAtIndex > 0 ? newText[lastAtIndex - 1] : ' ';
            if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
                const textAfterAt = newText.slice(lastAtIndex + 1);
                // Only show popup if there's no space after @
                if (!textAfterAt.includes(' ')) {
                    setShowMentionPopup(true);
                    setMentionSearch(textAfterAt);
                    setMentionStartIndex(lastAtIndex);
                    return;
                }
            }
        }

        setShowMentionPopup(false);
        setMentionSearch('');
        setMentionStartIndex(null);
    }, []);

    const handleMentionSelect = useCallback((mention: string, displayName: string) => {
        if (mentionStartIndex === null) return;

        // Replace the @search with the full mention
        const beforeMention = text.slice(0, mentionStartIndex);
        const afterMention = text.slice(mentionStartIndex + mentionSearch.length + 1);
        const newText = `${beforeMention}${mention} ${afterMention}`;

        setText(newText);
        setShowMentionPopup(false);
        setMentionSearch('');
        setMentionStartIndex(null);
    }, [text, mentionStartIndex, mentionSearch]);

    // ============================================
    // SEND & UPLOAD
    // ============================================

    const handleSend = () => {
        if (!text.trim() || disabled) return;
        onSend(text.trim());
        setText('');
        setShowMentionPopup(false);
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
            showAlert({ title: 'Permissão necessária', message: 'Precisamos de acesso à câmara' });
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
            else showAlert({ title: 'Erro', message: 'Não foi possível enviar a imagem' });
        }
    };

    const handleGallery = async () => {
        setShowMenu(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert({ title: 'Permissão necessária', message: 'Precisamos de acesso à galeria' });
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
            else showAlert({ title: 'Erro', message: 'Não foi possível enviar a imagem' });
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
                else showAlert({ title: 'Erro', message: 'Não foi possível enviar o ficheiro' });
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

    // ============================================
    // RENDER
    // ============================================

    return (
        <View style={styles.container}>
            {/* Mention Autocomplete Popup */}
            <MentionPopup
                visible={showMentionPopup}
                members={teamMembers}
                showAll={showAllMention && !dmRecipient}
                searchQuery={mentionSearch}
                onSelect={handleMentionSelect}
                onClose={() => setShowMentionPopup(false)}
            />

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
                        onChangeText={handleTextChange}
                        multiline
                        maxLength={1000}
                        editable={!disabled && !uploading}
                    />
                </View>

                {/* @ Mention Button */}
                <Pressable
                    style={styles.mentionButton}
                    onPress={() => {
                        const newText = text + '@';
                        handleTextChange(newText);
                    }}
                >
                    <Text style={styles.mentionText}>@</Text>
                </Pressable>

                {/* Emoji/GIF Button */}
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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        position: 'relative',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.xs,
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
    mentionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
    },
    mentionText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6366F1',
    },
    emojiButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiText: {
        fontSize: 20,
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
