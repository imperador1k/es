import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { BlockedUser, getBlockedUsers, unblockUser } from '@/services/userService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedUsersScreen() {
    const [stats, setStats] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { showAlert } = useAlert();

    const loadBlocked = async () => {
        try {
            setLoading(true);
            const data = await getBlockedUsers();
            setStats(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBlocked();
    }, []);

    const handleUnblock = (block: BlockedUser) => {
        showAlert({
            title: 'Desbloquear',
            message: `Queres desbloquear ${block.profile?.full_name || 'este utilizador'}?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desbloquear',
                    onPress: async () => {
                        try {
                            await unblockUser(block.id);
                            setStats(prev => prev.filter(b => b.id !== block.id));
                            showAlert({ title: 'Sucesso', message: 'Utilizador desbloqueado.' });
                        } catch (error) {
                            showAlert({ title: 'Erro', message: 'Não foi possível desbloquear.' });
                        }
                    }
                }
            ]
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Utilizadores Bloqueados</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.accent.primary} />
                </View>
            ) : (
                <FlatList
                    data={stats}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.text.tertiary} />
                            <Text style={styles.emptyText}>Não tens utilizadores bloqueados.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.userCard}>
                            <View style={styles.userInfo}>
                                {item.profile?.avatar_url ? (
                                    <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarInitial}>
                                            {(item.profile?.username?.[0] || '?').toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View>
                                    <Text style={styles.userName}>{item.profile?.full_name || 'Utilizador'}</Text>
                                    <Text style={styles.userHandle}>@{item.profile?.username || 'user'}</Text>
                                </View>
                            </View>
                            <Pressable style={styles.unblockBtn} onPress={() => handleUnblock(item)}>
                                <Text style={styles.unblockText}>Desbloquear</Text>
                            </Pressable>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: SPACING.lg,
        gap: SPACING.md,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: SPACING['4xl'],
        gap: SPACING.md,
    },
    emptyText: {
        color: COLORS.text.tertiary,
        fontSize: TYPOGRAPHY.size.base,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.weight.bold,
    },
    userName: {
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.weight.medium,
        fontSize: TYPOGRAPHY.size.sm,
    },
    userHandle: {
        color: COLORS.text.tertiary,
        fontSize: 12,
    },
    unblockBtn: {
        backgroundColor: COLORS.surfaceElevated,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.text.tertiary,
    },
    unblockText: {
        fontSize: 12,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
});
