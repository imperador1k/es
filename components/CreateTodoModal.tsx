/**
 * ✅ CreateTodoModal - PREMIUM REDESIGN
 * Beautiful modal for creating personal to-do items with subtasks
 */

import { CreateTodoInput } from '@/hooks/usePersonalTodos';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CreateTodoModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (todo: CreateTodoInput) => Promise<void>;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Baixa', color: '#10B981', icon: 'leaf', gradient: ['#10B981', '#059669'] },
    { value: 'medium', label: 'Média', color: '#F59E0B', icon: 'flash', gradient: ['#F59E0B', '#D97706'] },
    { value: 'high', label: 'Alta', color: '#EF4444', icon: 'flame', gradient: ['#EF4444', '#DC2626'] },
] as const;

export function CreateTodoModal({ visible, onClose, onSubmit }: CreateTodoModalProps) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [steps, setSteps] = useState<string[]>([]);
    const [newStep, setNewStep] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate(null);
        setPriority('medium');
        setSteps([]);
        setNewStep('');
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim() || undefined,
                due_date: dueDate?.toISOString(),
                priority,
                steps: steps.filter(s => s.trim()),
            });
            resetForm();
            onClose();
        } catch (err) {
            console.error('Error creating todo:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddStep = () => {
        if (newStep.trim()) {
            setSteps([...steps, newStep.trim()]);
            setNewStep('');
        }
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const formatDate = (date: Date) => date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    const formatTime = (date: Date) => date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const currentPriority = PRIORITY_OPTIONS.find(p => p.value === priority)!;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text.primary} />
                        </Pressable>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerEmoji}>✅</Text>
                            <Text style={styles.headerTitle}>Nova Tarefa</Text>
                        </View>

                        <Pressable
                            onPress={handleSubmit}
                            disabled={!title.trim() || submitting}
                            style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
                        >
                            <LinearGradient colors={currentPriority.gradient as [string, string]} style={styles.saveBtnGradient}>
                                <Text style={styles.saveBtnText}>{submitting ? '...' : 'Criar'}</Text>
                            </LinearGradient>
                        </Pressable>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Title Input - Hero Style */}
                        <View style={styles.titleSection}>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="O que precisas de fazer?"
                                placeholderTextColor={COLORS.text.tertiary}
                                value={title}
                                onChangeText={setTitle}
                                autoFocus
                            />
                        </View>

                        {/* Description */}
                        <View style={styles.descriptionSection}>
                            <TextInput
                                style={styles.descriptionInput}
                                placeholder="Adicionar notas..."
                                placeholderTextColor={COLORS.text.tertiary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Priority Cards */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Prioridade</Text>
                            <View style={styles.priorityRow}>
                                {PRIORITY_OPTIONS.map(option => (
                                    <Pressable
                                        key={option.value}
                                        style={[styles.priorityCard, priority === option.value && styles.priorityCardActive]}
                                        onPress={() => setPriority(option.value)}
                                    >
                                        {priority === option.value ? (
                                            <LinearGradient colors={option.gradient as [string, string]} style={styles.priorityCardGradient}>
                                                <Ionicons name={option.icon as any} size={20} color="#FFF" />
                                                <Text style={styles.priorityTextActive}>{option.label}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <View style={styles.priorityCardInner}>
                                                <View style={[styles.priorityDot, { backgroundColor: option.color }]} />
                                                <Text style={styles.priorityText}>{option.label}</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Date & Time */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quando</Text>
                            <View style={styles.dateTimeRow}>
                                <Pressable style={styles.dateCard} onPress={() => setShowDatePicker(true)}>
                                    <View style={[styles.dateIconWrap, dueDate && { backgroundColor: '#6366F120' }]}>
                                        <Ionicons name="calendar" size={20} color={dueDate ? '#6366F1' : COLORS.text.tertiary} />
                                    </View>
                                    <View style={styles.dateInfo}>
                                        <Text style={styles.dateLabel}>Data</Text>
                                        <Text style={[styles.dateValue, dueDate && styles.dateValueActive]}>
                                            {dueDate ? formatDate(dueDate) : 'Escolher'}
                                        </Text>
                                    </View>
                                </Pressable>

                                <Pressable
                                    style={[styles.dateCard, !dueDate && styles.dateCardDisabled]}
                                    onPress={() => dueDate && setShowTimePicker(true)}
                                    disabled={!dueDate}
                                >
                                    <View style={[styles.dateIconWrap, dueDate && { backgroundColor: '#10B98120' }]}>
                                        <Ionicons name="time" size={20} color={dueDate ? '#10B981' : COLORS.text.muted} />
                                    </View>
                                    <View style={styles.dateInfo}>
                                        <Text style={styles.dateLabel}>Hora</Text>
                                        <Text style={[styles.dateValue, dueDate && styles.dateValueActive]}>
                                            {dueDate ? formatTime(dueDate) : '--:--'}
                                        </Text>
                                    </View>
                                </Pressable>

                                {dueDate && (
                                    <Pressable style={styles.clearDateBtn} onPress={() => setDueDate(null)}>
                                        <Ionicons name="close-circle" size={24} color={COLORS.text.tertiary} />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {/* Subtasks */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Subtarefas ({steps.length})</Text>

                            {steps.map((step, index) => (
                                <View key={index} style={styles.stepItem}>
                                    <View style={styles.stepCheck}>
                                        <Ionicons name="ellipse-outline" size={18} color={COLORS.text.tertiary} />
                                    </View>
                                    <Text style={styles.stepText}>{step}</Text>
                                    <Pressable style={styles.stepRemove} onPress={() => removeStep(index)}>
                                        <Ionicons name="close" size={18} color={COLORS.text.tertiary} />
                                    </Pressable>
                                </View>
                            ))}

                            <View style={styles.addStepRow}>
                                <Ionicons name="add-circle-outline" size={20} color={COLORS.text.tertiary} />
                                <TextInput
                                    style={styles.stepInput}
                                    placeholder="Adicionar subtarefa..."
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={newStep}
                                    onChangeText={setNewStep}
                                    onSubmitEditing={handleAddStep}
                                    returnKeyType="done"
                                />
                                {newStep.trim() && (
                                    <Pressable onPress={handleAddStep}>
                                        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.addStepBtn}>
                                            <Ionicons name="checkmark" size={16} color="#FFF" />
                                        </LinearGradient>
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                        <Modal transparent animationType="fade">
                            <View style={styles.pickerOverlay}>
                                <BlurView intensity={100} tint="dark" style={styles.pickerModal}>
                                    <View style={styles.pickerHeader}>
                                        <Text style={styles.pickerTitle}>Escolher Data</Text>
                                        <Pressable onPress={() => setShowDatePicker(false)}>
                                            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                        </Pressable>
                                    </View>
                                    <DateTimePicker
                                        value={dueDate || new Date()}
                                        mode="date"
                                        display="spinner"
                                        onChange={(e, date) => { if (date) setDueDate(date); }}
                                        minimumDate={new Date()}
                                        textColor="#FFF"
                                    />
                                </BlurView>
                            </View>
                        </Modal>
                    )}

                    {/* Time Picker Modal */}
                    {showTimePicker && dueDate && (
                        <Modal transparent animationType="fade">
                            <View style={styles.pickerOverlay}>
                                <BlurView intensity={100} tint="dark" style={styles.pickerModal}>
                                    <View style={styles.pickerHeader}>
                                        <Text style={styles.pickerTitle}>Escolher Hora</Text>
                                        <Pressable onPress={() => setShowTimePicker(false)}>
                                            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                        </Pressable>
                                    </View>
                                    <DateTimePicker
                                        value={dueDate}
                                        mode="time"
                                        display="spinner"
                                        onChange={(e, date) => { if (date) setDueDate(date); }}
                                        textColor="#FFF"
                                    />
                                </BlurView>
                            </View>
                        </Modal>
                    )}
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ============================================
// STYLES - Premium Design
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceElevated },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    headerEmoji: { fontSize: 24 },
    headerTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    saveBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnGradient: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
    saveBtnText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Content
    content: { flex: 1 },

    // Title
    titleSection: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl },
    titleInput: { fontSize: 26, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },

    // Description
    descriptionSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    descriptionInput: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.md, minHeight: 80, textAlignVertical: 'top' },

    // Section
    section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
    sectionTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.md },

    // Priority
    priorityRow: { flexDirection: 'row', gap: SPACING.sm },
    priorityCard: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
    priorityCardActive: {},
    priorityCardGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.md },
    priorityCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.md, backgroundColor: COLORS.surfaceElevated },
    priorityDot: { width: 10, height: 10, borderRadius: 5 },
    priorityText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.secondary },
    priorityTextActive: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Date Time
    dateTimeRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
    dateCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, padding: SPACING.md, borderRadius: RADIUS.lg },
    dateCardDisabled: { opacity: 0.5 },
    dateIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    dateInfo: { flex: 1 },
    dateLabel: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
    dateValue: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.secondary },
    dateValueActive: { color: COLORS.text.primary },
    clearDateBtn: { padding: SPACING.xs },

    // Steps
    stepItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
    stepCheck: { marginRight: SPACING.sm },
    stepText: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary },
    stepRemove: { padding: SPACING.xs },
    addStepRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md },
    stepInput: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary },
    addStepBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    // Picker
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    pickerModal: { width: '85%', borderRadius: RADIUS.xl, padding: SPACING.lg, overflow: 'hidden' },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
    pickerTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
});
