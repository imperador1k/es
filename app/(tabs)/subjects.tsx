import { AddClassModal } from '@/components/schedule/AddClassModal';
import { SUBJECT_COLORS, useSchedule, useSubjects } from '@/hooks/useSubjects';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { DAY_NAMES, DayOfWeek, Subject } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

// ============================================
// VALIDAÇÃO COM ZOD
// ============================================

const subjectSchema = z.object({
    name: z.string().min(1, 'O nome é obrigatório').max(50, 'Máximo 50 caracteres'),
    teacher_name: z.string().max(100, 'Máximo 100 caracteres').optional().or(z.literal('')),
    room: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

// ============================================
// COMPONENTE: Subject Card
// ============================================

interface SubjectCardProps {
    subject: Subject;
    onPress: () => void;
    onLongPress: () => void;
}

function SubjectCard({ subject, onPress, onLongPress }: SubjectCardProps) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.subjectCard,
                pressed && styles.subjectCardPressed,
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
        >
            <View style={[styles.colorDot, { backgroundColor: subject.color }]} />
            <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                {subject.teacher_name && (
                    <Text style={styles.subjectTeacher}>
                        <Ionicons name="person-outline" size={12} color={colors.text.tertiary} />
                        {' '}{subject.teacher_name}
                    </Text>
                )}
                {subject.room && (
                    <Text style={styles.subjectRoom}>
                        <Ionicons name="location-outline" size={12} color={colors.text.tertiary} />
                        {' '}{subject.room}
                    </Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </Pressable>
    );
}

// ============================================
// COMPONENTE: Empty State
// ============================================

function EmptyState() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="book-outline" size={64} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sem disciplinas</Text>
            <Text style={styles.emptyText}>
                Adiciona as tuas disciplinas para organizar o horário e as tarefas.
            </Text>
        </View>
    );
}

// ============================================
// COMPONENTE: Color Picker
// ============================================

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
    return (
        <View style={styles.colorPickerContainer}>
            <Text style={styles.inputLabel}>Cor</Text>
            <View style={styles.colorOptions}>
                {SUBJECT_COLORS.map((color) => (
                    <Pressable
                        key={color}
                        style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            value === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => onChange(color)}
                    >
                        {value === color && (
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        )}
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

// ============================================
// COMPONENTE: Add/Edit Modal
// ============================================

interface SubjectModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: SubjectFormData) => Promise<void>;
    initialData?: Subject | null;
    saving: boolean;
}

function SubjectModal({ visible, onClose, onSave, initialData, saving }: SubjectModalProps) {
    const isEditing = !!initialData;

    const { control, handleSubmit, formState: { errors }, reset } = useForm<SubjectFormData>({
        resolver: zodResolver(subjectSchema),
        defaultValues: {
            name: initialData?.name || '',
            teacher_name: initialData?.teacher_name || '',
            room: initialData?.room || '',
            color: initialData?.color || SUBJECT_COLORS[0],
        },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = async (data: SubjectFormData) => {
        await onSave(data);
        reset();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Pressable onPress={handleClose} style={styles.modalCloseButton}>
                            <Text style={styles.modalCloseText}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>
                            {isEditing ? 'Editar Disciplina' : 'Nova Disciplina'}
                        </Text>
                        <Pressable
                            onPress={handleSubmit(onSubmit)}
                            style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                                <Text style={styles.modalSaveText}>Guardar</Text>
                            )}
                        </Pressable>
                    </View>

                    {/* Form */}
                    <View style={styles.formContainer}>
                        {/* Nome */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nome *</Text>
                            <Controller
                                control={control}
                                name="name"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <TextInput
                                        style={[styles.input, errors.name && styles.inputError]}
                                        placeholder="Ex: Matemática, Inglês..."
                                        placeholderTextColor={colors.text.tertiary}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        autoFocus
                                    />
                                )}
                            />
                            {errors.name && (
                                <Text style={styles.errorText}>{errors.name.message}</Text>
                            )}
                        </View>

                        {/* Professor */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Professor</Text>
                            <Controller
                                control={control}
                                name="teacher_name"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: Prof. João Silva"
                                        placeholderTextColor={colors.text.tertiary}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                    />
                                )}
                            />
                        </View>

                        {/* Sala */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Sala (default)</Text>
                            <Controller
                                control={control}
                                name="room"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ex: B204, Anfiteatro 1..."
                                        placeholderTextColor={colors.text.tertiary}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                    />
                                )}
                            />
                        </View>

                        {/* Color Picker */}
                        <Controller
                            control={control}
                            name="color"
                            render={({ field: { value, onChange } }) => (
                                <ColorPicker value={value} onChange={onChange} />
                            )}
                        />
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

// ============================================
// COMPONENTE: Delete Confirmation Modal
// ============================================

interface DeleteModalProps {
    visible: boolean;
    subject: Subject | null;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}

function DeleteModal({ visible, subject, onClose, onConfirm, deleting }: DeleteModalProps) {
    if (!subject) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.deleteModalOverlay}>
                <View style={styles.deleteModalContent}>
                    <View style={[styles.deleteIconContainer, { backgroundColor: subject.color + '20' }]}>
                        <Ionicons name="trash-outline" size={32} color={colors.danger.primary} />
                    </View>
                    <Text style={styles.deleteTitle}>Eliminar Disciplina?</Text>
                    <Text style={styles.deleteText}>
                        A disciplina "{subject.name}" e todas as aulas associadas serão eliminadas permanentemente.
                    </Text>
                    <View style={styles.deleteButtons}>
                        <Pressable style={styles.deleteCancelButton} onPress={onClose}>
                            <Text style={styles.deleteCancelText}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.deleteConfirmButton, deleting && styles.deleteConfirmButtonDisabled]}
                            onPress={onConfirm}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.deleteConfirmText}>Eliminar</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function SubjectsScreen() {
    const { subjects, loading, error, fetchSubjects, addSubject, updateSubject, deleteSubject } = useSubjects();
    const { schedule, loading: scheduleLoading, fetchSchedule, getScheduleByDay } = useSchedule();

    const [modalVisible, setModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [classModalVisible, setClassModalVisible] = useState(false);
    const [fabExpanded, setFabExpanded] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Buscar dados ao montar
    useEffect(() => {
        fetchSchedule();
    }, []);

    // Refresh handler
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchSubjects(), fetchSchedule()]);
        setRefreshing(false);
    }, [fetchSubjects, fetchSchedule]);

    // Organizar horário por dia
    const scheduleByDay = getScheduleByDay();

    // Open modal for new subject
    const handleAddNew = () => {
        setSelectedSubject(null);
        setModalVisible(true);
    };

    // Open modal for editing
    const handleEdit = (subject: Subject) => {
        setSelectedSubject(subject);
        setModalVisible(true);
    };

    // Open delete confirmation
    const handleDeletePress = (subject: Subject) => {
        setSelectedSubject(subject);
        setDeleteModalVisible(true);
    };

    // Save subject (create or update)
    const handleSave = async (data: SubjectFormData) => {
        setSaving(true);
        try {
            if (selectedSubject) {
                // Update
                await updateSubject(selectedSubject.id, {
                    name: data.name,
                    teacher_name: data.teacher_name || null,
                    room: data.room || null,
                    color: data.color,
                });
            } else {
                // Create
                await addSubject({
                    name: data.name,
                    teacher_name: data.teacher_name || null,
                    room: data.room || null,
                    color: data.color,
                });
            }
            setModalVisible(false);
            setSelectedSubject(null);
        } catch (err) {
            console.error('Erro ao guardar disciplina:', err);
        } finally {
            setSaving(false);
        }
    };

    // Delete subject
    const handleDelete = async () => {
        if (!selectedSubject) return;

        setDeleting(true);
        try {
            await deleteSubject(selectedSubject.id);
            setDeleteModalVisible(false);
            setSelectedSubject(null);
        } catch (err) {
            console.error('Erro ao eliminar disciplina:', err);
        } finally {
            setDeleting(false);
        }
    };

    // Render subject item
    const renderSubject = ({ item }: { item: Subject }) => (
        <SubjectCard
            subject={item}
            onPress={() => handleEdit(item)}
            onLongPress={() => handleDeletePress(item)}
        />
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Disciplinas</Text>
                <Text style={styles.subtitle}>
                    {subjects.length} {subjects.length === 1 ? 'disciplina' : 'disciplinas'}
                </Text>
            </View>

            {/* Content */}
            {loading && subjects.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                    <Text style={styles.loadingText}>A carregar...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.danger.primary} />
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryButton} onPress={fetchSubjects}>
                        <Text style={styles.retryText}>Tentar novamente</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.accent.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {/* SECÇÃO: Disciplinas */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Disciplinas</Text>
                        <Text style={styles.sectionCount}>
                            {subjects.length} {subjects.length === 1 ? 'disciplina' : 'disciplinas'}
                        </Text>
                    </View>

                    {subjects.length === 0 ? (
                        <EmptyState />
                    ) : (
                        subjects.map((subject) => (
                            <SubjectCard
                                key={subject.id}
                                subject={subject}
                                onPress={() => handleEdit(subject)}
                                onLongPress={() => handleDeletePress(subject)}
                            />
                        ))
                    )}

                    {/* SECÇÃO: Horário */}
                    <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                        <Text style={styles.sectionTitle}>Horário</Text>
                        <Text style={styles.sectionCount}>
                            {schedule.length} {schedule.length === 1 ? 'aula' : 'aulas'}
                        </Text>
                    </View>

                    {schedule.length === 0 ? (
                        <View style={styles.emptySchedule}>
                            <Ionicons name="calendar-outline" size={40} color={colors.text.tertiary} />
                            <Text style={styles.emptyScheduleText}>
                                Sem aulas agendadas. Adiciona aulas ao teu horário!
                            </Text>
                        </View>
                    ) : (
                        Object.entries(scheduleByDay).map(([day, sessions]) => {
                            if (sessions.length === 0) return null;
                            const dayNum = Number(day) as DayOfWeek;
                            return (
                                <View key={day} style={styles.daySection}>
                                    <Text style={styles.dayTitle}>{DAY_NAMES[dayNum]}</Text>
                                    {sessions.map((session) => (
                                        <View key={session.id} style={styles.classCard}>
                                            <View style={[styles.classColorBar, { backgroundColor: session.subject.color }]} />
                                            <View style={styles.classInfo}>
                                                <Text style={styles.className}>{session.subject.name}</Text>
                                                <View style={styles.classDetails}>
                                                    <View style={styles.classDetail}>
                                                        <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                                                        <Text style={styles.classDetailText}>
                                                            {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                                                        </Text>
                                                    </View>
                                                    {(session.room || session.subject.room) && (
                                                        <View style={styles.classDetail}>
                                                            <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
                                                            <Text style={styles.classDetailText}>
                                                                {session.room || session.subject.room}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.classTypeBadge}>
                                                        <Text style={styles.classTypeBadgeText}>{session.type}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            );
                        })
                    )}

                    {/* Spacer para FAB */}
                    <View style={{ height: 120 }} />
                </ScrollView>
            )}

            {/* FAB - Expanded Menu */}
            {fabExpanded && (
                <Pressable
                    style={styles.fabOverlay}
                    onPress={() => setFabExpanded(false)}
                >
                    {/* Add Class Option */}
                    <Pressable
                        style={styles.fabOption}
                        onPress={() => {
                            setFabExpanded(false);
                            setClassModalVisible(true);
                        }}
                    >
                        <Text style={styles.fabOptionText}>Adicionar Aula</Text>
                        <View style={styles.fabOptionButton}>
                            <Ionicons name="time-outline" size={22} color={colors.accent.primary} />
                        </View>
                    </Pressable>

                    {/* Add Subject Option */}
                    <Pressable
                        style={styles.fabOption}
                        onPress={() => {
                            setFabExpanded(false);
                            handleAddNew();
                        }}
                    >
                        <Text style={styles.fabOptionText}>Nova Disciplina</Text>
                        <View style={styles.fabOptionButton}>
                            <Ionicons name="book-outline" size={22} color={colors.accent.primary} />
                        </View>
                    </Pressable>
                </Pressable>
            )}

            {/* FAB - Main Button */}
            <Pressable
                style={({ pressed }) => [
                    styles.fab,
                    pressed && styles.fabPressed,
                ]}
                onPress={() => setFabExpanded(!fabExpanded)}
            >
                <Ionicons
                    name={fabExpanded ? 'close' : 'add'}
                    size={28}
                    color="#FFFFFF"
                />
            </Pressable>

            {/* Add/Edit Subject Modal */}
            <SubjectModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setSelectedSubject(null);
                }}
                onSave={handleSave}
                initialData={selectedSubject}
                saving={saving}
            />

            {/* Delete Confirmation Modal */}
            <DeleteModal
                visible={deleteModalVisible}
                subject={selectedSubject}
                onClose={() => {
                    setDeleteModalVisible(false);
                    setSelectedSubject(null);
                }}
                onConfirm={handleDelete}
                deleting={deleting}
            />

            {/* Add Class Modal */}
            <AddClassModal
                visible={classModalVisible}
                onClose={() => setClassModalVisible(false)}
                onSuccess={() => fetchSchedule()}
            />
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
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },

    // Error
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    retryButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.md,
    },
    retryText: {
        color: colors.text.inverse,
        fontWeight: typography.weight.medium,
    },

    // List
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl * 4, // Space for FAB
    },
    listContentEmpty: {
        flex: 1,
    },

    // Subject Card
    subjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    subjectCardPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    colorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: spacing.md,
    },
    subjectInfo: {
        flex: 1,
    },
    subjectName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    subjectTeacher: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    subjectRoom: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // FAB
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: 100, // Acima da tab bar
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        elevation: 8, // Android shadow
        shadowColor: colors.accent.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    fabPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.95 }],
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalCloseButton: {
        paddingVertical: spacing.sm,
    },
    modalCloseText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    modalSaveButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    modalSaveButtonDisabled: {
        opacity: 0.5,
    },
    modalSaveText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },

    // Form
    formContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    inputError: {
        borderColor: colors.danger.primary,
    },
    errorText: {
        fontSize: typography.size.xs,
        color: colors.danger.primary,
        marginTop: spacing.xs,
    },

    // Color Picker
    colorPickerContainer: {
        marginBottom: spacing.lg,
    },
    colorOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: colors.text.primary,
    },

    // Delete Modal
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    deleteModalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    deleteIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    deleteTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    deleteText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    deleteButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    deleteCancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    deleteCancelText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    deleteConfirmButton: {
        flex: 1,
        paddingVertical: spacing.md,
        backgroundColor: colors.danger.primary,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    deleteConfirmButtonDisabled: {
        opacity: 0.6,
    },
    deleteConfirmText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: '#FFFFFF',
    },

    // FAB Expanded
    fabOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingRight: spacing.lg,
        paddingBottom: 170, // Acima do FAB
        zIndex: 99,
    },
    fabOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    fabOptionText: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        marginRight: spacing.sm,
        ...shadows.sm,
    },
    fabOptionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },
    fabRotated: {
        backgroundColor: colors.text.tertiary,
    },

    // ScrollView
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },

    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    sectionCount: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Empty Schedule
    emptySchedule: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    emptyScheduleText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },

    // Day Section
    daySection: {
        marginBottom: spacing.lg,
    },
    dayTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },

    // Class Card
    classCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        overflow: 'hidden',
        ...shadows.sm,
    },
    classColorBar: {
        width: 4,
    },
    classInfo: {
        flex: 1,
        padding: spacing.md,
    },
    className: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    classDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    classDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    classDetailText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    classTypeBadge: {
        backgroundColor: colors.accent.light,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    classTypeBadgeText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
});
