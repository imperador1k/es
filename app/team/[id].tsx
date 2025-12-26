import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { useTeam } from '@/providers/TeamsProvider';
import { notifyNewTask } from '@/services/teamNotifications';
import { Channel } from '@/types/database.types';
import { canUser, ROLE_LABELS } from '@/utils/permissions';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
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

const CHANNEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    text: 'chatbubble-outline',
    voice: 'mic-outline',
    announcements: 'megaphone-outline',
};

export default function TeamDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const { profile } = useProfile();

    // Usar useTeam hook para dados em realtime
    const { team, loading: teamLoading } = useTeam(id);
    const userRole = team?.role || null;

    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [memberCount, setMemberCount] = useState(0);

    // Modal de Nova Tarefa
    const [taskModalVisible, setTaskModalVisible] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskDueDate, setTaskDueDate] = useState(new Date());
    const [taskXP, setTaskXP] = useState(50);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [creatingTask, setCreatingTask] = useState(false);

    // Usar sistema de permissões centralizado
    const canCreateTask = canUser(userRole, 'CREATE_TASK');

    // Carregar canais e contagem de membros (separado do team que vem do context)
    const loadChannelsAndMembers = useCallback(async () => {
        if (!id || !user?.id) return;

        try {
            // Buscar canais
            const { data: channelsData } = await supabase
                .from('channels')
                .select('*')
                .eq('team_id', id)
                .order('created_at', { ascending: true });
            setChannels((channelsData as Channel[]) || []);

            // Contar membros
            const { count } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', id);
            setMemberCount(count || 0);
        } catch (err) {
            console.error('Erro ao carregar canais:', err);
        } finally {
            setLoading(false);
        }
    }, [id, user?.id]);

    useEffect(() => {
        loadChannelsAndMembers();
    }, [loadChannelsAndMembers]);

    // Verificar se equipa foi encontrada
    useEffect(() => {
        if (!teamLoading && !team && id) {
            setError('Squad não encontrada');
        }
    }, [teamLoading, team, id]);

    // Função para criar tarefa em massa
    const handleCreateTeamTask = async () => {
        if (!taskTitle.trim()) {
            Alert.alert('Erro', 'O título é obrigatório');
            return;
        }
        if (!id || !user?.id) return;

        setCreatingTask(true);
        try {
            const { error: rpcError } = await supabase.rpc('assign_team_task', {
                p_team_id: id,
                p_title: taskTitle.trim(),
                p_description: taskDescription.trim() || null,
                p_due_date: taskDueDate.toISOString(),
                p_creator_id: user.id,
                p_xp_reward: taskXP,
            });

            if (rpcError) throw rpcError;

            // Enviar notificação push para membros
            notifyNewTask({
                taskId: '', // RPC não retorna ID, mas não é crítico
                taskTitle: taskTitle.trim(),
                teamId: id,
                teamName: team?.name || 'Equipa',
                creatorName: profile?.full_name || profile?.username || 'Alguém',
                creatorId: user.id,
                dueDate: taskDueDate.toISOString(),
            });

            // Fechar modal e resetar campos
            setTaskModalVisible(false);
            setTaskTitle('');
            setTaskDescription('');
            setTaskDueDate(new Date());
            setTaskXP(50);

            // Mostrar sucesso
            Alert.alert(
                '✅ Tarefa Criada!',
                `Tarefa atribuída a ${memberCount} membros da equipa!`,
                [{ text: 'OK' }]
            );
        } catch (err) {
            console.error('Erro ao criar tarefa:', err);
            Alert.alert('Erro', 'Não foi possível criar a tarefa. Tenta novamente.');
        } finally {
            setCreatingTask(false);
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
                {team.icon_url ? (
                    <Image source={{ uri: team.icon_url }} style={styles.teamAvatarImage} />
                ) : (
                    <View style={[styles.teamAvatar, { backgroundColor: `${teamColor}20` }]}>
                        <Text style={[styles.teamInitial, { color: teamColor }]}>
                            {team.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <View style={styles.headerContent}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    {team.description && (
                        <Text style={styles.teamDescription} numberOfLines={1}>{team.description}</Text>
                    )}
                </View>
                <Pressable
                    style={styles.menuButton}
                    onPress={() => router.push(`/team/${id}/settings` as any)}
                >
                    <Ionicons name="settings-outline" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* Stats - Clicável para ir à gestão de membros */}
            <Pressable
                style={styles.statsRow}
                onPress={() => router.push(`/team/members?teamId=${id}` as any)}
            >
                <View style={styles.statItem}>
                    <Ionicons name="people" size={16} color={colors.text.tertiary} />
                    <Text style={styles.statText}>{memberCount} membros</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="chatbubbles" size={16} color={colors.text.tertiary} />
                    <Text style={styles.statText}>{channels.length} canais</Text>
                </View>
                {userRole && (
                    <View style={styles.statItem}>
                        <Ionicons name="shield-checkmark" size={16} color={colors.accent.primary} />
                        <Text style={[styles.statText, { color: colors.accent.primary }]}>
                            {ROLE_LABELS[userRole] || userRole}
                        </Text>
                    </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </Pressable>

            {/* Admin Actions: Nova Tarefa (Wizard Avançado) */}
            {canCreateTask && (
                <Pressable
                    style={styles.newTaskButton}
                    onPress={() => router.push(`/team/${id}/tasks/new` as any)}
                >
                    <Ionicons name="clipboard-outline" size={20} color={colors.text.inverse} />
                    <Text style={styles.newTaskButtonText}>Nova Tarefa Avançada</Text>
                </Pressable>
            )}

            {/* Quick Actions Row */}
            <View style={styles.quickActions}>
                <Pressable
                    style={styles.quickActionButton}
                    onPress={() => channels[0] && router.push(`/team/${id}/channel/${channels[0].id}` as any)}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: `${colors.success.primary}15` }]}>
                        <Ionicons name="chatbubbles" size={22} color={colors.success.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Chat</Text>
                </Pressable>

                <Pressable
                    style={styles.quickActionButton}
                    onPress={() => router.push(`/team/${id}/tasks` as any)}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: `${colors.warning.primary}15` }]}>
                        <Ionicons name="checkbox" size={22} color={colors.warning.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Tarefas</Text>
                </Pressable>

                <Pressable
                    style={styles.quickActionButton}
                    onPress={() => router.push(`/team/${id}/files` as any)}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                        <Ionicons name="folder" size={22} color={colors.accent.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Ficheiros</Text>
                </Pressable>

                <Pressable
                    style={styles.quickActionButton}
                    onPress={() => router.push(`/team/members?teamId=${id}` as any)}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: `${colors.danger.primary}15` }]}>
                        <Ionicons name="people" size={22} color={colors.danger.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Membros</Text>
                </Pressable>

                <Pressable
                    style={styles.quickActionButton}
                    onPress={() => router.push(`/team/${id}/leaderboard` as any)}
                >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#FFD70015' }]}>
                        <Ionicons name="trophy" size={22} color="#FFD700" />
                    </View>
                    <Text style={styles.quickActionText}>Ranking</Text>
                </Pressable>
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

            {/* Modal: Nova Tarefa de Equipa */}
            <Modal
                visible={taskModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setTaskModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Pressable onPress={() => setTaskModalVisible(false)}>
                                <Text style={styles.modalCancel}>Cancelar</Text>
                            </Pressable>
                            <Text style={styles.modalTitle}>Nova Tarefa</Text>
                            <Pressable onPress={handleCreateTeamTask} disabled={creatingTask}>
                                {creatingTask ? (
                                    <ActivityIndicator size="small" color={colors.accent.primary} />
                                ) : (
                                    <Text style={styles.modalSave}>Criar</Text>
                                )}
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            {/* Info */}
                            <View style={styles.taskInfoBanner}>
                                <Ionicons name="information-circle" size={20} color={colors.accent.primary} />
                                <Text style={styles.taskInfoText}>
                                    Esta tarefa será atribuída a todos os {memberCount} membros da equipa.
                                </Text>
                            </View>

                            {/* Título */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Título *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={taskTitle}
                                    onChangeText={setTaskTitle}
                                    placeholder="Ex: Resolver Ficha 3"
                                    placeholderTextColor={colors.text.tertiary}
                                />
                            </View>

                            {/* Descrição */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Descrição</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textAreaInput]}
                                    value={taskDescription}
                                    onChangeText={setTaskDescription}
                                    placeholder="Instruções ou detalhes..."
                                    placeholderTextColor={colors.text.tertiary}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            {/* Data de Entrega */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Data de Entrega</Text>
                                <Pressable
                                    style={styles.dateButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={20} color={colors.text.tertiary} />
                                    <Text style={styles.dateButtonText}>
                                        {taskDueDate.toLocaleDateString('pt-PT', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'long',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </Pressable>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={taskDueDate}
                                        mode="datetime"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_event: any, date?: Date) => {
                                            setShowDatePicker(Platform.OS === 'ios');
                                            if (date) setTaskDueDate(date);
                                        }}
                                        minimumDate={new Date()}
                                    />
                                )}
                            </View>

                            {/* XP Reward */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Recompensa XP</Text>
                                <View style={styles.xpSelector}>
                                    {[25, 50, 100, 150].map((xp) => (
                                        <Pressable
                                            key={xp}
                                            style={[
                                                styles.xpOption,
                                                taskXP === xp && styles.xpOptionSelected,
                                            ]}
                                            onPress={() => setTaskXP(xp)}
                                        >
                                            <Text
                                                style={[
                                                    styles.xpOptionText,
                                                    taskXP === xp && styles.xpOptionTextSelected,
                                                ]}
                                            >
                                                {xp} XP
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
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
    teamAvatarImage: {
        width: 40,
        height: 40,
        borderRadius: 12,
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

    // New Task Button (Admin)
    newTaskButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    newTaskButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalCancel: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    modalSave: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },

    // Task Info Banner
    taskInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.accent.subtle,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xl,
    },
    taskInfoText: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.accent.primary,
    },

    // Form Inputs
    inputGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    textInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    textAreaInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    dateButtonText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // XP Selector
    xpSelector: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    xpOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    xpOptionSelected: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    xpOptionText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    xpOptionTextSelected: {
        color: colors.text.inverse,
    },

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
        justifyContent: 'space-between',
    },
    quickActionButton: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    quickActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
});
