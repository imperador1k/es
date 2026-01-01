/**
 * AddEventModal Component
 * Modal para adicionar eventos, reuniões ou sessões de estudo ao calendário
 * Diferente das aulas - não requer disciplina
 */

import { RADIUS as borderRadius, COLORS as colors, SPACING as spacing, TYPOGRAPHY as typography } from '@/lib/theme.premium';
import { DAY_NAMES, DayOfWeek } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
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
import { z } from 'zod';

// ============================================
// TYPES
// ============================================

export type EventType = 'meeting' | 'study' | 'event';

interface EventTypeConfig {
    type: EventType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    gradient: [string, string];
    placeholder: string;
}

const EVENT_TYPES: EventTypeConfig[] = [
    {
        type: 'study',
        label: 'Sessão de Estudo',
        icon: 'library-outline',
        color: '#10B981',
        gradient: ['#10B981', '#059669'],
        placeholder: 'Ex: Estudar para exame de Física',
    },
    {
        type: 'meeting',
        label: 'Reunião',
        icon: 'people-outline',
        color: '#F59E0B',
        gradient: ['#F59E0B', '#D97706'],
        placeholder: 'Ex: Reunião de grupo - Projeto Final',
    },
    {
        type: 'event',
        label: 'Evento',
        icon: 'calendar-outline',
        color: '#8B5CF6',
        gradient: ['#8B5CF6', '#7C3AED'],
        placeholder: 'Ex: Entrega de trabalho',
    },
];

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]; // Seg-Dom

// ============================================
// VALIDATION
// ============================================

const eventSchema = z.object({
    title: z.string().min(1, 'O título é obrigatório').max(100, 'Máximo 100 caracteres'),
    description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    day_of_week: z.number().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    location: z.string().max(100, 'Máximo 100 caracteres').optional().or(z.literal('')),
    event_type: z.enum(['meeting', 'study', 'event']),
}).refine(
    (data) => {
        const start = data.start_time.split(':').map(Number);
        const end = data.end_time.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        return endMinutes > startMinutes;
    },
    { message: 'Hora fim deve ser depois da hora início', path: ['end_time'] }
);

type EventFormData = z.infer<typeof eventSchema>;

// ============================================
// PROPS
// ============================================

interface AddEventModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialDay?: DayOfWeek;
    initialHour?: number;
    initialType?: EventType;
}

// ============================================
// COMPONENT
// ============================================

export function AddEventModal({
    visible,
    onClose,
    onSuccess,
    initialDay = 1,
    initialHour = 9,
    initialType = 'study',
}: AddEventModalProps) {
    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            title: '',
            description: '',
            day_of_week: initialDay,
            start_time: `${initialHour.toString().padStart(2, '0')}:00`,
            end_time: `${(initialHour + 1).toString().padStart(2, '0')}:00`,
            location: '',
            event_type: initialType,
        },
    });

    const selectedType = watch('event_type');
    const typeConfig = EVENT_TYPES.find((t) => t.type === selectedType) || EVENT_TYPES[0];

    // Reset form when modal opens with new values
    useEffect(() => {
        if (visible) {
            reset({
                title: '',
                description: '',
                day_of_week: initialDay,
                start_time: `${initialHour.toString().padStart(2, '0')}:00`,
                end_time: `${(initialHour + 1).toString().padStart(2, '0')}:00`,
                location: '',
                event_type: initialType,
            });
        }
    }, [visible, initialDay, initialHour, initialType]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = async (data: EventFormData) => {
        try {
            // TODO: Save to database
            console.log('Creating event:', data);

            // For now, just close and show success
            handleClose();
            onSuccess?.();
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.headerTitle}>Novo {typeConfig.label}</Text>
                        <Pressable
                            onPress={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                                <Text style={styles.saveText}>Guardar</Text>
                            )}
                        </Pressable>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        {/* Event Type Selector */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Tipo</Text>
                            <View style={styles.typeSelector}>
                                {EVENT_TYPES.map((type) => (
                                    <Pressable
                                        key={type.type}
                                        style={[
                                            styles.typeOption,
                                            selectedType === type.type && styles.typeOptionSelected,
                                            selectedType === type.type && { borderColor: type.color },
                                        ]}
                                        onPress={() => setValue('event_type', type.type)}
                                    >
                                        <LinearGradient
                                            colors={selectedType === type.type ? type.gradient : [colors.surfaceMuted, colors.surfaceMuted]}
                                            style={styles.typeIcon}
                                        >
                                            <Ionicons
                                                name={type.icon}
                                                size={20}
                                                color={selectedType === type.type ? '#FFFFFF' : colors.text.tertiary}
                                            />
                                        </LinearGradient>
                                        <Text style={[
                                            styles.typeLabel,
                                            selectedType === type.type && { color: type.color },
                                        ]}>
                                            {type.label.split(' ')[0]}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Title */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Título *</Text>
                            <Controller
                                control={control}
                                name="title"
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        style={[styles.input, errors.title && styles.inputError]}
                                        value={value}
                                        onChangeText={onChange}
                                        placeholder={typeConfig.placeholder}
                                        placeholderTextColor={colors.text.tertiary}
                                    />
                                )}
                            />
                            {errors.title && (
                                <Text style={styles.errorText}>{errors.title.message}</Text>
                            )}
                        </View>

                        {/* Day Selector */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Dia</Text>
                            <Controller
                                control={control}
                                name="day_of_week"
                                render={({ field: { onChange, value } }) => (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={styles.daySelector}>
                                            {WEEKDAYS.map((day) => (
                                                <Pressable
                                                    key={day}
                                                    style={[
                                                        styles.dayOption,
                                                        value === day && styles.dayOptionSelected,
                                                    ]}
                                                    onPress={() => onChange(day)}
                                                >
                                                    <Text style={[
                                                        styles.dayText,
                                                        value === day && styles.dayTextSelected,
                                                    ]}>
                                                        {DAY_NAMES[day].slice(0, 3)}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </ScrollView>
                                )}
                            />
                        </View>

                        {/* Time */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Horário</Text>
                            <View style={styles.timeRow}>
                                <View style={styles.timeField}>
                                    <Text style={styles.timeLabel}>Início</Text>
                                    <Controller
                                        control={control}
                                        name="start_time"
                                        render={({ field: { onChange, value } }) => (
                                            <TextInput
                                                style={[styles.timeInput, errors.start_time && styles.inputError]}
                                                value={value}
                                                onChangeText={onChange}
                                                placeholder="09:00"
                                                placeholderTextColor={colors.text.tertiary}
                                                keyboardType="numbers-and-punctuation"
                                            />
                                        )}
                                    />
                                </View>
                                <View style={styles.timeSeparator}>
                                    <Ionicons name="arrow-forward" size={20} color={colors.text.tertiary} />
                                </View>
                                <View style={styles.timeField}>
                                    <Text style={styles.timeLabel}>Fim</Text>
                                    <Controller
                                        control={control}
                                        name="end_time"
                                        render={({ field: { onChange, value } }) => (
                                            <TextInput
                                                style={[styles.timeInput, errors.end_time && styles.inputError]}
                                                value={value}
                                                onChangeText={onChange}
                                                placeholder="10:00"
                                                placeholderTextColor={colors.text.tertiary}
                                                keyboardType="numbers-and-punctuation"
                                            />
                                        )}
                                    />
                                </View>
                            </View>
                            {errors.end_time && (
                                <Text style={styles.errorText}>{errors.end_time.message}</Text>
                            )}
                        </View>

                        {/* Location */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Local (opcional)</Text>
                            <Controller
                                control={control}
                                name="location"
                                render={({ field: { onChange, value } }) => (
                                    <View style={styles.inputWithIcon}>
                                        <Ionicons name="location-outline" size={20} color={colors.text.tertiary} />
                                        <TextInput
                                            style={styles.inputIconText}
                                            value={value}
                                            onChangeText={onChange}
                                            placeholder="Ex: Sala B2.01, Biblioteca, Online..."
                                            placeholderTextColor={colors.text.tertiary}
                                        />
                                    </View>
                                )}
                            />
                        </View>

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Notas (opcional)</Text>
                            <Controller
                                control={control}
                                name="description"
                                render={({ field: { onChange, value } }) => (
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={value}
                                        onChangeText={onChange}
                                        placeholder="Adiciona detalhes sobre este evento..."
                                        placeholderTextColor={colors.text.tertiary}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                )}
                            />
                        </View>

                        {/* Spacer */}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
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
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceElevated,
    },
    closeButton: {
        paddingVertical: spacing.sm,
    },
    closeText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    saveButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    form: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },

    // Type Selector
    typeSelector: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    typeOption: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.surfaceElevated,
    },
    typeOptionSelected: {
        backgroundColor: colors.surface,
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    typeLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },

    // Input
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    inputError: {
        borderColor: colors.error,
    },
    textArea: {
        minHeight: 100,
    },
    errorText: {
        fontSize: typography.size.xs,
        color: colors.error,
        marginTop: spacing.xs,
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    inputIconText: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // Day Selector
    daySelector: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    dayOption: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.surfaceElevated,
    },
    dayOptionSelected: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    dayText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    dayTextSelected: {
        color: '#FFFFFF',
        fontWeight: typography.weight.bold,
    },

    // Time
    timeRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.md,
    },
    timeField: {
        flex: 1,
    },
    timeLabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginBottom: spacing.xs,
    },
    timeInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        textAlign: 'center',
    },
    timeSeparator: {
        paddingBottom: spacing.md,
    },
});
