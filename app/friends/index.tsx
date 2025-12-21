import { useStartConversation } from '@/hooks/useDMs';
import { useFriends } from '@/hooks/useFriends';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { FriendWithProfile } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FriendsScreen() {
    const { friends, loading, refetch, removeFriend } = useFriends();
    const { startOrGetConversation } = useStartConversation();
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleMessage = async (friendId: string) => {
        const conversationId = await startOrGetConversation(friendId);
        if (conversationId) {
            router.push(`/dm/${conversationId}` as any);
        }
    };

    const handleRemove = (friend: FriendWithProfile) => {
        Alert.alert(
            'Remover Amigo',
            `Tens a certeza que queres remover ${friend.profile.full_name || friend.profile.username}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => removeFriend(friend.friendship_id) },
            ]
        );
    };

    if (loading && friends.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.title}>Amigos</Text>
                <Pressable style={styles.addButton} onPress={() => router.push('/friends/search' as any)}>
                    <Ionicons name="person-add" size={20} color={colors.accent.primary} />
                </Pressable>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <Text style={styles.statsText}>{friends.length} amigos</Text>
            </View>

            {/* List */}
            <FlatList
                data={friends}
                keyExtractor={(item) => item.friendship_id}
                renderItem={({ item }) => (
                    <FriendCard
                        friend={item}
                        onMessage={() => handleMessage(item.friend_id)}
                        onRemove={() => handleRemove(item)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<EmptyFriends />}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent.primary} />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

function FriendCard({ friend, onMessage, onRemove }: {
    friend: FriendWithProfile;
    onMessage: () => void;
    onRemove: () => void;
}) {
    const { profile } = friend;

    return (
        <Pressable style={styles.friendCard} onPress={() => router.push(`/user/${profile.id}` as any)}>
            {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                        {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}

            <View style={styles.friendContent}>
                <Text style={styles.friendName}>{profile.full_name || profile.username}</Text>
                <Text style={styles.friendUsername}>@{profile.username || 'utilizador'}</Text>
            </View>

            <View style={styles.friendActions}>
                <Pressable style={styles.messageButton} onPress={onMessage}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.accent.primary} />
                </Pressable>
                <Pressable style={styles.removeButton} onPress={onRemove}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.tertiary} />
                </Pressable>
            </View>
        </Pressable>
    );
}

function EmptyFriends() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem amigos</Text>
            <Text style={styles.emptySubtitle}>Adiciona amigos para começar a colaborar!</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/friends/search' as any)}>
                <Text style={styles.emptyButtonText}>Procurar Amigos</Text>
            </Pressable>
        </View>
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Stats
    statsRow: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    statsText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: 120,
        flexGrow: 1,
    },

    // Friend Card
    friendCard: {
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
    friendContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    friendName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    friendUsername: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    friendActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    messageButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['3xl'],
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
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    emptyButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    emptyButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
});
