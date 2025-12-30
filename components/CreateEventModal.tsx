/**
 * Create Event Modal
 * Modal inteligente para criar eventos ou todos
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

// ============================================
// TYPES
// ============================================

interface CreateEventModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialDate?: Date;
}

type MainCategory = 'escola' | 'pessoal';
type SchoolSubCategory = 'exame' | 'teste' | 'apresentação' | 'estudo';
type PersonalSubCategory = 'lembrete' | 'tarefa';

const SCHOOL_CATEGORIES: { id: SchoolSubCategory; label: string; icon: string; color: string }[] = [
    { id: 'exame', label: 'Exame', icon: 'school', color: '#EF4444' },
    { id: 'teste', label: 'Teste', icon: 'document-text', color: '#F59E0B' },
    { id: 'apresentação', label: 'Apresentação', icon: 'easel', color: '#8B5CF6' },
    { id: 'estudo', label: 'Estudo', icon: 'book', color: '#6366F1' },
];

const PERSONAL_CATEGORIES: { id: PersonalSubCategory; label: string; icon: string; color: string }[] = [
    { id: 'lembrete', label: 'Lembrete', icon: 'alarm', color: '#EC4899' },
    { id: 'tarefa', label: 'Tarefa', icon: 'checkbox', color: '#10B981' },
];

// ============================================
// COMPONENT
// ============================================

export function CreateEventModal({
    visible,
    onClose,
    onSuccess,
    initialDate = new Date(),
}: CreateEventModalProps) {
    const { user } = useAuthContext();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [mainCategory, setMainCategory] = useState<MainCategory>('escola');
    const [schoolCategory, setSchoolCategory] = useState<SchoolSubCategory>('exame');
    const [personalCategory, setPersonalCategory] = useState<PersonalSubCategory>('lembrete');
    const [startDate, setStartDate] = useState(initialDate);
    const [startTime, setStartTime] = useState(initialDate);
    const [saving, setSaving] = useState(false);

    // Picker visibility
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Reset form
    const resetForm = () => {
        setTitle('');
        setDescription('');
        setLocation('');
        setMainCategory('escola');
        setSchoolCategory('exame');
        setPersonalCategory('lembrete');
        setStartDate(initialDate);
        setStartTime(initialDate);
    };

    // Handle save
    const handleSave = async () => {
        if (!title.trim() || !user?.id) return;

        setSaving(true);

        try {
            // Combine date and time
            const combinedDate = new Date(startDate);
            combinedDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

            if (mainCategory === 'escola') {
                // Save to events table
                const selectedCat = SCHOOL_CATEGORIES.find(c => c.id === schoolCategory);
                const { error } = await supabase.from('events').insert({
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    start_time: combinedDate.toISOString(),
                    end_time: new Date(combinedDate.getTime() + 60 * 60 * 1000).toISOString(), // +1h
                    location: location.trim() || null,
                    type: schoolCategory === 'exame' || schoolCategory === 'teste' ? 'exam' : 'study',
                });

                if (error) throw error;
            } else {
                // Save to personal_todos table
                const selectedCat = PERSONAL_CATEGORIES.find(c => c.id === personalCategory);
                const { error } = await supabase.from('personal_todos').insert({
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    due_date: combinedDate.toISOString(),
                    priority: 'medium',
                    tags: [personalCategory],
                });

                if (error) throw error;
            }

            resetForm();
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('❌ Error saving:', err);
        } finally {
            setSaving(false);
        }
    };

    const currentColor = mainCategory === 'escola'
        ? SCHOOL_CATEGORIES.find(c => c.id === schoolCategory)?.color || colors.accent.primary
        : PERSONAL_CATEGORIES.find(c => c.id === personalCategory)?.color || colors.accent.primary;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Novo Evento</Text>
                    <Pressable
                        onPress={handleSave}
                        disabled={!title.trim() || saving}
                        style={[styles.saveButton, { backgroundColor: currentColor }]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Guardar</Text>
                        )}
                    </Pressable>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Title Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Título</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Exame de Matemática"
                            placeholderTextColor={colors.text.tertiary}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Main Category Toggle */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tipo</Text>
                        <View style={styles.toggleRow}>
                            <Pressable
                                style={[styles.toggleButton, mainCategory === 'escola' && styles.toggleActive]}
                                onPress={() => setMainCategory('escola')}
                            >
                                <Ionicons
                                    name="school-outline"
                                    size={18}
                                    color={mainCategory === 'escola' ? '#FFF' : colors.text.secondary}
                                />
                                <Text style={[styles.toggleText, mainCategory === 'escola' && styles.toggleTextActive]}>
                                    Escola
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[styles.toggleButton, mainCategory === 'pessoal' && styles.toggleActive]}
                                onPress={() => setMainCategory('pessoal')}
                            >
                                <Ionicons
                                    name="person-outline"
                                    size={18}
                                    color={mainCategory === 'pessoal' ? '#FFF' : colors.text.secondary}
                                />
                                <Text style={[styles.toggleText, mainCategory === 'pessoal' && styles.toggleTextActive]}>
                                    Pessoal
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Sub Category */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Categoria</Text>
                        <View style={styles.categoryGrid}>
                            {mainCategory === 'escola'
                                ? SCHOOL_CATEGORIES.map(cat => (
                                    <Pressable
                                        key={cat.id}
                                        style={[
                                            styles.categoryChip,
                                            schoolCategory === cat.id && { backgroundColor: cat.color },
                                        ]}
                                        onPress={() => setSchoolCategory(cat.id)}
                                    >
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={16}
                                            color={schoolCategory === cat.id ? '#FFF' : colors.text.secondary}
                                        />
                                        <Text style={[
                                            styles.categoryText,
                                            schoolCategory === cat.id && styles.categoryTextActive,
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </Pressable>
                                ))
                                : PERSONAL_CATEGORIES.map(cat => (
                                    <Pressable
                                        key={cat.id}
                                        style={[
                                            styles.categoryChip,
                                            personalCategory === cat.id && { backgroundColor: cat.color },
                                        ]}
                                        onPress={() => setPersonalCategory(cat.id)}
                                    >
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={16}
                                            color={personalCategory === cat.id ? '#FFF' : colors.text.secondary}
                                        />
                                        <Text style={[
                                            styles.categoryText,
                                            personalCategory === cat.id && styles.categoryTextActive,
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </Pressable>
                                ))
                            }
                        </View>
                    </View>

                    {/* Date & Time */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Data e Hora</Text>
                        <View style={styles.dateTimeRow}>
                            <Pressable
                                style={styles.dateTimeButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color={colors.accent.primary} />
                                <Text style={styles.dateTimeText}>
                                    {startDate.toLocaleDateString('pt-PT', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </Pressable>
                            <Pressable
                                style={styles.dateTimeButton}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={20} color={colors.accent.primary} />
                                <Text style={styles.dateTimeText}>
                                    {startTime.toLocaleTimeString('pt-PT', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Location (only for school) */}
                    {mainCategory === 'escola' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Localização (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Sala 101, Anfiteatro B"
                                placeholderTextColor={colors.text.tertiary}
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>
                    )}

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Descrição (opcional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Adiciona notas ou detalhes..."
                            placeholderTextColor={colors.text.tertiary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Date Picker */}
                {showDatePicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (date) setStartDate(date);
                        }}
                    />
                )}

                {/* Time Picker */}
                {showTimePicker && (
                    <DateTimePicker
                        value={startTime}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                            setShowTimePicker(Platform.OS === 'ios');
                            if (date) setStartTime(date);
                        }}
                    />
                )}
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
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceSubtle,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    saveButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    saveButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },
    content: {
        flex: 1,
        padding: spacing.xl,
    },
    inputGroup: {
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        fontSize: typography.size.base,
        color: colors.text.primary,
        ...shadows.sm,
    },
    textArea: {
        minHeight: 100,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    toggleActive: {
        backgroundColor: colors.text.primary,
    },
    toggleText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    toggleTextActive: {
        color: '#FFF',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        ...shadows.sm,
    },
    categoryText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    categoryTextActive: {
        color: '#FFF',
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.sm,
    },
    dateTimeText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
});

export default CreateEventModal;
