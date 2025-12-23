/**
 * Team Tasks Screen
 * Ecrã de gestão de tarefas de equipa estilo Microsoft Teams / Google Classroom
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { TeamRole, TeamTask, TeamTaskCompletion } from '@/types/database.types';
import { canUser } from '@/utils/permissions';

// ============================================
// TYPES
// ============================================

type TabType = 'pending' | 'completed';

interface TaskWithCompletion extends TeamTask {
    my_completion: TeamTaskCompletion | null;
    creator?: { username: string; avatar_url: string | null } | null;
}

// ============================================
// HELPERS
// ============================================

function formatDueDate(dueDate: string | null): { text: string; isOverdue: boolean; urgency: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' } {
    if (!dueDate) return { text: 'Sem prazo', isOverdue: false, urgency: 'normal' };

    const due = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const diffMs = dueDay.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (dueDay < today) {
        const daysAgo = Math.abs(diffDays);
        return {
            text: daysAgo === 1 ? 'Atrasado 1 dia' : `Atrasado ${daysAgo} dias`,
            isOverdue: true,
            urgency: 'overdue',
        };
    }

    if (dueDay.getTime() === today.getTime()) {
        return { text: 'Entrega hoje', isOverdue: false, urgency: 'today' };
    }

    if (dueDay.getTime() === tomorrow.getTime()) {
        return { text: 'Entrega amanhã', isOverdue: false, urgency: 'tomorrow' };
    }

    if (diffDays <= 7) {
        return { text: `Entrega em ${diffDays} dias`, isOverdue: false, urgency: 'soon' };
    }

    return {
        text: due.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }),
        isOverdue: false,
        urgency: 'normal',
    };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamTasksScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthContext();

    // Estado
    const [tasks, setTasks] = useState<TaskWithCompletion[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);
    const [teamName, setTeamName] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('pending');

    // Modal criar tarefa
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDueDate, setNewDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [creating, setCreating] = useState(false);

    // ============================================
    // LOAD DATA
    // ============================================

    const loadTasks = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            // Buscar tarefas da equipa
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select(`
                    *,
                    creator:created_by(username, avatar_url)
                `)
                .eq('team_id', teamId)
                .is('deleted_at', null)
                .order('due_date', { ascending: true, nullsFirst: false });

            if (tasksError) throw tasksError;

            // Buscar minhas completions
            const { data: completionsData, error: completionsError } = await supabase
                .from('team_task_completions')
                .select('*')
                .eq('user_id', user.id);

            if (completionsError) throw completionsError;

            // Criar mapa de completions
            const completionsMap = new Map<string, TeamTaskCompletion>();
            (completionsData || []).forEach(c => {
                completionsMap.set(c.task_id, c);
            });

            // Combinar dados
            const combined: TaskWithCompletion[] = (tasksData || []).map(task => ({
                ...task,
                my_completion: completionsMap.get(task.id) || null,
            }));

            setTasks(combined);

            // Buscar role (só 1x)
            if (!userRole) {
                const { data: memberData } = await supabase
                    .from('team_members')
                    .select('role')
                    .eq('team_id', teamId)
                    .eq('user_id', user.id)
                    .single();

                if (memberData) {
                    setUserRole(memberData.role as TeamRole);
                }
            }

            // Buscar nome da equipa (só 1x)
            if (!teamName) {
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('name')
                    .eq('id', teamId)
                    .single();
                if (teamData) setTeamName(teamData.name);
            }

        } catch (err) {
            console.error('Erro ao carregar tarefas:', err);
            Alert.alert('Erro', 'Não foi possível carregar as tarefas.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teamId, user?.id, userRole, teamName]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadTasks();
    };

    // ============================================
    // TOGGLE COMPLETION
    // ============================================

    const handleToggleCompletion = async (task: TaskWithCompletion) => {
        if (!user?.id) return;

        try {
            if (task.my_completion) {
                // Desmarcar - DELETE
                const { error } = await supabase
                    .from('team_task_completions')
                    .delete()
                    .eq('id', task.my_completion.id);

                if (error) throw error;

                // Atualizar localmente
                setTasks(prev =>
                    prev.map(t =>
                        t.id === task.id ? { ...t, my_completion: null } : t
                    )
                );
            } else {
                // Marcar como completa - INSERT
                const { data, error } = await supabase
                    .from('team_task_completions')
                    .insert({
                        task_id: task.id,
                        user_id: user.id,
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Atualizar localmente
                setTasks(prev =>
                    prev.map(t =>
                        t.id === task.id ? { ...t, my_completion: data } : t
                    )
                );
            }
        } catch (err) {
            console.error('Erro ao atualizar tarefa:', err);
            Alert.alert('Erro', 'Não foi possível atualizar o estado da tarefa.');
        }
    };

    // ============================================
    // CREATE TASK
    // ============================================

    const handleCreateTask = async () => {
        if (!newTitle.trim()) {
            Alert.alert('Erro', 'Introduz um título para a tarefa.');
            return;
        }

        setCreating(true);

        try {
            const { error } = await supabase.from('tasks').insert({
                team_id: teamId,
                user_id: user!.id, // Required by schema
                created_by: user!.id,
                title: newTitle.trim(),
                description: newDescription.trim() || null,
                due_date: newDueDate?.toISOString() || null,
                type: 'assignment',
            });

            if (error) throw error;

            setCreateModalVisible(false);
            setNewTitle('');
            setNewDescription('');
            setNewDueDate(null);
            loadTasks();
            Alert.alert('✅ Sucesso', 'Tarefa criada!');
        } catch (err) {
            console.error('Erro ao criar tarefa:', err);
            Alert.alert('Erro', 'Não foi possível criar a tarefa.');
        } finally {
            setCreating(false);
        }
    };

    // ============================================
    // DELETE TASK
    // ============================================

    const handleDeleteTask = (task: TaskWithCompletion) => {
        Alert.alert(
            'Apagar Tarefa?',
            `Tens a certeza que queres apagar "${task.title}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Soft delete
                            const { error } = await supabase
                                .from('tasks')
                                .update({ deleted_at: new Date().toISOString() })
                                .eq('id', task.id);

                            if (error) throw error;

                            setTasks(prev => prev.filter(t => t.id !== task.id));
                            Alert.alert('✅ Apagado', 'Tarefa removida.');
                        } catch (err) {
                            console.error('Erro ao apagar:', err);
                            Alert.alert('Erro', 'Não foi possível apagar.');
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // FILTERED DATA
    // ============================================

    const pendingTasks = tasks.filter(t => !t.my_completion);
    const completedTasks = tasks.filter(t => t.my_completion);
    const displayedTasks = activeTab === 'pending' ? pendingTasks : completedTasks;

    // ============================================
    // RENDER TASK ITEM
    // ============================================

    const renderTaskItem = ({ item }: { item: TaskWithCompletion }) => {
        const { text: dueText, isOverdue, urgency } = formatDueDate(item.due_date);
        const isCompleted = !!item.my_completion;
        const canDelete = canUser(userRole, 'DELETE_TASK') || item.created_by === user?.id;

        const showOptions = () => {
            const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
                { text: 'Cancelar', style: 'cancel' },
            ];
            if (canDelete) {
                options.push({
                    text: 'Apagar Tarefa',
                    style: 'destructive',
                    onPress: () => handleDeleteTask(item),
                });
            }
            Alert.alert(item.title, item.description || 'Sem descrição', options);
        };

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.taskCard,
                    isCompleted && styles.taskCardCompleted,
                    pressed && styles.taskCardPressed,
                ]}
                onPress={() => handleToggleCompletion(item)}
                onLongPress={showOptions}
                android_ripple={{ color: colors.accent.subtle }}
            >
                {/* Checkbox */}
                <Pressable
                    style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
                    onPress={() => handleToggleCompletion(item)}
                >
                    {isCompleted && (
                        <Ionicons name="checkmark" size={16} color={colors.text.inverse} />
                    )}
                </Pressable>

                {/* Info */}
                <View style={styles.taskInfo}>
                    <Text
                        style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}
                        numberOfLines={2}
                    >
                        {item.title}
                    </Text>
                    {item.description && (
                        <Text style={styles.taskDescription} numberOfLines={1}>
                            {item.description}
                        </Text>
                    )}
                    <View style={styles.taskMeta}>
                        <View style={[
                            styles.dueBadge,
                            urgency === 'overdue' && styles.dueBadgeOverdue,
                            urgency === 'today' && styles.dueBadgeToday,
                            urgency === 'tomorrow' && styles.dueBadgeTomorrow,
                        ]}>
                            <Ionicons
                                name={isOverdue ? 'warning' : 'calendar-outline'}
                                size={12}
                                color={isOverdue ? colors.danger.primary : colors.text.tertiary}
                            />
                            <Text style={[
                                styles.dueText,
                                isOverdue && styles.dueTextOverdue,
                                urgency === 'today' && styles.dueTextToday,
                            ]}>
                                {dueText}
                            </Text>
                        </View>
                        {item.creator && (
                            <Text style={styles.creatorText}>
                                por {item.creator.username}
                            </Text>
                        )}
                    </View>
                </View>

                {/* More Options */}
                <Pressable style={styles.moreButton} onPress={showOptions}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.tertiary} />
                </Pressable>
            </Pressable>
        );
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Tarefas</Text>
                    <Text style={styles.headerSubtitle}>
                        {teamName} • {pendingTasks.length} pendentes
                    </Text>
                </View>
                {canUser(userRole, 'CREATE_TASK') && (
                    <Pressable
                        style={styles.addButton}
                        onPress={() => setCreateModalVisible(true)}
                    >
                        <Ionicons name="add" size={22} color={colors.text.inverse} />
                    </Pressable>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                        Pendentes ({pendingTasks.length})
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
                    onPress={() => setActiveTab('completed')}
                >
                    <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
                        Concluídas ({completedTasks.length})
                    </Text>
                </Pressable>
            </View>

            {/* Task List */}
            <FlatList
                data={displayedTasks}
                keyExtractor={(item) => item.id}
                renderItem={renderTaskItem}
                contentContainerStyle={[
                    styles.listContent,
                    displayedTasks.length === 0 && styles.listContentEmpty,
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent.primary}
                    />
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons
                                name={activeTab === 'pending' ? 'checkmark-done-outline' : 'list-outline'}
                                size={64}
                                color={colors.text.tertiary}
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'pending' ? 'Tudo em dia! 🎉' : 'Nenhuma tarefa concluída'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeTab === 'pending'
                                ? 'Não tens tarefas pendentes.'
                                : 'Completa tarefas para as veres aqui.'}
                        </Text>
                    </View>
                }
            />

            {/* Modal Criar Tarefa */}
            <Modal
                visible={createModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nova Tarefa</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Título da tarefa"
                            placeholderTextColor={colors.text.tertiary}
                            value={newTitle}
                            onChangeText={setNewTitle}
                            autoFocus
                        />

                        <TextInput
                            style={[styles.modalInput, styles.modalInputMultiline]}
                            placeholder="Descrição (opcional)"
                            placeholderTextColor={colors.text.tertiary}
                            value={newDescription}
                            onChangeText={setNewDescription}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Date Picker */}
                        <Pressable
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
                            <Text style={styles.dateButtonText}>
                                {newDueDate
                                    ? newDueDate.toLocaleDateString('pt-PT', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })
                                    : 'Definir prazo de entrega'}
                            </Text>
                            {newDueDate && (
                                <Pressable onPress={() => setNewDueDate(null)}>
                                    <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                                </Pressable>
                            )}
                        </Pressable>

                        {showDatePicker && (
                            <DateTimePicker
                                value={newDueDate || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, date) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (date) setNewDueDate(date);
                                }}
                                minimumDate={new Date()}
                            />
                        )}

                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.modalButtonCancel}
                                onPress={() => setCreateModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={styles.modalButtonConfirm}
                                onPress={handleCreateTask}
                                disabled={creating}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color={colors.text.inverse} />
                                ) : (
                                    <Text style={styles.modalButtonConfirmText}>Criar</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: colors.surface,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
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

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.accent.primary,
    },
    tabText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
    },
    tabTextActive: {
        color: colors.accent.primary,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    listContentEmpty: {
        flex: 1,
    },
    separator: {
        height: spacing.sm,
    },

    // Task Card
    taskCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    taskCardCompleted: {
        backgroundColor: colors.surfaceSubtle,
        opacity: 0.8,
    },
    taskCardPressed: {
        opacity: 0.9,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.divider,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.success.primary,
        borderColor: colors.success.primary,
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: 4,
    },
    taskTitleCompleted: {
        textDecorationLine: 'line-through',
        color: colors.text.tertiary,
    },
    taskDescription: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.surfaceSubtle,
    },
    dueBadgeOverdue: {
        backgroundColor: `${colors.danger.primary}15`,
    },
    dueBadgeToday: {
        backgroundColor: `${colors.warning.primary}15`,
    },
    dueBadgeTomorrow: {
        backgroundColor: `${colors.accent.primary}15`,
    },
    dueText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    dueTextOverdue: {
        color: colors.danger.primary,
        fontWeight: typography.weight.medium,
    },
    dueTextToday: {
        color: colors.warning.primary,
        fontWeight: typography.weight.medium,
    },
    creatorText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    moreButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.xl,
        paddingBottom: spacing.xl + 20,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    modalInput: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.divider,
        marginBottom: spacing.md,
    },
    modalInputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.divider,
        marginBottom: spacing.lg,
    },
    dateButtonText: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
    },
    modalButtonCancel: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    modalButtonCancelText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    modalButtonConfirm: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        minWidth: 80,
        alignItems: 'center',
    },
    modalButtonConfirmText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
});
