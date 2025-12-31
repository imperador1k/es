/**
 * 🔍 Search Friends Screen - PREMIUM REDESIGN
 * Modern search experience with animations
 */

import { useStartConversation } from '@/hooks/useDMs';
import { useFriends, useSearchUsers } from '@/hooks/useFriends';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Profile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// USER RESULT CARD
// ============================================

function UserCard({ user, isFriend, sending, onAdd, onMessage, index }: {
    user: Profile;
    isFriend: boolean;
    sending: boolean;
    onAdd: () => void;
    onMessage: () => void;
    index: number;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useState(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            delay: index * 80,
            useNativeDriver: true,
        }).start();
    });

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Pressable
                style={styles.userCard}
                onPress={() => router.push(`/public-profile/${user.id}` as any)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {/* Avatar */}
                {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatar}>
                        <Text style={styles.avatarInitial}>
                            {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                )}

                {/* Content */}
                <View style={styles.userContent}>
                    <View style={styles.userNameRow}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user.full_name || user.username}
                        </Text>
                        {isFriend && (
                            <View style={styles.friendBadge}>
                                <Ionicons name="checkmark" size={10} color="#10B981" />
                                <Text style={styles.friendBadgeText}>Amigo</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userUsername}>@{user.username || 'utilizador'}</Text>
                </View>

                {/* Action Button */}
                {isFriend ? (
                    <Pressable style={styles.messageBtn} onPress={onMessage}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.actionBtnGradient}>
                            <Ionicons name="chatbubble" size={16} color="#FFF" />
                        </LinearGradient>
                    </Pressable>
                ) : (
                    <Pressable
                        style={[styles.addBtn, sending && styles.addBtnDisabled]}
                        onPress={onAdd}
                        disabled={sending}
                    >
                        {sending ? (
                            <View style={styles.actionBtnLoading}>
                                <ActivityIndicator size="small" color="#6366F1" />
                            </View>
                        ) : (
                            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.actionBtnGradient}>
                                <Ionicons name="person-add" size={16} color="#FFF" />
                            </LinearGradient>
                        )}
                    </Pressable>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SearchFriendsScreen() {
    const { results, searching, search, clear } = useSearchUsers();
    const { sendFriendRequest, friends } = useFriends();
    const { startOrGetConversation } = useStartConversation();
    const [query, setQuery] = useState('');
    const [sending, setSending] = useState<string | null>(null);
    const headerAnim = useRef(new Animated.Value(0)).current;
    const searchAnim = useRef(new Animated.Value(0)).current;

    useState(() => {
        Animated.stagger(100, [
            Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(searchAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    });

    const handleSearch = (text: string) => {
        setQuery(text);
        search(text);
    };

    const handleAddFriend = async (userId: string) => {
        setSending(userId);
        const success = await sendFriendRequest(userId);
        setSending(null);
        if (success) {
            Alert.alert('✅ Pedido Enviado!', 'O teu pedido de amizade foi enviado.');
        } else {
            Alert.alert('Aviso', 'Já existe um pedido ou amizade com este utilizador.');
        }
    };

    const handleMessage = async (userId: string) => {
        const convId = await startOrGetConversation(userId);
        if (convId) {
            router.push(`/dm/${convId}` as any);
        }
    };

    const isFriend = (userId: string) => friends.some(f => f.friend_id === userId);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Premium Header */}
                <Animated.View style={[styles.header, {
                    opacity: headerAnim,
                    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
                }]}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerEmoji}>🔍</Text>
                        <Text style={styles.headerTitle}>Procurar</Text>
                    </View>

                    <Pressable style={styles.qrBtn} onPress={() => router.push('/qr-scanner' as any)}>
                        <Ionicons name="qr-code" size={20} color="#6366F1" />
                    </Pressable>
                </Animated.View>

                {/* Search Input */}
                <Animated.View style={[styles.searchSection, {
                    opacity: searchAnim,
                    transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                }]}>
                    <View style={styles.searchInputWrap}>
                        <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Nome ou @username..."
                            placeholderTextColor={COLORS.text.tertiary}
                            value={query}
                            onChangeText={handleSearch}
                            autoFocus
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <Pressable
                                style={styles.clearBtn}
                                onPress={() => { setQuery(''); clear(); }}
                            >
                                <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
                            </Pressable>
                        )}
                    </View>
                </Animated.View>

                {/* Results */}
                {searching ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text style={styles.loadingText}>A procurar...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => (
                            <UserCard
                                user={item}
                                index={index}
                                isFriend={isFriend(item.id)}
                                sending={sending === item.id}
                                onAdd={() => handleAddFriend(item.id)}
                                onMessage={() => handleMessage(item.id)}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            query.length > 0 ? (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconWrap}>
                                        <Ionicons name="search" size={48} color={COLORS.text.tertiary} />
                                    </View>
                                    <Text style={styles.emptyTitle}>Sem resultados</Text>
                                    <Text style={styles.emptySubtitle}>Tenta outro nome ou username</Text>
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconWrap}>
                                        <LinearGradient colors={['#6366F120', '#8B5CF620']} style={styles.emptyIconBg}>
                                            <Ionicons name="person-add" size={48} color="#6366F1" />
                                        </LinearGradient>
                                    </View>
                                    <Text style={styles.emptyTitle}>Encontra amigos</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Escreve o nome ou @username de{'\n'}alguém para adicionar
                                    </Text>
                                </View>
                            )
                        }
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

// ============================================
// STYLES - Premium Design
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginLeft: SPACING.md },
    headerEmoji: { fontSize: 24 },
    headerTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    qrBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },

    // Search
    searchSection: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
    searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm, ...SHADOWS.sm },
    searchInput: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, paddingVertical: SPACING.xs },
    clearBtn: { padding: 4 },

    // List
    listContent: { paddingHorizontal: SPACING.md, paddingBottom: 120, flexGrow: 1 },

    // User Card
    userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    userContent: { flex: 1, marginLeft: SPACING.md },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    userName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary, flex: 1 },
    userUsername: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    friendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
    friendBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: '#10B981' },

    // Action Buttons
    messageBtn: { borderRadius: 20, overflow: 'hidden' },
    addBtn: { borderRadius: 20, overflow: 'hidden' },
    addBtnDisabled: { opacity: 0.7 },
    actionBtnGradient: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    actionBtnLoading: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: 20 },

    // Empty State
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: SPACING['4xl'] },
    emptyIconWrap: { marginBottom: SPACING.lg },
    emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary, marginBottom: SPACING.xs },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 22 },
});
