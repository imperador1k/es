/**
 * CreateTodoModal Component
 * Modal for creating personal to-do items with subtasks
 */

import { CreateTodoInput } from '@/hooks/usePersonalTodos';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
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

interface CreateTodoModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (todo: CreateTodoInput) => Promise<void>;
}

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Baixa', color: '#10B981' },
    { value: 'medium', label: 'Média', color: '#F59E0B' },
    { value: 'high', label: 'Alta', color: '#EF4444' },
] as const;

export function CreateTodoModal({ visible, onClose, onSubmit }: CreateTodoModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [steps, setSteps] = useState<string[]>([]);
    const [newStep, setNewStep] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reset form
    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate(null);
        setPriority('medium');
        setSteps([]);
        setNewStep('');
    };

    // Handle submit
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

    // Add step
    const handleAddStep = () => {
        if (newStep.trim()) {
            setSteps([...steps, newStep.trim()]);
            setNewStep('');
        }
    };

    // Remove step
    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    // Handle date change
    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const newDate = dueDate ? new Date(dueDate) : new Date();
            newDate.setFullYear(selectedDate.getFullYear());
            newDate.setMonth(selectedDate.getMonth());
            newDate.setDate(selectedDate.getDate());
            setDueDate(newDate);
        }
    };

    // Handle time change
    const handleTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime && dueDate) {
            const newDate = new Date(dueDate);
            newDate.setHours(selectedTime.getHours());
            newDate.setMinutes(selectedTime.getMinutes());
            setDueDate(newDate);
        }
    };

    // Format date for display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-PT', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-PT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text.primary} />
                        </Pressable>
                        <Text style={styles.headerTitle}>Nova Tarefa</Text>
                        <Pressable
                            onPress={handleSubmit}
                            style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
                            disabled={!title.trim() || submitting}
                        >
                            <Text style={[styles.saveButtonText, !title.trim() && styles.saveButtonTextDisabled]}>
                                {submitting ? 'A guardar...' : 'Guardar'}
                            </Text>
                        </Pressable>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Title */}
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="O que precisas de fazer?"
                                placeholderTextColor={colors.text.tertiary}
                                value={title}
                                onChangeText={setTitle}
                                autoFocus
                            />
                        </View>

                        {/* Description */}
                        <View style={styles.inputGroup}>
                            <TextInput
                                style={styles.descriptionInput}
                                placeholder="Adicionar notas..."
                                placeholderTextColor={colors.text.tertiary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Date & Time */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Data e Hora</Text>
                            <View style={styles.dateTimeRow}>
                                <Pressable
                                    style={[styles.dateButton, dueDate && styles.dateButtonActive]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={18}
                                        color={dueDate ? colors.accent.primary : colors.text.tertiary}
                                    />
                                    <Text style={[styles.dateButtonText, dueDate && styles.dateButtonTextActive]}>
                                        {dueDate ? formatDate(dueDate) : 'Escolher data'}
                                    </Text>
                                </Pressable>

                                {dueDate && (
                                    <Pressable
                                        style={[styles.dateButton, styles.dateButtonActive]}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Ionicons name="time-outline" size={18} color={colors.accent.primary} />
                                        <Text style={styles.dateButtonTextActive}>
                                            {formatTime(dueDate)}
                                        </Text>
                                    </Pressable>
                                )}

                                {dueDate && (
                                    <Pressable onPress={() => setDueDate(null)} style={styles.clearDateButton}>
                                        <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {/* Priority */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Prioridade</Text>
                            <View style={styles.priorityRow}>
                                {PRIORITY_OPTIONS.map(option => (
                                    <Pressable
                                        key={option.value}
                                        style={[
                                            styles.priorityButton,
                                            priority === option.value && {
                                                backgroundColor: option.color + '20',
                                                borderColor: option.color
                                            }
                                        ]}
                                        onPress={() => setPriority(option.value)}
                                    >
                                        <View style={[styles.priorityDot, { backgroundColor: option.color }]} />
                                        <Text style={[
                                            styles.priorityText,
                                            priority === option.value && { color: option.color }
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Subtasks */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Subtarefas</Text>

                            {/* Existing steps */}
                            {steps.map((step, index) => (
                                <View key={index} style={styles.stepItem}>
                                    <Ionicons name="ellipse-outline" size={16} color={colors.text.tertiary} />
                                    <Text style={styles.stepText}>{step}</Text>
                                    <Pressable onPress={() => removeStep(index)}>
                                        <Ionicons name="close" size={18} color={colors.text.tertiary} />
                                    </Pressable>
                                </View>
                            ))}

                            {/* Add step input */}
                            <View style={styles.addStepRow}>
                                <TextInput
                                    style={styles.stepInput}
                                    placeholder="Adicionar subtarefa..."
                                    placeholderTextColor={colors.text.tertiary}
                                    value={newStep}
                                    onChangeText={setNewStep}
                                    onSubmitEditing={handleAddStep}
                                    returnKeyType="done"
                                />
                                {newStep.trim() && (
                                    <Pressable onPress={handleAddStep} style={styles.addStepButton}>
                                        <Ionicons name="add" size={20} color={colors.accent.primary} />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {/* Spacer */}
                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Date Picker */}
                    {showDatePicker && (
                        <DateTimePicker
                            value={dueDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                            minimumDate={new Date()}
                        />
                    )}

                    {/* Time Picker */}
                    {showTimePicker && dueDate && (
                        <DateTimePicker
                            value={dueDate}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleTimeChange}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    closeButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    saveButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
    },
    saveButtonDisabled: {
        backgroundColor: colors.surfaceSubtle,
    },
    saveButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    saveButtonTextDisabled: {
        color: colors.text.tertiary,
    },
    content: {
        padding: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    titleInput: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        padding: 0,
    },
    descriptionInput: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        padding: 0,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.tertiary,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateButtonActive: {
        borderColor: colors.accent.primary,
        backgroundColor: colors.accent.light,
    },
    dateButtonText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    dateButtonTextActive: {
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },
    clearDateButton: {
        padding: spacing.xs,
    },
    priorityRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    priorityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    priorityDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    priorityText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    stepText: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    addStepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    stepInput: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.primary,
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
    },
    addStepButton: {
        padding: spacing.sm,
    },
});
