import { supabase } from '@/lib/supabase';
import { borderRadius, colors, getQuestStyle, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Task, TaskType } from '@/types/database.types';
import { useCalendar, CalendarEvent } from '@/hooks/useCalendar';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Configurar idioma PT
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

type MixedEvent = 
  | { type: 'google'; data: CalendarEvent }
  | { type: 'task'; data: Task };

export default function CalendarScreen() {
    const { user } = useAuthContext();
    const { addXPWithSync } = useProfile();
    
    // Hooks
    const { events: calendarEvents, loading: calendarLoading, refresh: refreshCalendar } = useCalendar();
    
    // Estado
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState<TaskType>('study');

    // 1. Carregar Tarefas
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

    // 2. Preparar os "Pontinhos" para o Calendário (Marked Dates)
    const markedDates = useMemo(() => {
        const marks: any = {};

        // Marcar Eventos Google (Ponto Cinzento)
        calendarEvents.forEach(evt => {
            const date = evt.startDate.split('T')[0];
            if (!marks[date]) marks[date] = { dots: [] };
            // Evitar duplicados
            if (!marks[date].dots.find((d: any) => d.key === 'google')) {
                marks[date].dots.push({ key: 'google', color: '#9CA3AF' });
            }
        });

        // Marcar Tarefas App (Ponto Roxo)
        tasks.forEach(task => {
            if (task.due_date) {
                const date = task.due_date.split('T')[0];
                if (!marks[date]) marks[date] = { dots: [] };
                if (!marks[date].dots.find((d: any) => d.key === 'task')) {
                    marks[date].dots.push({ key: 'task', color: colors.accent.primary });
                }
            }
        });

        // Marcar o dia selecionado
        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: colors.accent.primary,
            selectedTextColor: 'white'
        };

        return marks;
    }, [calendarEvents, tasks, selectedDate]);

    // 3. Filtrar a Lista para o dia Selecionado
    const dailyItems: MixedEvent[] = useMemo(() => {
        const items: MixedEvent[] = [];

        // Adicionar Google Events do dia
        calendarEvents.forEach(evt => {
            if (evt.startDate.startsWith(selectedDate)) {
                items.push({ type: 'google', data: evt });
            }
        });

        // Adicionar Tasks do dia
        tasks.forEach(task => {
            if (task.due_date?.startsWith(selectedDate)) {
                items.push({ type: 'task', data: task });
            }
        });

        return items;
    }, [selectedDate, calendarEvents, tasks]);


    // Ações
    const handleCreateTask = async () => {
        if (!user?.id || !newTitle.trim()) return;
        try {
            setCreating(true);
            const xp = QUEST_CONFIG[newType].xp;
            
            const { data, error } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    title: newTitle.trim(),
                    type: newType,
                    due_date: selectedDate, 
                    is_completed: false,
                    xp_reward: xp,
                })
                .select()
                .single();

            if (error) throw error;
            
            setTasks(prev => [...prev, data as Task]);
            setModalVisible(false);
            setNewTitle('');
            Alert.alert('Sucesso', 'Tarefa adicionada ao calendário!');
        } catch (err) {
            Alert.alert('Erro', 'Não foi possível criar');
        } finally {
            setCreating(false);
        }
    };

    const handleCompleteTask = async (task: Task) => {
        if (task.is_completed) return;
        // Update Local
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: true } : t));
        // Update Remoto
        await supabase.from('tasks').update({ is_completed: true }).eq('id', task.id);
        await addXPWithSync(task.xp_reward || 30);
    };

    // Render Items da Lista
    const renderItem = ({ item }: { item: MixedEvent }) => {
        if (item.type === 'google') {
            const evt = item.data;
            return (
                <View style={styles.eventCard}>
                    <View style={styles.eventTimeBar} />
                    <View style={styles.eventContent}>
                        <Text style={styles.eventTime}>
                            {new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.eventTitle}>{evt.title}</Text>
                        <View style={styles.googleBadge}>
                            <Ionicons name="logo-google" size={10} color="#6B7280" />
                            <Text style={styles.googleText}>Calendário</Text>
                        </View>
                    </View>
                </View>
            );
        }

        const task = item.data;
        const config = QUEST_CONFIG[task.type];
        const style = getQuestStyle(task.type);

        return (
            <Pressable style={[styles.taskCard, task.is_completed && styles.taskCompleted]} onPress={() => handleCompleteTask(task)}>
                 <View style={[styles.checkbox, task.is_completed && styles.checkboxDone]}>
                    {task.is_completed && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                        <View style={[styles.tag, { backgroundColor: style.bg }]}>
                            <Ionicons name={config.icon} size={10} color={style.icon} />
                            <Text style={[styles.tagText, { color: style.text }]}>{config.label}</Text>
                        </View>
                        <Text style={styles.xpText}>+{task.xp_reward} XP</Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.calendarContainer}>
                <Calendar
                    current={selectedDate}
                    onDayPress={(day: any) => setSelectedDate(day.dateString)}
                    markingType={'multi-dot'}
                    markedDates={markedDates}
                    theme={{
                        backgroundColor: colors.surface,
                        calendarBackground: colors.surface,
                        textSectionTitleColor: colors.text.secondary,
                        selectedDayBackgroundColor: colors.accent.primary,
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: colors.accent.primary,
                        dayTextColor: colors.text.primary,
                        textDisabledColor: colors.text.tertiary,
                        dotColor: colors.accent.primary,
                        selectedDotColor: '#ffffff',
                        arrowColor: colors.accent.primary,
                        monthTextColor: colors.text.primary,
                        indicatorColor: colors.accent.primary,
                        textDayFontWeight: '400',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '500',
                        textDayFontSize: 14,
                        textMonthFontSize: 16,
                        textDayHeaderFontSize: 13
                    }}
                />
            </View>

            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>
                        {new Date(selectedDate).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <TouchableOpacity onPress={() => refreshCalendar()}>
                        <Ionicons name="refresh" size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={dailyItems}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Nada agendado para hoje.</Text>
                            <Text style={styles.emptySubtext}>Aproveita para estudar! 📚</Text>
                        </View>
                    }
                />
            </View>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            {/* Modal Simples */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                    <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.handle} />
                        <Text style={styles.modalTitle}>Novo Evento</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Título da tarefa..." 
                            placeholderTextColor={colors.text.tertiary}
                            value={newTitle} 
                            onChangeText={setNewTitle} 
                        />
                        <View style={styles.typeRow}>
                            {Object.entries(QUEST_CONFIG).map(([key, conf]) => (
                                <TouchableOpacity 
                                    key={key} 
                                    style={[styles.typeBtn, newType === key && styles.typeBtnActive]}
                                    onPress={() => setNewType(key as TaskType)}
                                >
                                    <Ionicons name={conf.icon} size={16} color={newType === key ? 'white' : colors.text.secondary} />
                                    <Text style={[styles.typeText, newType === key && { color: 'white' }]}>{conf.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleCreateTask} disabled={creating}>
                            {creating ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Guardar</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    
    // Calendar Area
    calendarContainer: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...shadows.sm,
        paddingBottom: 10,
        zIndex: 10,
    },

    // List Area
    listContainer: { flex: 1, paddingTop: 20 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary, textTransform: 'capitalize' },
    listContent: { paddingHorizontal: 20, paddingBottom: 80 },

    // Cards - Google Event
    eventCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        ...shadows.sm,
        borderWidth: 1,
        borderColor: colors.border
    },
    eventTimeBar: { width: 4, backgroundColor: '#9CA3AF', borderRadius: 2, marginRight: 12 },
    eventContent: { flex: 1 },
    eventTime: { fontSize: 12, color: colors.text.secondary, marginBottom: 2 },
    eventTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
    googleBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    googleText: { fontSize: 10, color: '#6B7280' },

    // Cards - App Task
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        ...shadows.sm,
        borderLeftWidth: 4,
        borderLeftColor: colors.accent.primary
    },
    taskCompleted: { opacity: 0.6 },
    checkbox: {
        width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center', marginRight: 12
    },
    checkboxDone: { backgroundColor: colors.success.primary, borderColor: colors.success.primary },
    taskContent: { flex: 1 },
    taskTitle: { fontSize: 16, fontWeight: '500', color: colors.text.primary, marginBottom: 6 },
    taskMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
    tagText: { fontSize: 10, fontWeight: 'bold' },
    xpText: { fontSize: 12, fontWeight: 'bold', color: colors.accent.primary },

    // Empty State
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, color: colors.text.secondary, marginBottom: 4 },
    emptySubtext: { fontSize: 14, color: colors.text.tertiary },

    // FAB
    fab: {
        position: 'absolute', bottom: 20, right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.accent.primary,
        justifyContent: 'center', alignItems: 'center',
        ...shadows.lg
    },

    // Modal
    modalWrapper: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20, borderRadius: 2 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: colors.text.primary },
    input: { backgroundColor: '#F3F4F6', padding: 14, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, backgroundColor: '#F3F4F6', gap: 6 },
    typeBtnActive: { backgroundColor: colors.accent.primary },
    typeText: { fontSize: 12, color: colors.text.secondary, fontWeight: '600' },
    saveBtn: { backgroundColor: colors.accent.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});