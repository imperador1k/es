import { CalendarEvent, useCalendar } from '@/hooks/useCalendar'; // <--- O Hook novo
import { supabase } from '@/lib/supabase';
import { colors, getQuestStyle, shadows } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Task, TaskType } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Agenda, LocaleConfig } from 'react-native-calendars'; // <--- Biblioteca de Calendário
import { SafeAreaView } from 'react-native-safe-area-context';

// Configurar idioma PT para o Calendário
LocaleConfig.locales['pt'] = {
    monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt';

const QUEST_CONFIG: Record<TaskType, { icon: keyof typeof Ionicons.glyphMap; label: string; xp: number }> = {
    study: { icon: 'book-outline', label: 'Estudo', xp: 30 },
    assignment: { icon: 'document-text-outline', label: 'Trabalho', xp: 50 },
    exam: { icon: 'school-outline', label: 'Exame', xp: 100 },
};

export default function CalendarScreen() {
    const { user } = useAuthContext();
    const { addXPWithSync } = useProfile();

    // Hooks de Dados
    const { events: calendarEvents, loading: calendarLoading, refresh: refreshCalendar } = useCalendar();
    const [tasks, setTasks] = useState<Task[]>([]);

    // Estados de UI
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<any>({}); // Items misturados para a Agenda
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    // Estados do Formulário
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newType, setNewType] = useState<TaskType>('study');
    const [newDueDate, setNewDueDate] = useState('');

    // 1. Carregar Tarefas do Supabase
    const loadTasks = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        if (!error && data) setTasks(data as Task[]);
    }, [user?.id]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // 2. MISTURAR TUDO (Tasks + Google Calendar) sempre que os dados mudam
    useEffect(() => {
        const newItems: any = {};

        // A. Adicionar Eventos do Google/Sistema
        calendarEvents.forEach(evt => {
            const date = evt.startDate.split('T')[0];
            if (!newItems[date]) newItems[date] = [];

            newItems[date].push({
                type: 'event', // Marcador para sabermos renderizar diferente
                data: evt,
                height: 50
            });
        });

        // B. Adicionar Tarefas (Quests) da App
        tasks.forEach(task => {
            if (task.due_date) {
                const date = task.due_date.split('T')[0];
                if (!newItems[date]) newItems[date] = [];

                newItems[date].push({
                    type: 'task',
                    data: task,
                    height: 80
                });
            }
        });

        // Para a Agenda renderizar dias vazios corretamente
        const today = new Date().toISOString().split('T')[0];
        if (!newItems[today]) newItems[today] = [];

        setItems(newItems);
    }, [calendarEvents, tasks]);


    // Ações de Tarefas
    const handleCreateTask = async () => {
        if (!user?.id || !newTitle.trim()) return;
        try {
            setCreating(true);
            const xp = QUEST_CONFIG[newType].xp;

            // Se não escolher data, assume hoje para aparecer na agenda
            const finalDate = newDueDate || selectedDate;

            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    title: newTitle.trim(),
                    description: newDescription.trim() || null,
                    type: newType,
                    due_date: finalDate, // Importante para o calendário
                    is_completed: false,
                    xp_reward: xp,
                })
                .select()
                .single();

            if (error) throw error;

            setTasks(prev => [...prev, data as Task]);
            setModalVisible(false);
            setNewTitle('');
            setNewDescription('');
            Alert.alert('🎯 Quest Criada!', `Vai aparecer no dia ${finalDate}`);
        } catch (err) {
            Alert.alert('Erro', 'Não foi possível criar');
        } finally {
            setCreating(false);
        }
    };

    const handleCompleteTask = async (task: Task) => {
        if (!user?.id || task.is_completed) return;
        try {
            // Optimistic Update
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: true } : t));

            const { error } = await supabase.from('tasks').update({ is_completed: true }).eq('id', task.id);
            if (error) throw error;

            const xp = task.xp_reward || QUEST_CONFIG[task.type].xp;
            await addXPWithSync(xp);
            Alert.alert('🏆 Quest Completa!', `+${xp} XP ganhos!`);
        } catch (err) {
            console.error(err);
        }
    };

    // RENDERIZADORES
    const renderItem = (item: any) => {
        // Se for Evento do Google/Calendário
        if (item.type === 'event') {
            const evt = item.data as CalendarEvent;
            return (
                <TouchableOpacity style={[styles.itemEvent, { borderLeftColor: evt.type === 'google' ? '#9CA3AF' : colors.accent.primary }]}>
                    <View style={styles.eventHeader}>
                        <Text style={styles.eventTime}>
                            {new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {evt.type === 'google' && <Ionicons name="logo-google" size={12} color="#9CA3AF" />}
                    </View>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                </TouchableOpacity>
            );
        }

        // Se for Tarefa (Quest) da App
        const task = item.data as Task;
        const config = QUEST_CONFIG[task.type];
        const style = getQuestStyle(task.type);

        return (
            <Pressable style={[styles.itemTask, task.is_completed && styles.itemTaskCompleted]} onPress={() => handleCompleteTask(task)}>
                <View style={[styles.checkbox, task.is_completed && styles.checkboxDone]}>
                    {task.is_completed && <Ionicons name="checkmark" size={12} color="white" />}
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, task.is_completed && { textDecorationLine: 'line-through', color: colors.text.tertiary }]}>
                        {task.title}
                    </Text>
                    <View style={styles.taskMeta}>
                        <Ionicons name={config.icon} size={12} color={colors.text.tertiary} />
                        <Text style={styles.taskType}>{config.label}</Text>
                        <Text style={styles.taskXP}>+{task.xp_reward} XP</Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    const renderEmptyDate = () => {
        return (
            <View style={styles.emptyDate}>
                <Text style={styles.emptyText}>Nada agendado para esta hora.</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Agenda
                items={items}
                loadItemsForMonth={() => { }} // Já carregamos tudo no useEffect
                selected={selectedDate}
                renderItem={renderItem}
                renderEmptyDate={renderEmptyDate}
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                showClosingKnob={true}
                refreshing={calendarLoading}
                onRefresh={() => { refreshCalendar(); loadTasks(); }}
                theme={{
                    agendaDayTextColor: colors.text.secondary,
                    agendaDayNumColor: colors.text.secondary,
                    agendaTodayColor: colors.accent.primary,
                    agendaKnobColor: colors.accent.primary,
                    selectedDayBackgroundColor: colors.accent.primary,
                    dotColor: colors.accent.primary,
                    backgroundColor: colors.background,
                    calendarBackground: colors.surface,
                }}
            />

            {/* FAB para Adicionar */}
            <TouchableOpacity style={styles.fab} onPress={() => { setNewDueDate(selectedDate); setModalVisible(true); }}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            {/* Modal de Criação (Mantido igual, mas simplificado para o exemplo) */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Nova Quest para {new Date(newDueDate).toLocaleDateString()}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="O que tens para fazer?"
                            value={newTitle}
                            onChangeText={setNewTitle}
                            placeholderTextColor={colors.text.tertiary}
                        />

                        <View style={styles.typeGrid}>
                            {Object.entries(QUEST_CONFIG).map(([key, config]) => (
                                <Pressable
                                    key={key}
                                    style={[styles.typeCard, newType === key && { borderColor: colors.accent.primary, backgroundColor: colors.accent.light + '20' }]}
                                    onPress={() => setNewType(key as TaskType)}
                                >
                                    <Ionicons name={config.icon} size={20} color={newType === key ? colors.accent.primary : colors.text.tertiary} />
                                    <Text style={{ fontSize: 12, marginTop: 4, color: newType === key ? colors.accent.primary : colors.text.secondary }}>{config.label}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable style={styles.submitButton} onPress={handleCreateTask} disabled={creating}>
                            {creating ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Criar Quest</Text>}
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Agenda Items Styles
    itemEvent: {
        backgroundColor: 'white',
        flex: 1,
        borderRadius: 8,
        padding: 12,
        marginRight: 10,
        marginTop: 17,
        borderLeftWidth: 4,
        ...shadows.sm
    },
    eventHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    eventTime: { fontSize: 12, color: colors.text.tertiary, fontWeight: '600' },
    eventTitle: { fontSize: 16, color: colors.text.primary, fontWeight: '500' },

    itemTask: {
        backgroundColor: colors.surface,
        flex: 1,
        borderRadius: 8,
        padding: 12,
        marginRight: 10,
        marginTop: 17,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: colors.accent.primary, // Diferenciar tasks de eventos
        ...shadows.sm
    },
    itemTaskCompleted: { opacity: 0.6 },
    checkbox: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border,
        marginRight: 12, alignItems: 'center', justifyContent: 'center'
    },
    checkboxDone: { backgroundColor: colors.success.primary, borderColor: colors.success.primary },
    taskTitle: { fontSize: 16, color: colors.text.primary, fontWeight: '500' },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    taskType: { fontSize: 12, color: colors.text.tertiary },
    taskXP: { fontSize: 12, color: colors.accent.primary, fontWeight: 'bold' },

    emptyDate: { height: 15, flex: 1, paddingTop: 30 },
    emptyText: { color: colors.text.tertiary, fontSize: 12 },

    // FAB
    fab: {
        position: 'absolute', bottom: 20, right: 20,
        backgroundColor: colors.accent.primary, width: 56, height: 56,
        borderRadius: 28, justifyContent: 'center', alignItems: 'center',
        ...shadows.lg
    },

    // Modal Styles (Simplificados)
    modalWrapper: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20, borderRadius: 2 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: colors.text.primary },
    input: { backgroundColor: colors.surfaceSubtle, padding: 16, borderRadius: 12, fontSize: 16, color: colors.text.primary, marginBottom: 16 },
    typeGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    typeCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.surfaceSubtle, borderWidth: 2, borderColor: 'transparent' },
    submitButton: { backgroundColor: colors.accent.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});