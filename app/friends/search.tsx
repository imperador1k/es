import { useStartConversation } from '@/hooks/useDMs';
import { useFriends, useSearchUsers } from '@/hooks/useFriends';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Profile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchFriendsScreen() {
    const { results, searching, search, clear } = useSearchUsers();
    const { sendFriendRequest, friends } = useFriends();
    const { startOrGetConversation } = useStartConversation();
    const [query, setQuery] = useState('');
    const [sending, setSending] = useState<string | null>(null);

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

    // Verificar se já é amigo
    const isFriend = (userId: string) => friends.some(f => f.friend_id === userId);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.title}>Procurar</Text>
                <Pressable style={styles.qrButton} onPress={() => router.push('/qr-scanner' as any)}>
                    <Ionicons name="qr-code" size={20} color={colors.accent.primary} />
                </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color={colors.text.tertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Procurar por nome ou @username..."
                        placeholderTextColor={colors.text.tertiary}
                        value={query}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {query.length > 0 && (
                        <Pressable onPress={() => { setQuery(''); clear(); }}>
                            <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Results */}
            {searching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <UserCard
                            user={item}
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
                                <Ionicons name="search-outline" size={48} color={colors.text.tertiary} />
                                <Text style={styles.emptyTitle}>Sem resultados</Text>
                                <Text style={styles.emptySubtitle}>Tenta outro nome ou username</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="person-add-outline" size={40} color={colors.accent.primary} />
                                </View>
                                <Text style={styles.emptyTitle}>Procura amigos</Text>
                                <Text style={styles.emptySubtitle}>Escreve o nome ou @username de alguém</Text>
                            </View>
                        )
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

function UserCard({ user, isFriend, sending, onAdd, onMessage }: {
    user: Profile;
    isFriend: boolean;
    sending: boolean;
    onAdd: () => void;
    onMessage: () => void;
}) {
    return (
        <Pressable style={styles.userCard} onPress={() => router.push(`/user/${user.id}` as any)}>
            {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                        {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}

            <View style={styles.userContent}>
                <Text style={styles.userName}>{user.full_name || user.username}</Text>
                <Text style={styles.userUsername}>@{user.username || 'utilizador'}</Text>
            </View>

            {isFriend ? (
                <Pressable style={styles.messageButton} onPress={onMessage}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.accent.primary} />
                </Pressable>
            ) : (
                <Pressable
                    style={[styles.addButton, sending && styles.addButtonDisabled]}
                    onPress={onAdd}
                    disabled={sending}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color={colors.text.inverse} />
                    ) : (
                        <Ionicons name="person-add" size={18} color={colors.text.inverse} />
                    )}
                </Pressable>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    qrButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Search
    searchContainer: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
        ...shadows.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
        flexGrow: 1,
    },

    // User Card
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    userContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    userName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    userUsername: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    addButtonDisabled: {
        opacity: 0.7,
    },
    messageButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing['5xl'],
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },
});
