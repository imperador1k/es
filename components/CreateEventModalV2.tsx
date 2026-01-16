/**
 * CreateEventModalV2 - Fresh implementation based on working CreateTodoModal
 * Simple, clean, and WORKS!
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePicker, UniversalTimePicker } from './ui/DateTimePicker';

interface CreateEventModalV2Props {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const EVENT_TYPES = [
    { id: 'escola', label: 'Escola', icon: 'school', gradient: ['#6366F1', '#8B5CF6'] },
    { id: 'pessoal', label: 'Pessoal', icon: 'person', gradient: ['#10B981', '#059669'] },
] as const;

const SCHOOL_CATEGORIES = [
    { id: 'exame', label: 'Exame', icon: 'document-text', color: '#EF4444' },
    { id: 'teste', label: 'Teste', icon: 'clipboard', color: '#F59E0B' },
    { id: 'apresentacao', label: 'Apresentação', icon: 'easel', color: '#6366F1' },
    { id: 'estudo', label: 'Estudo', icon: 'book', color: '#10B981' },
];

const PERSONAL_CATEGORIES = [
    { id: 'lembrete', label: 'Lembrete', icon: 'alarm', color: '#F59E0B' },
    { id: 'evento', label: 'Evento', icon: 'calendar', color: '#6366F1' },
    { id: 'reuniao', label: 'Reunião', icon: 'people', color: '#10B981' },
];

export function CreateEventModalV2({ visible, onClose, onSuccess }: CreateEventModalV2Props) {
    const insets = useSafeAreaInsets();
    const { user } = useAuthContext();

    // All form state - starts fresh every time modal opens (no useEffect needed!)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState<'escola' | 'pessoal'>('escola');
    const [schoolCategory, setSchoolCategory] = useState('exame');
    const [personalCategory, setPersonalCategory] = useState('lembrete');
    const [eventDate, setEventDate] = useState<Date | null>(null);
    const [eventTime, setEventTime] = useState<Date | null>(null);
    const [location, setLocation] = useState('');
    const [saving, setSaving] = useState(false);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setEventType('escola');
        setSchoolCategory('exame');
        setPersonalCategory('lembrete');
        setEventDate(null);
        setEventTime(null);
        setLocation('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSave = async () => {
        if (!title.trim() || !user?.id || !eventDate) return;
        setSaving(true);

        try {
            // Combine date and time
            const finalDate = new Date(eventDate);
            if (eventTime) {
                finalDate.setHours(eventTime.getHours(), eventTime.getMinutes(), 0, 0);
            } else {
                finalDate.setHours(9, 0, 0, 0); // Default to 9:00 AM
            }

            if (eventType === 'escola') {
                // Save to events table
                const { error } = await supabase.from('events').insert({
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    start_time: finalDate.toISOString(),
                    end_time: new Date(finalDate.getTime() + 60 * 60 * 1000).toISOString(),
                    location: location.trim() || null,
                    type: schoolCategory === 'exame' || schoolCategory === 'teste' ? 'exam' : 'study',
                });
                if (error) throw error;
            } else {
                // Save to personal_todos table
                const { error } = await supabase.from('personal_todos').insert({
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    due_date: finalDate.toISOString(),
                    category: personalCategory,
                    priority: 'medium',
                });
                if (error) throw error;
            }

            resetForm();
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('❌ Error saving event:', err);
        } finally {
            setSaving(false);
        }
    };

    const categories = eventType === 'escola' ? SCHOOL_CATEGORIES : PERSONAL_CATEGORIES;
    const selectedCategory = eventType === 'escola' ? schoolCategory : personalCategory;
    const currentType = EVENT_TYPES.find(t => t.id === eventType)!;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.closeBtn} onPress={handleClose}>
                        <Ionicons name="close" size={24} color={COLORS.text.primary} />
                    </Pressable>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerEmoji}>📅</Text>
                        <Text style={styles.headerTitle}>Novo Evento</Text>
                        <Text style={{ color: 'white', backgroundColor: '#FF00FF', padding: 4, fontWeight: 'bold' }}>DEBUG: V2</Text>
                    </View>

                    <Pressable
                        onPress={handleSave}
                        disabled={!title.trim() || !eventDate || saving}
                        style={[styles.saveBtn, (!title.trim() || !eventDate) && styles.saveBtnDisabled]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <LinearGradient colors={currentType.gradient as [string, string]} style={styles.saveBtnGradient}>
                                <Text style={styles.saveBtnText}>Criar</Text>
                            </LinearGradient>
                        )}
                    </Pressable>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Title Input */}
                    <View style={styles.titleSection}>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Título do evento..."
                            placeholderTextColor={COLORS.text.tertiary}
                            value={title}
                            onChangeText={setTitle}
                            autoFocus
                        />
                    </View>

                    {/* Event Type Toggle */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tipo</Text>
                        <View style={styles.typeRow}>
                            {EVENT_TYPES.map(type => (
                                <Pressable
                                    key={type.id}
                                    style={[styles.typeCard, eventType === type.id && styles.typeCardActive]}
                                    onPress={() => setEventType(type.id)}
                                >
                                    {eventType === type.id ? (
                                        <LinearGradient colors={type.gradient as [string, string]} style={styles.typeCardGradient}>
                                            <Ionicons name={type.icon as any} size={20} color="#FFF" />
                                            <Text style={styles.typeTextActive}>{type.label}</Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.typeCardInner}>
                                            <Ionicons name={type.icon as any} size={20} color={COLORS.text.secondary} />
                                            <Text style={styles.typeText}>{type.label}</Text>
                                        </View>
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Category Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Categoria</Text>
                        <View style={styles.categoryGrid}>
                            {categories.map(cat => (
                                <Pressable
                                    key={cat.id}
                                    style={[
                                        styles.categoryCard,
                                        selectedCategory === cat.id && { borderColor: cat.color, borderWidth: 2 }
                                    ]}
                                    onPress={() => eventType === 'escola' ? setSchoolCategory(cat.id) : setPersonalCategory(cat.id)}
                                >
                                    <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                                        <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                                    </View>
                                    <Text style={[styles.categoryLabel, selectedCategory === cat.id && { color: cat.color }]}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Date & Time - THE IMPORTANT PART! */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quando</Text>
                        <View style={styles.dateTimeRow}>
                            <DatePicker
                                value={eventDate}
                                onChange={(date) => setEventDate(date)}
                                placeholder="Escolher data"
                                minimumDate={new Date()}
                            />

                            <UniversalTimePicker
                                value={eventTime}
                                onChange={(date) => setEventTime(date)}
                                placeholder="--:--"
                                disabled={!eventDate}
                            />

                            {eventDate && (
                                <Pressable style={styles.clearBtn} onPress={() => { setEventDate(null); setEventTime(null); }}>
                                    <Ionicons name="close-circle" size={24} color={COLORS.text.tertiary} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notas (opcional)</Text>
                        <TextInput
                            style={styles.descriptionInput}
                            placeholder="Adicionar detalhes..."
                            placeholderTextColor={COLORS.text.tertiary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Location (only for school) */}
                    {eventType === 'escola' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Localização (opcional)</Text>
                            <View style={styles.locationInput}>
                                <Ionicons name="location" size={20} color={COLORS.text.tertiary} />
                                <TextInput
                                    style={styles.locationTextInput}
                                    placeholder="Ex: Sala B2, Auditório..."
                                    placeholderTextColor={COLORS.text.tertiary}
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    headerEmoji: { fontSize: 24 },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    saveBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnGradient: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
    },
    saveBtnText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '600',
        color: '#FFF',
    },

    // Content
    content: { flex: 1, paddingHorizontal: SPACING.lg },

    // Title
    titleSection: { marginTop: SPACING.xl },
    titleInput: {
        fontSize: 28,
        fontWeight: '600',
        color: COLORS.text.primary,
        paddingVertical: SPACING.md,
    },

    // Section
    section: { marginTop: SPACING.xl },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '600',
        color: COLORS.text.tertiary,
        marginBottom: SPACING.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Type Row
    typeRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    typeCard: {
        flex: 1,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
    },
    typeCardActive: {},
    typeCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    typeCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    typeText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
    typeTextActive: { fontSize: TYPOGRAPHY.size.sm, color: '#FFF', fontWeight: '600' },

    // Categories
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    categoryCard: {
        width: '48%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    categoryLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },

    // Date Time Row
    dateTimeRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignItems: 'center',
    },
    clearBtn: { marginLeft: SPACING.xs },

    // Description
    descriptionInput: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        minHeight: 80,
        textAlignVertical: 'top',
    },

    // Location
    locationInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.md,
    },
    locationTextInput: {
        flex: 1,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },
});
