import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { Channel, Team } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CHANNEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    text: 'chatbubble-outline',
    voice: 'mic-outline',
    announcements: 'megaphone-outline',
};

export default function TeamDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadTeamData() {
            if (!id) {
                setError('ID não encontrado');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const { data: teamData, error: teamError } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('id', id)
                    .single();
                if (teamError) throw teamError;
                setTeam(teamData as Team);

                const { data: channelsData } = await supabase
                    .from('channels')
                    .select('*')
                    .eq('team_id', id)
                    .order('created_at', { ascending: true });
                setChannels((channelsData as Channel[]) || []);
            } catch (err) {
                setError('Squad não encontrada');
            } finally {
                setLoading(false);
            }
        }
        loadTeamData();
    }, [id]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !team) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                        <Ionicons name="alert-circle" size={40} color={colors.danger.primary} />
                    </View>
                    <Text style={styles.errorTitle}>{error || 'Erro'}</Text>
                    <Pressable style={styles.errorButton} onPress={() => router.back()}>
                        <Text style={styles.errorButtonText}>Voltar</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const teamColor = team.color || colors.accent.primary;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={[styles.teamAvatar, { backgroundColor: `${teamColor}20` }]}>
                    <Text style={[styles.teamInitial, { color: teamColor }]}>
                        {team.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    {team.description && (
                        <Text style={styles.teamDescription} numberOfLines={1}>{team.description}</Text>
                    )}
                </View>
                <Pressable style={styles.menuButton}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Ionicons name="people" size={16} color={colors.text.tertiary} />
                    <Text style={styles.statText}>Membros</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="chatbubbles" size={16} color={colors.text.tertiary} />
                    <Text style={styles.statText}>{channels.length} canais</Text>
                </View>
            </View>

            {/* Channels Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Canais</Text>
                <Pressable style={styles.addChannelButton}>
                    <Ionicons name="add" size={18} color={colors.accent.primary} />
                </Pressable>
            </View>

            {/* Channels List */}
            <FlatList
                data={channels}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ChannelCard channel={item} />}
                contentContainerStyle={styles.channelsList}
                ListEmptyComponent={<EmptyChannels />}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

function ChannelCard({ channel }: { channel: Channel }) {
    const icon = CHANNEL_ICONS[channel.type] || 'chatbubble-outline';
    return (
        <Pressable style={styles.channelCard} onPress={() => router.push(`/channel/${channel.id}` as any)}>
            <View style={styles.channelIcon}>
                {channel.type === 'text' ? (
                    <Text style={styles.channelHash}>#</Text>
                ) : (
                    <Ionicons name={icon} size={16} color={colors.text.tertiary} />
                )}
            </View>
            <View style={styles.channelContent}>
                <Text style={styles.channelName}>{channel.name}</Text>
                {channel.description && (
                    <Text style={styles.channelDescription} numberOfLines={1}>{channel.description}</Text>
                )}
            </View>
            {channel.is_private && (
                <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} />
            )}
            <View style={styles.channelArrow}>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </View>
        </Pressable>
    );
}

function EmptyChannels() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem canais</Text>
            <Text style={styles.emptySubtitle}>Esta squad ainda não tem canais.</Text>
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
    teamAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.xs,
        marginRight: spacing.md,
    },
    teamInitial: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
    },
    headerContent: {
        flex: 1,
    },
    teamName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    teamDescription: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 1,
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        gap: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Section
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    addChannelButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Channels List
    channelsList: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing['3xl'],
        flexGrow: 1,
    },
    channelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    channelIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    channelHash: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
    },
    channelContent: {
        flex: 1,
    },
    channelName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    channelDescription: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    channelArrow: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['5xl'],
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Error
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
    },
    errorIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.danger.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    errorTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xl,
    },
    errorButton: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    errorButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
});
