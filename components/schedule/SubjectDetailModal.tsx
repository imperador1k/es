/**
 * SubjectDetailModal - Premium Dark Theme
 * Modal para criar/editar disciplina E adicionar horários diretamente
 */

import { SUBJECT_COLORS, useSchedule, useSubjects } from '@/hooks/useSubjects';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import {
    CLASS_TYPE_NAMES,
    ClassType,
    DayOfWeek,
    Subject
} from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOut } from 'react-native-reanimated';

// ============================================
// TYPES
// ============================================

interface ScheduleSlot {
    id?: string;
    day_of_week: DayOfWeek;
    start_time: string;
    end_time: string;
    type: ClassType;
    room?: string;
    isNew?: boolean;
}

interface SubjectDetailModalProps {
    visible: boolean;
    onClose: () => void;
    subject?: Subject | null;
    onSuccess?: () => void;
}

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];
const CLASS_TYPES: ClassType[] = ['T', 'P', 'TP', 'S', 'PL'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ============================================
// SCHEDULE SLOT CARD
// ============================================

function ScheduleSlotCard({
    slot,
    index,
    subjectColor,
    onEdit,
    onDelete,
}: {
    slot: ScheduleSlot;
    index: number;
    subjectColor: string;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <Animated.View
            entering={FadeInRight.delay(index * 50).springify()}
            exiting={FadeOut}
            style={styles.slotCard}
        >
            <View style={[styles.slotColorBar, { backgroundColor: subjectColor }]} />
            <View style={styles.slotContent}>
                <View style={styles.slotHeader}>
                    <View style={styles.slotDayBadge}>
                        <Text style={styles.slotDayText}>{DAY_SHORT[slot.day_of_week]}</Text>
                    </View>
                    <Text style={styles.slotTime}>{slot.start_time} - {slot.end_time}</Text>
                    <View style={styles.slotTypeBadge}>
                        <Text style={styles.slotTypeText}>{slot.type}</Text>
                    </View>
                </View>
                {slot.room && (
                    <Text style={styles.slotRoom}>📍 {slot.room}</Text>
                )}
            </View>
            <View style={styles.slotActions}>
                <Pressable style={styles.slotActionBtn} onPress={onEdit}>
                    <Ionicons name="pencil" size={16} color={COLORS.text.secondary} />
                </Pressable>
                <Pressable style={styles.slotActionBtn} onPress={onDelete}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
            </View>
        </Animated.View>
    );
}

// ============================================
// ADD/EDIT SLOT INLINE
// ============================================

function EditSlotInline({
    slot,
    onSave,
    onCancel,
}: {
    slot?: ScheduleSlot;
    onSave: (slot: ScheduleSlot) => void;
    onCancel: () => void;
}) {
    const [day, setDay] = useState<DayOfWeek>(slot?.day_of_week ?? 1);
    const [startTime, setStartTime] = useState(slot?.start_time ?? '09:00');
    const [endTime, setEndTime] = useState(slot?.end_time ?? '10:30');
    const [type, setType] = useState<ClassType>(slot?.type ?? 'T');
    const [room, setRoom] = useState(slot?.room ?? '');

    const handleSave = () => {
        if (!startTime || !endTime) return;
        onSave({
            id: slot?.id,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            type,
            room: room || undefined,
            isNew: !slot?.id,
        });
    };

    return (
        <Animated.View entering={FadeInDown.springify()} style={styles.editSlotContainer}>
            {/* Days */}
            <View style={styles.editRow}>
                <Text style={styles.editLabel}>Dia</Text>
                <View style={styles.dayOptions}>
                    {WEEKDAYS.map((d) => (
                        <Pressable
                            key={d}
                            style={[styles.dayOption, day === d && styles.dayOptionActive]}
                            onPress={() => setDay(d)}
                        >
                            <Text style={[styles.dayOptionText, day === d && styles.dayOptionTextActive]}>
                                {DAY_SHORT[d]}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Time */}
            <View style={styles.editRow}>
                <Text style={styles.editLabel}>Horário</Text>
                <View style={styles.timeInputs}>
                    <TextInput
                        style={styles.timeInput}
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="09:00"
                        placeholderTextColor={COLORS.text.tertiary}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                    />
                    <Ionicons name="arrow-forward" size={18} color={COLORS.text.tertiary} />
                    <TextInput
                        style={styles.timeInput}
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholder="10:30"
                        placeholderTextColor={COLORS.text.tertiary}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                    />
                </View>
            </View>

            {/* Type */}
            <View style={styles.editRow}>
                <Text style={styles.editLabel}>Tipo</Text>
                <View style={styles.typeOptions}>
                    {CLASS_TYPES.map((t) => (
                        <Pressable
                            key={t}
                            style={[styles.typeOption, type === t && styles.typeOptionActive]}
                            onPress={() => setType(t)}
                        >
                            <Text style={[styles.typeOptionText, type === t && styles.typeOptionTextActive]}>
                                {CLASS_TYPE_NAMES[t]}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Room */}
            <View style={styles.editRow}>
                <Text style={styles.editLabel}>Sala</Text>
                <TextInput
                    style={styles.roomInput}
                    value={room}
                    onChangeText={setRoom}
                    placeholder="Ex: B204"
                    placeholderTextColor={COLORS.text.tertiary}
                />
            </View>

            {/* Actions */}
            <View style={styles.editActions}>
                <Pressable style={styles.editCancelBtn} onPress={onCancel}>
                    <Text style={styles.editCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.editSaveBtn} onPress={handleSave}>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.editSaveText}>{slot?.id ? 'Atualizar' : 'Adicionar'}</Text>
                </Pressable>
            </View>
        </Animated.View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SubjectDetailModal({
    visible,
    onClose,
    subject,
    onSuccess,
}: SubjectDetailModalProps) {
    const { addSubject, updateSubject, deleteSubject } = useSubjects();
    const { schedule, addClassSession, updateClassSession, deleteClassSession, fetchSchedule } = useSchedule();

    const isEditing = !!subject;

    // Subject fields
    const [name, setName] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [room, setRoom] = useState('');
    const [color, setColor] = useState(SUBJECT_COLORS[0]);

    // Schedule slots
    const [slots, setSlots] = useState<ScheduleSlot[]>([]);
    const [slotsToDelete, setSlotsToDelete] = useState<string[]>([]);
    const [editingSlot, setEditingSlot] = useState<ScheduleSlot | undefined>();
    const [isAddingSlot, setIsAddingSlot] = useState(false);

    const [saving, setSaving] = useState(false);

    // Load data when modal opens
    useEffect(() => {
        if (visible && subject) {
            setName(subject.name);
            setTeacherName(subject.teacher_name || '');
            setRoom(subject.room || '');
            setColor(subject.color);

            // Load existing slots for this subject
            const subjectSlots = schedule
                .filter((s) => s.subject_id === subject.id)
                .map((s) => ({
                    id: s.id,
                    day_of_week: s.day_of_week,
                    start_time: s.start_time.slice(0, 5),
                    end_time: s.end_time.slice(0, 5),
                    type: s.type,
                    room: s.room || undefined,
                }));
            setSlots(subjectSlots);
            setSlotsToDelete([]);
        } else if (visible) {
            // New subject
            setName('');
            setTeacherName('');
            setRoom('');
            setColor(SUBJECT_COLORS[0]);
            setSlots([]);
            setSlotsToDelete([]);
        }
        setEditingSlot(undefined);
        setIsAddingSlot(false);
    }, [visible, subject, schedule]);

    const handleClose = () => {
        setEditingSlot(undefined);
        setIsAddingSlot(false);
        onClose();
    };

    const handleAddSlot = (slot: ScheduleSlot) => {
        if (editingSlot?.id) {
            // Update existing
            setSlots((prev) => prev.map((s) => (s.id === editingSlot.id ? { ...slot, id: editingSlot.id } : s)));
        } else {
            // Add new
            setSlots((prev) => [...prev, { ...slot, isNew: true }]);
        }
        setEditingSlot(undefined);
        setIsAddingSlot(false);
    };

    const handleDeleteSlot = (slot: ScheduleSlot) => {
        Alert.alert(
            'Eliminar Aula',
            `Eliminar a aula de ${DAY_SHORT[slot.day_of_week]} às ${slot.start_time}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        if (slot.id) {
                            // Add to delete list and remove from local
                            setSlotsToDelete((prev) => [...prev, slot.id!]);
                        }
                        setSlots((prev) => prev.filter((s) => s !== slot));
                    },
                },
            ]
        );
    };

    const handleDeleteSubject = () => {
        if (!subject) return;
        Alert.alert(
            'Eliminar Disciplina',
            `Eliminar "${subject.name}" e todas as aulas associadas?\n\nEsta ação é permanente.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteSubject(subject.id);
                            handleClose();
                            onSuccess?.();
                        } catch (err) {
                            console.error('Erro ao eliminar:', err);
                            Alert.alert('Erro', 'Não foi possível eliminar a disciplina');
                        }
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Erro', 'O nome da disciplina é obrigatório');
            return;
        }

        setSaving(true);
        try {
            let subjectId = subject?.id;

            // Save subject
            if (isEditing && subject) {
                await updateSubject(subject.id, {
                    name: name.trim(),
                    teacher_name: teacherName.trim() || null,
                    room: room.trim() || null,
                    color,
                });
            } else {
                const newSubject = await addSubject({
                    name: name.trim(),
                    teacher_name: teacherName.trim() || null,
                    room: room.trim() || null,
                    color,
                });
                subjectId = newSubject?.id;
            }

            if (!subjectId) throw new Error('Failed to save subject');

            // Delete slots marked for deletion
            for (const slotId of slotsToDelete) {
                try {
                    await deleteClassSession(slotId);
                } catch (e) {
                    console.log('Slot already deleted or not found:', slotId);
                }
            }

            // Update or add remaining slots
            for (const slot of slots) {
                if (slot.id && !slot.isNew) {
                    // Update existing
                    await updateClassSession(slot.id, {
                        day_of_week: slot.day_of_week,
                        start_time: slot.start_time + ':00',
                        end_time: slot.end_time + ':00',
                        type: slot.type,
                        room: slot.room || null,
                    });
                } else if (slot.isNew || !slot.id) {
                    // Add new
                    await addClassSession({
                        subject_id: subjectId,
                        day_of_week: slot.day_of_week,
                        start_time: slot.start_time + ':00',
                        end_time: slot.end_time + ':00',
                        type: slot.type,
                        room: slot.room || null,
                    });
                }
            }

            await fetchSchedule();
            handleClose();
            onSuccess?.();
        } catch (err) {
            console.error('Erro ao guardar:', err);
            Alert.alert('Erro', 'Não foi possível guardar a disciplina');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <View style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={handleClose}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.title}>{isEditing ? 'Editar' : 'Nova'} Disciplina</Text>
                        <Pressable onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                                <Text style={styles.saveText}>Guardar</Text>
                            )}
                        </Pressable>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* ========== SUBJECT INFO ========== */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📚 Informações</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nome *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Ex: Matemática"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    autoFocus={!isEditing}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Professor</Text>
                                <TextInput
                                    style={styles.input}
                                    value={teacherName}
                                    onChangeText={setTeacherName}
                                    placeholder="Ex: Prof. João Silva"
                                    placeholderTextColor={COLORS.text.tertiary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Sala padrão</Text>
                                <TextInput
                                    style={styles.input}
                                    value={room}
                                    onChangeText={setRoom}
                                    placeholder="Ex: B204"
                                    placeholderTextColor={COLORS.text.tertiary}
                                />
                            </View>

                            {/* Color Picker */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Cor</Text>
                                <View style={styles.colorPicker}>
                                    {SUBJECT_COLORS.map((c) => (
                                        <Pressable
                                            key={c}
                                            style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorOptionSelected]}
                                            onPress={() => setColor(c)}
                                        >
                                            {color === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* ========== SCHEDULE SLOTS ========== */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>📅 Horários</Text>
                                {!isAddingSlot && !editingSlot && (
                                    <Pressable style={styles.addSlotBtn} onPress={() => setIsAddingSlot(true)}>
                                        <Ionicons name="add" size={18} color="#FFF" />
                                        <Text style={styles.addSlotText}>Aula</Text>
                                    </Pressable>
                                )}
                            </View>

                            {slots.length === 0 && !isAddingSlot && (
                                <View style={styles.emptySlots}>
                                    <Ionicons name="calendar-outline" size={32} color={COLORS.text.tertiary} />
                                    <Text style={styles.emptySlotsText}>Nenhum horário definido</Text>
                                    <Text style={styles.emptySlotsHint}>Adiciona os dias e horas das aulas</Text>
                                </View>
                            )}

                            {slots.map((slot, index) => (
                                <ScheduleSlotCard
                                    key={slot.id || `new-${index}`}
                                    slot={slot}
                                    index={index}
                                    subjectColor={color}
                                    onEdit={() => setEditingSlot(slot)}
                                    onDelete={() => handleDeleteSlot(slot)}
                                />
                            ))}

                            {(isAddingSlot || editingSlot) && (
                                <EditSlotInline
                                    slot={editingSlot}
                                    onSave={handleAddSlot}
                                    onCancel={() => {
                                        setIsAddingSlot(false);
                                        setEditingSlot(undefined);
                                    }}
                                />
                            )}
                        </View>

                        {/* ========== DELETE BUTTON ========== */}
                        {isEditing && (
                            <Pressable style={styles.deleteSubjectBtn} onPress={handleDeleteSubject}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                <Text style={styles.deleteSubjectText}>Eliminar Disciplina</Text>
                            </Pressable>
                        )}

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    cancelText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    title: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    saveText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#6366F1',
    },

    content: {
        flex: 1,
        padding: SPACING.lg,
    },

    section: {
        marginBottom: SPACING['2xl'],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },

    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },

    // Color Picker
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
    },

    // Add Slot Button
    addSlotBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: '#6366F1',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
    },
    addSlotText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // Empty Slots
    emptySlots: {
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
    },
    emptySlotsText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginTop: SPACING.sm,
    },
    emptySlotsHint: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },

    // Slot Card
    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.sm,
    },
    slotColorBar: {
        width: 4,
        height: '100%',
    },
    slotContent: {
        flex: 1,
        padding: SPACING.md,
    },
    slotHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    slotDayBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    slotDayText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#6366F1',
    },
    slotTime: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    slotTypeBadge: {
        backgroundColor: COLORS.surfaceMuted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    slotTypeText: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.tertiary,
    },
    slotRoom: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },
    slotActions: {
        flexDirection: 'row',
        gap: SPACING.xs,
        paddingRight: SPACING.sm,
    },
    slotActionBtn: {
        padding: SPACING.sm,
    },

    // Edit Slot Inline
    editSlotContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: '#6366F1',
    },
    editRow: {
        marginBottom: SPACING.lg,
    },
    editLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    dayOptions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    dayOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.md,
    },
    dayOptionActive: {
        backgroundColor: '#6366F1',
    },
    dayOptionText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    dayOptionTextActive: {
        color: '#FFF',
    },
    timeInputs: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    timeInput: {
        flex: 1,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        textAlign: 'center',
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    typeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    typeOption: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.md,
    },
    typeOptionActive: {
        backgroundColor: '#6366F1',
    },
    typeOptionText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
    },
    typeOptionTextActive: {
        color: '#FFF',
        fontWeight: TYPOGRAPHY.weight.semibold,
    },
    roomInput: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },
    editActions: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginTop: SPACING.md,
    },
    editCancelBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
    },
    editCancelText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    editSaveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        backgroundColor: '#6366F1',
        borderRadius: RADIUS.lg,
    },
    editSaveText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // Delete Subject Button
    deleteSubjectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.lg,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        marginTop: SPACING.lg,
    },
    deleteSubjectText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#EF4444',
    },
});
