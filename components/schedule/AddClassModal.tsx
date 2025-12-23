/**
 * Modal para Adicionar/Editar Aula no Horário
 * Escola+ App
 */

import { TimePicker } from '@/components/ui/TimePicker';
import { useSchedule, useSubjects } from '@/hooks/useSubjects';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import {
    CLASS_TYPE_NAMES,
    ClassSession,
    ClassType,
    DAY_NAMES,
    DayOfWeek,
} from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

// ============================================
// VALIDAÇÃO COM ZOD
// ============================================

const classSchema = z.object({
    subject_id: z.string().min(1, 'Seleciona uma disciplina'),
    day_of_week: z.number().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    type: z.enum(['T', 'P', 'TP', 'S', 'PL']),
    room: z.string().optional(),
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

type ClassFormData = z.infer<typeof classSchema>;

// ============================================
// CONSTANTES
// ============================================

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5]; // Segunda a Sexta
const CLASS_TYPES: ClassType[] = ['T', 'P', 'TP', 'S', 'PL'];

// ============================================
// PROPS
// ============================================

interface AddClassModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: ClassSession | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AddClassModal({ visible, onClose, onSuccess, initialData }: AddClassModalProps) {
    const { subjects, fetchSubjects, loading: loadingSubjects } = useSubjects();
    const { addClassSession, updateClassSession } = useSchedule();
    const [saving, setSaving] = useState(false);
    const isEditing = !!initialData;

    const { control, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ClassFormData>({
        resolver: zodResolver(classSchema),
        defaultValues: {
            subject_id: initialData?.subject_id || '',
            day_of_week: initialData?.day_of_week ?? 1,
            start_time: initialData?.start_time?.slice(0, 5) || '09:00',
            end_time: initialData?.end_time?.slice(0, 5) || '10:30',
            type: initialData?.type || 'T',
            room: initialData?.room || '',
        },
    });

    const selectedSubjectId = watch('subject_id');
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

    // Buscar disciplinas quando modal abre
    useEffect(() => {
        if (visible) {
            fetchSubjects();
        }
    }, [visible, fetchSubjects]);

    // Atualizar sala default quando muda a disciplina
    useEffect(() => {
        if (selectedSubject?.room && !initialData) {
            setValue('room', selectedSubject.room);
        }
    }, [selectedSubject, setValue, initialData]);

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = async (data: ClassFormData) => {
        setSaving(true);
        try {
            if (isEditing && initialData) {
                await updateClassSession(initialData.id, {
                    day_of_week: data.day_of_week as DayOfWeek,
                    start_time: data.start_time + ':00',
                    end_time: data.end_time + ':00',
                    type: data.type,
                    room: data.room || null,
                });
            } else {
                await addClassSession({
                    subject_id: data.subject_id,
                    day_of_week: data.day_of_week as DayOfWeek,
                    start_time: data.start_time + ':00',
                    end_time: data.end_time + ':00',
                    type: data.type,
                    room: data.room || null,
                });
            }
            handleClose();
            onSuccess?.();
        } catch (err) {
            console.error('Erro ao guardar aula:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={handleClose}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.title}>
                            {isEditing ? 'Editar Aula' : 'Nova Aula'}
                        </Text>
                        <Pressable
                            onPress={handleSubmit(onSubmit)}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                                <Text style={styles.saveText}>Guardar</Text>
                            )}
                        </Pressable>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        {/* Disciplina */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Disciplina *</Text>
                            <Controller
                                control={control}
                                name="subject_id"
                                render={({ field: { value, onChange } }) => (
                                    <View style={styles.subjectSelector}>
                                        {loadingSubjects ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="small" color={colors.accent.primary} />
                                                <Text style={styles.loadingText}>A carregar disciplinas...</Text>
                                            </View>
                                        ) : subjects.length === 0 ? (
                                            <Text style={styles.noSubjectsText}>
                                                Cria primeiro uma disciplina no ecrã "Aulas"
                                            </Text>
                                        ) : (
                                            subjects.map((subject) => (
                                                <Pressable
                                                    key={subject.id}
                                                    style={[
                                                        styles.subjectOption,
                                                        value === subject.id && styles.subjectOptionSelected,
                                                        { borderColor: subject.color },
                                                    ]}
                                                    onPress={() => onChange(subject.id)}
                                                >
                                                    <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                                                    <Text
                                                        style={[
                                                            styles.subjectText,
                                                            value === subject.id && styles.subjectTextSelected,
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {subject.name}
                                                    </Text>
                                                </Pressable>
                                            ))
                                        )}
                                    </View>
                                )}
                            />
                            {errors.subject_id && (
                                <Text style={styles.errorText}>{errors.subject_id.message}</Text>
                            )}
                        </View>

                        {/* Dia da Semana */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Dia da Semana</Text>
                            <Controller
                                control={control}
                                name="day_of_week"
                                render={({ field: { value, onChange } }) => (
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
                                                <Text
                                                    style={[
                                                        styles.dayText,
                                                        value === day && styles.dayTextSelected,
                                                    ]}
                                                >
                                                    {DAY_NAMES[day].slice(0, 3)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            />
                        </View>

                        {/* Horário */}
                        <View style={styles.timeRow}>
                            <View style={styles.timeColumn}>
                                <Controller
                                    control={control}
                                    name="start_time"
                                    render={({ field: { value, onChange } }) => (
                                        <TimePicker
                                            label="Início"
                                            value={value}
                                            onChange={onChange}
                                            error={errors.start_time?.message}
                                        />
                                    )}
                                />
                            </View>
                            <View style={styles.timeSeparator}>
                                <Ionicons name="arrow-forward" size={20} color={colors.text.tertiary} />
                            </View>
                            <View style={styles.timeColumn}>
                                <Controller
                                    control={control}
                                    name="end_time"
                                    render={({ field: { value, onChange } }) => (
                                        <TimePicker
                                            label="Fim"
                                            value={value}
                                            onChange={onChange}
                                            error={errors.end_time?.message}
                                        />
                                    )}
                                />
                            </View>
                        </View>

                        {/* Tipo de Aula */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tipo de Aula</Text>
                            <Controller
                                control={control}
                                name="type"
                                render={({ field: { value, onChange } }) => (
                                    <View style={styles.typeSelector}>
                                        {CLASS_TYPES.map((type) => (
                                            <Pressable
                                                key={type}
                                                style={[
                                                    styles.typeOption,
                                                    value === type && styles.typeOptionSelected,
                                                ]}
                                                onPress={() => onChange(type)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.typeText,
                                                        value === type && styles.typeTextSelected,
                                                    ]}
                                                >
                                                    {CLASS_TYPE_NAMES[type]}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            />
                        </View>

                        {/* Sala (opcional, preenchida da disciplina) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Sala</Text>
                            <Controller
                                control={control}
                                name="room"
                                render={({ field: { value, onChange } }) => (
                                    <Pressable
                                        style={styles.roomInput}
                                        onPress={() => {
                                            // Podemos adicionar um input aqui depois
                                        }}
                                    >
                                        <Ionicons name="location-outline" size={18} color={colors.text.tertiary} />
                                        <Text style={[styles.roomText, !value && styles.roomPlaceholder]}>
                                            {value || 'Sala (opcional)'}
                                        </Text>
                                    </Pressable>
                                )}
                            />
                        </View>

                        {/* Preview */}
                        {selectedSubject && (
                            <View style={[styles.preview, { borderLeftColor: selectedSubject.color }]}>
                                <Text style={styles.previewTitle}>Pré-visualização</Text>
                                <Text style={styles.previewSubject}>{selectedSubject.name}</Text>
                                <Text style={styles.previewDetails}>
                                    {DAY_NAMES[watch('day_of_week') as DayOfWeek]} • {watch('start_time')} - {watch('end_time')}
                                </Text>
                            </View>
                        )}
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
        borderBottomColor: colors.divider,
    },
    cancelText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    title: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
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
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    errorText: {
        fontSize: typography.size.xs,
        color: colors.danger.primary,
        marginTop: spacing.xs,
    },

    // Subject Selector
    subjectSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    subjectOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        borderWidth: 2,
        backgroundColor: colors.surface,
        gap: spacing.xs,
    },
    subjectOptionSelected: {
        backgroundColor: colors.accent.subtle,
    },
    subjectDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    subjectText: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    subjectTextSelected: {
        fontWeight: typography.weight.semibold,
    },
    noSubjectsText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Day Selector
    daySelector: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    dayOption: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    dayOptionSelected: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    dayText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    dayTextSelected: {
        color: colors.text.inverse,
    },

    // Time Row
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    timeColumn: {
        flex: 1,
    },
    timeSeparator: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
    },

    // Type Selector
    typeSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    typeOption: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    typeOptionSelected: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    typeText: {
        fontSize: typography.size.xs,
        color: colors.text.primary,
    },
    typeTextSelected: {
        color: colors.text.inverse,
        fontWeight: typography.weight.semibold,
    },

    // Room Input
    roomInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    roomText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    roomPlaceholder: {
        color: colors.text.tertiary,
    },

    // Preview
    preview: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderLeftWidth: 4,
        marginTop: spacing.md,
        marginBottom: spacing.xl,
        ...shadows.sm,
    },
    previewTitle: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginBottom: spacing.xs,
    },
    previewSubject: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    previewDetails: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
});
