import { supabase } from '@/lib/supabase';
import { borderRadius, colors, getQuestStyle, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Task, TaskType } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
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

// Config por tipo
const QUEST_CONFIG: Record<TaskType, { icon: keyof typeof Ionicons.glyphMap; label: string; xp: number }> = {
    study: { icon: 'book-outline', label: 'Estudo', xp: 30 },
    assignment: { icon: 'document-text-outline', label: 'Trabalho', xp: 50 },
    exam: { icon: 'school-outline', label: 'Exame', xp: 100 },
};

export default function CalendarScreen() {
    const { user } = useAuthContext();
    const { addXPWithSync } = useProfile();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState<'all' | TaskType>('all');

    // Form state
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newType, setNewType] = useState<TaskType>('study');
    const [newDueDate, setNewDueDate] = useState('');

    // Load tasks
    const loadTasks = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id)
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            setTasks((data as Task[]) || []);
        } catch (err) {
            console.error('Erro:', err);
        }
    }, [user?.id]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await loadTasks();
            setLoading(false);
        };
        load();
    }, [loadTasks]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadTasks();
        setRefreshing(false);
    };

    // Create task
    const handleCreateTask = async () => {
        if (!user?.id || !newTitle.trim()) {
            Alert.alert('Erro', 'O título é obrigatório');
            return;
        }
        try {
            setCreating(true);
            const xp = QUEST_CONFIG[newType].xp;
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    title: newTitle.trim(),
                    description: newDescription.trim() || null,
                    type: newType,
                    due_date: newDueDate || null,
                    is_completed: false,
                    xp_reward: xp,
                })
                .select()
                .single();
            if (error) throw error;
            setTasks(prev => [data as Task, ...prev]);
            setModalVisible(false);
            setNewTitle('');
            setNewDescription('');
            setNewType('study');
            setNewDueDate('');
            Alert.alert('🎯 Quest Criada!', `"${data.title}" adicionada!`);
        } catch (err) {
            Alert.alert('Erro', 'Não foi possível criar');
        } finally {
            setCreating(false);
        }
    };

    // Complete task
    const handleCompleteTask = async (task: Task) => {
        if (!user?.id || task.is_completed) return;
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_completed: true })
                .eq('id', task.id);
            if (error) throw error;
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: true } : t));
            const xp = task.xp_reward || QUEST_CONFIG[task.type].xp;
            await addXPWithSync(xp);
            Alert.alert('🏆 Quest Completa!', `+${xp} XP ganhos!`);
        } catch (err) {
            console.error(err);
        }
    };

    // Format date
    const formatDueDate = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        const today = new Date();
        const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Hoje';
        if (diff === 1) return 'Amanhã';
        if (diff < 0) return 'Atrasada';
        if (diff < 7) return `Em ${diff} dias`;
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    };

    // Filter tasks
    const pendingTasks = tasks.filter(t => !t.is_completed && (filter === 'all' || t.type === filter));
    const completedTasks = tasks.filter(t => t.is_completed && (filter === 'all' || t.type === filter));
    const allFiltered = [...pendingTasks, ...completedTasks];

    // Loading
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
                    <Text style={styles.title}>Minhas Quests</Text>
                    <Text style={styles.subtitle}>
                        {pendingTasks.length} pendentes · {completedTasks.length} completas
                    </Text>
                </View>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={24} color={colors.text.inverse} />
                </Pressable>
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
                <FilterPill label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
                <FilterPill label="Estudo" type="study" active={filter === 'study'} onPress={() => setFilter('study')} />
                <FilterPill label="Trabalhos" type="assignment" active={filter === 'assignment'} onPress={() => setFilter('assignment')} />
                <FilterPill label="Exames" type="exam" active={filter === 'exam'} onPress={() => setFilter('exam')} />
            </ScrollView>

            {/* List */}
            <FlatList
                data={allFiltered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <QuestCard
                        task={item}
                        onComplete={() => handleCompleteTask(item)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<EmptyState onPress={() => setModalVisible(true)} />}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                showsVerticalScrollIndicator={false}
            />

            {/* Create Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nova Quest</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.tertiary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Title Input */}
                            <Text style={styles.inputLabel}>Título</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Estudar Matemática"
                                placeholderTextColor={colors.text.tertiary}
                                value={newTitle}
                                onChangeText={setNewTitle}
                            />

                            {/* Type Selector */}
                            <Text style={styles.inputLabel}>Tipo de Quest</Text>
                            <View style={styles.typeGrid}>
                                {(['study', 'assignment', 'exam'] as TaskType[]).map((type) => {
                                    const config = QUEST_CONFIG[type];
                                    const style = getQuestStyle(type);
                                    const isActive = newType === type;
                                    return (
                                        <Pressable
                                            key={type}
                                            style={[styles.typeCard, isActive && { borderColor: style.icon, backgroundColor: style.bg }]}
                                            onPress={() => setNewType(type)}
                                        >
                                            <Ionicons name={config.icon} size={24} color={isActive ? style.icon : colors.text.tertiary} />
                                            <Text style={[styles.typeLabel, isActive && { color: style.text }]}>{config.label}</Text>
                                            <Text style={styles.typeXP}>+{config.xp} XP</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Due Date */}
                            <Text style={styles.inputLabel}>Data Limite (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="AAAA-MM-DD"
                                placeholderTextColor={colors.text.tertiary}
                                value={newDueDate}
                                onChangeText={setNewDueDate}
                            />

                            {/* Description */}
                            <Text style={styles.inputLabel}>Notas (opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Detalhes..."
                                placeholderTextColor={colors.text.tertiary}
                                value={newDescription}
                                onChangeText={setNewDescription}
                                multiline
                            />

                            {/* Submit */}
                            <Pressable style={styles.submitButton} onPress={handleCreateTask} disabled={creating}>
                                {creating ? (
                                    <ActivityIndicator color={colors.text.inverse} />
                                ) : (
                                    <Text style={styles.submitText}>🎯 Criar Quest</Text>
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
function FilterPill({ label, active, type, onPress }: { label: string; active: boolean; type?: TaskType; onPress: () => void }) {
    const style = type ? getQuestStyle(type) : null;
    return (
        <Pressable
            style={[
                styles.pill,
                active && (style ? { backgroundColor: style.bg } : styles.pillActive),
            ]}
            onPress={onPress}
        >
            <Text style={[styles.pillText, active && (style ? { color: style.text } : styles.pillTextActive)]}>
                {label}
            </Text>
        </Pressable>
    );
}

function QuestCard({ task, onComplete }: { task: Task; onComplete: () => void }) {
    const config = QUEST_CONFIG[task.type];
    const style = getQuestStyle(task.type);
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;

    const formatDate = (d: string | null) => {
        if (!d) return null;
        const date = new Date(d);
        const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'Atrasada';
        if (diff === 0) return 'Hoje';
        if (diff === 1) return 'Amanhã';
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    };

    return (
        <View style={[styles.questCard, task.is_completed && styles.questCardCompleted]}>
            {/* Checkbox */}
            <Pressable style={[styles.checkbox, task.is_completed && styles.checkboxDone]} onPress={onComplete} disabled={task.is_completed}>
                {task.is_completed && <Ionicons name="checkmark" size={14} color={colors.text.inverse} />}
            </Pressable>

            {/* Icon */}
            <View style={[styles.questIcon, { backgroundColor: style.bg }]}>
                <Ionicons name={config.icon} size={18} color={style.icon} />
            </View>

            {/* Content */}
            <View style={styles.questContent}>
                <Text style={[styles.questTitle, task.is_completed && styles.questTitleDone]} numberOfLines={1}>
                    {task.title}
                </Text>
                <View style={styles.questMeta}>
                    <View style={[styles.questTypeBadge, { backgroundColor: style.bg }]}>
                        <Text style={[styles.questTypeText, { color: style.text }]}>{config.label}</Text>
                    </View>
                    {task.due_date && (
                        <Text style={[styles.questDate, isOverdue && styles.questDateOverdue]}>
                            {formatDate(task.due_date)}
                        </Text>
                    )}
                </View>
            </View>

            {/* XP */}
            <View style={styles.questXP}>
                <Text style={styles.questXPValue}>+{task.xp_reward || config.xp}</Text>
                <Ionicons name="flash" size={12} color={colors.accent.primary} />
            </View>
        </View>
    );
}

function EmptyState({ onPress }: { onPress: () => void }) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="trophy-outline" size={48} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem quests</Text>
            <Text style={styles.emptySubtitle}>Adiciona a tua primeira quest para começar a ganhar XP!</Text>
            <Pressable style={styles.emptyButton} onPress={onPress}>
                <Text style={styles.emptyButtonText}>Criar Quest</Text>
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
        paddingBottom: spacing.md,
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

    // Filters
    filterScroll: {
        maxHeight: 50,
        marginBottom: spacing.md,
    },
    filterContainer: {
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    pill: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        ...shadows.sm,
    },
    pillActive: {
        backgroundColor: colors.text.primary,
    },
    pillText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    pillTextActive: {
        color: colors.text.inverse,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
        flexGrow: 1,
    },

    // Quest Card
    questCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    questCardCompleted: {
        opacity: 0.6,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    checkboxDone: {
        backgroundColor: colors.success.primary,
        borderColor: colors.success.primary,
    },
    questIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    questContent: {
        flex: 1,
    },
    questTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        marginBottom: 4,
    },
    questTitleDone: {
        textDecorationLine: 'line-through',
        color: colors.text.tertiary,
    },
    questMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    questTypeBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
    },
    questTypeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },
    questDate: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    questDateOverdue: {
        color: colors.danger.primary,
    },
    questXP: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    questXPValue: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },

    // Empty State
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
        maxHeight: '90%',
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
        minHeight: 80,
        textAlignVertical: 'top',
    },

    // Type Grid
    typeGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    typeCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    typeLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    typeXP: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
        marginTop: 2,
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
