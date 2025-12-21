import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Team, TeamWithMemberCount } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Squad colors
const SQUAD_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6'];

export default function TeamsScreen() {
    const { user } = useAuthContext();
    const [teams, setTeams] = useState<TeamWithMemberCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');

    // Load teams
    const loadTeams = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: memberData } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id);

            if (!memberData?.length) {
                setTeams([]);
                return;
            }

            const teamIds = memberData.map(m => m.team_id);
            const { data: teamsData } = await supabase
                .from('teams')
                .select('*')
                .in('id', teamIds);

            const withCounts: TeamWithMemberCount[] = await Promise.all(
                (teamsData || []).map(async (team: Team) => {
                    const { count } = await supabase
                        .from('team_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('team_id', team.id);
                    return { ...team, member_count: count || 1 };
                })
            );
            setTeams(withCounts);
        } catch (err) {
            console.error(err);
        }
    }, [user?.id]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await loadTeams();
            setLoading(false);
        };
        load();
    }, [loadTeams]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadTeams();
        setRefreshing(false);
    };

    // Create team
    const handleCreateTeam = async () => {
        if (!user?.id || !newName.trim()) {
            Alert.alert('Erro', 'Nome é obrigatório');
            return;
        }
        try {
            setCreating(true);
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .insert({
                    name: newName.trim(),
                    description: newDescription.trim() || null,
                    owner_id: user.id,
                    color: SQUAD_COLORS[Math.floor(Math.random() * SQUAD_COLORS.length)],
                })
                .select()
                .single();

            if (teamError) throw teamError;

            await supabase.from('team_members').insert({
                team_id: teamData.id,
                user_id: user.id,
                role: 'owner',
            });

            setTeams(prev => [{ ...teamData, member_count: 1 }, ...prev]);
            setModalVisible(false);
            setNewName('');
            setNewDescription('');
            Alert.alert('🎉 Squad Criada!', `"${teamData.name}" está pronta!`);
        } catch (err) {
            Alert.alert('Erro', 'Não foi possível criar');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
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
                <View>
                    <Text style={styles.title}>Minhas Squads</Text>
                    <Text style={styles.subtitle}>{teams.length} squads</Text>
                </View>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={24} color={colors.text.inverse} />
                </Pressable>
            </View>

            {/* List */}
            <FlatList
                data={teams}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <SquadCard team={item} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<EmptyState onPress={() => setModalVisible(true)} />}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                showsVerticalScrollIndicator={false}
            />

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nova Squad</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.tertiary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Nome da Squad</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Turma 12ºA"
                                placeholderTextColor={colors.text.tertiary}
                                value={newName}
                                onChangeText={setNewName}
                            />

                            <Text style={styles.inputLabel}>Descrição (opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Descreve a squad..."
                                placeholderTextColor={colors.text.tertiary}
                                value={newDescription}
                                onChangeText={setNewDescription}
                                multiline
                            />

                            <Pressable style={styles.submitButton} onPress={handleCreateTeam} disabled={creating}>
                                {creating ? (
                                    <ActivityIndicator color={colors.text.inverse} />
                                ) : (
                                    <Text style={styles.submitText}>Criar Squad</Text>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

// ============================================
// SUB COMPONENTS
// ============================================
function SquadCard({ team }: { team: TeamWithMemberCount }) {
    const color = team.color || SQUAD_COLORS[0];
    const initial = team.name.charAt(0).toUpperCase();

    return (
        <Pressable style={styles.squadCard} onPress={() => router.push(`/team/${team.id}` as any)}>
            {/* Avatar */}
            <View style={[styles.squadAvatar, { backgroundColor: `${color}20` }]}>
                <Text style={[styles.squadInitial, { color }]}>{initial}</Text>
            </View>

            {/* Content */}
            <View style={styles.squadContent}>
                <Text style={styles.squadName}>{team.name}</Text>
                {team.description && (
                    <Text style={styles.squadDescription} numberOfLines={1}>{team.description}</Text>
                )}
                <View style={styles.squadMeta}>
                    <Ionicons name="people" size={14} color={colors.text.tertiary} />
                    <Text style={styles.squadMembers}>
                        {team.member_count} {team.member_count === 1 ? 'membro' : 'membros'}
                    </Text>
                </View>
            </View>

            {/* Arrow */}
            <View style={styles.squadArrow}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </View>
        </Pressable>
    );
}

function EmptyState({ onPress }: { onPress: () => void }) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={48} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem squads</Text>
            <Text style={styles.emptySubtitle}>Cria uma squad para colaborar com colegas!</Text>
            <Pressable style={styles.emptyButton} onPress={onPress}>
                <Text style={styles.emptyButtonText}>Criar Squad</Text>
            </Pressable>
        </View>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
        flexGrow: 1,
    },

    // Squad Card
    squadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },
    squadAvatar: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.lg,
    },
    squadInitial: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    squadContent: {
        flex: 1,
    },
    squadName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    squadDescription: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    squadMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    squadMembers: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    squadArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
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

    // Modal
    modalWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        padding: spacing.xl,
        paddingBottom: spacing['4xl'],
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },

    // Inputs
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    input: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Submit
    submitButton: {
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
        ...shadows.md,
    },
    submitText: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
});
