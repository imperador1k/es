/**
 * 📅 Create Event Modal - PREMIUM REDESIGN
 * Modern, beautiful modal for creating events and todos
 * With premium design tokens and animations
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const SCHOOL_CATEGORIES: { id: SchoolSubCategory; label: string; icon: string; color: string; gradient: [string, string] }[] = [
    { id: 'exame', label: 'Exame', icon: 'school', color: '#EF4444', gradient: ['#EF4444', '#DC2626'] },
    { id: 'teste', label: 'Teste', icon: 'document-text', color: '#F59E0B', gradient: ['#F59E0B', '#D97706'] },
    { id: 'apresentação', label: 'Apresentação', icon: 'easel', color: '#8B5CF6', gradient: ['#8B5CF6', '#7C3AED'] },
    { id: 'estudo', label: 'Estudo', icon: 'book', color: '#6366F1', gradient: ['#6366F1', '#4F46E5'] },
];

const PERSONAL_CATEGORIES: { id: PersonalSubCategory; label: string; icon: string; color: string; gradient: [string, string] }[] = [
    { id: 'lembrete', label: 'Lembrete', icon: 'alarm', color: '#EC4899', gradient: ['#EC4899', '#DB2777'] },
    { id: 'tarefa', label: 'Tarefa', icon: 'checkbox', color: '#10B981', gradient: ['#10B981', '#059669'] },
];

// ============================================
// ANIMATED CATEGORY CARD
// ============================================

function CategoryCard({
    cat,
    isSelected,
    onPress
}: {
    cat: { id: string; label: string; icon: string; color: string; gradient: [string, string] };
    isSelected: boolean;
    onPress: () => void;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={[styles.categoryCardWrap, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                {isSelected ? (
                    <LinearGradient colors={cat.gradient} style={styles.categoryCard}>
                        <View style={styles.categoryIconWrap}>
                            <Ionicons name={cat.icon as any} size={24} color="#FFF" />
                        </View>
                        <Text style={styles.categoryLabel}>{cat.label}</Text>
                        <View style={styles.selectedCheck}>
                            <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                    </LinearGradient>
                ) : (
                    <View style={styles.categoryCardInactive}>
                        <View style={[styles.categoryIconWrap, { backgroundColor: `${cat.color}20` }]}>
                            <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                        </View>
                        <Text style={styles.categoryLabelInactive}>{cat.label}</Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

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
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(0)).current;

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

    // Animation on open
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }).start();
        } else {
            slideAnim.setValue(0);
        }
    }, [visible]);

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
            const combinedDate = new Date(startDate);
            combinedDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

            if (mainCategory === 'escola') {
                const { error } = await supabase.from('events').insert({
                    user_id: user.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    start_time: combinedDate.toISOString(),
                    end_time: new Date(combinedDate.getTime() + 60 * 60 * 1000).toISOString(),
                    location: location.trim() || null,
                    type: schoolCategory === 'exame' || schoolCategory === 'teste' ? 'exam' : 'study',
                });
                if (error) throw error;
            } else {
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

    const currentCat = mainCategory === 'escola'
        ? SCHOOL_CATEGORIES.find(c => c.id === schoolCategory)
        : PERSONAL_CATEGORIES.find(c => c.id === personalCategory);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    {/* Premium Header */}
                    <Animated.View style={[styles.header, {
                        opacity: slideAnim,
                        transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]
                    }]}>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={COLORS.text.primary} />
                        </Pressable>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerEmoji}>📅</Text>
                            <Text style={styles.headerTitle}>Novo Evento</Text>
                        </View>

                        <Pressable
                            onPress={handleSave}
                            disabled={!title.trim() || saving}
                            style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <LinearGradient colors={currentCat?.gradient || ['#6366F1', '#8B5CF6']} style={styles.saveBtnGradient}>
                                    <Text style={styles.saveBtnText}>Guardar</Text>
                                </LinearGradient>
                            )}
                        </Pressable>
                    </Animated.View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Title Input - Hero Style */}
                        <View style={styles.titleSection}>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="Título do evento..."
                                placeholderTextColor={COLORS.text.tertiary}
                                value={title}
                                onChangeText={setTitle}
                                autoFocus
                            />
                            {title.length > 0 && (
                                <View style={[styles.charCount, title.length > 40 && { backgroundColor: '#F59E0B20' }]}>
                                    <Text style={[styles.charCountText, title.length > 40 && { color: '#F59E0B' }]}>{title.length}/50</Text>
                                </View>
                            )}
                        </View>

                        {/* Main Category Toggle - Pills */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Tipo</Text>
                            <View style={styles.togglePills}>
                                <Pressable
                                    style={[styles.togglePill, mainCategory === 'escola' && styles.togglePillActive]}
                                    onPress={() => setMainCategory('escola')}
                                >
                                    <Ionicons name="school" size={18} color={mainCategory === 'escola' ? '#FFF' : COLORS.text.secondary} />
                                    <Text style={[styles.togglePillText, mainCategory === 'escola' && styles.togglePillTextActive]}>
                                        Escola
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.togglePill, mainCategory === 'pessoal' && styles.togglePillActivePersonal]}
                                    onPress={() => setMainCategory('pessoal')}
                                >
                                    <Ionicons name="person" size={18} color={mainCategory === 'pessoal' ? '#FFF' : COLORS.text.secondary} />
                                    <Text style={[styles.togglePillText, mainCategory === 'pessoal' && styles.togglePillTextActive]}>
                                        Pessoal
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Sub Categories - Grid Cards */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Categoria</Text>
                            <View style={styles.categoryGrid}>
                                {mainCategory === 'escola'
                                    ? SCHOOL_CATEGORIES.map(cat => (
                                        <CategoryCard
                                            key={cat.id}
                                            cat={cat}
                                            isSelected={schoolCategory === cat.id}
                                            onPress={() => setSchoolCategory(cat.id)}
                                        />
                                    ))
                                    : PERSONAL_CATEGORIES.map(cat => (
                                        <CategoryCard
                                            key={cat.id}
                                            cat={cat}
                                            isSelected={personalCategory === cat.id}
                                            onPress={() => setPersonalCategory(cat.id)}
                                        />
                                    ))}
                            </View>
                        </View>

                        {/* Date & Time - Modern Cards */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Quando</Text>
                            <View style={styles.dateTimeRow}>
                                <Pressable style={styles.dateTimeCard} onPress={() => setShowDatePicker(true)}>
                                    <View style={styles.dateTimeIconWrap}>
                                        <Ionicons name="calendar" size={20} color="#6366F1" />
                                    </View>
                                    <View style={styles.dateTimeInfo}>
                                        <Text style={styles.dateTimeLabel}>Data</Text>
                                        <Text style={styles.dateTimeValue}>
                                            {startDate.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
                                </Pressable>

                                <Pressable style={styles.dateTimeCard} onPress={() => setShowTimePicker(true)}>
                                    <View style={[styles.dateTimeIconWrap, { backgroundColor: '#10B98120' }]}>
                                        <Ionicons name="time" size={20} color="#10B981" />
                                    </View>
                                    <View style={styles.dateTimeInfo}>
                                        <Text style={styles.dateTimeLabel}>Hora</Text>
                                        <Text style={styles.dateTimeValue}>
                                            {startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
                                </Pressable>
                            </View>
                        </View>

                        {/* Location (only for school) */}
                        {mainCategory === 'escola' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Localização</Text>
                                <View style={styles.inputCard}>
                                    <Ionicons name="location" size={20} color={COLORS.text.tertiary} />
                                    <TextInput
                                        style={styles.inputCardText}
                                        placeholder="Sala 101, Anfiteatro B..."
                                        placeholderTextColor={COLORS.text.tertiary}
                                        value={location}
                                        onChangeText={setLocation}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Notas</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Adiciona detalhes, links, matéria..."
                                placeholderTextColor={COLORS.text.tertiary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Date Picker - Platform Specific */}
                    {showDatePicker && (
                        Platform.OS === 'ios' ? (
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
                                            value={startDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={(event, date) => {
                                                if (date) setStartDate(date);
                                            }}
                                            textColor="#FFF"
                                        />
                                    </BlurView>
                                </View>
                            </Modal>
                        ) : (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display="default"
                                onChange={(event, date) => {
                                    setShowDatePicker(false);
                                    if (event.type === 'set' && date) setStartDate(date);
                                }}
                            />
                        )
                    )}

                    {/* Time Picker - Platform Specific */}
                    {showTimePicker && (
                        Platform.OS === 'ios' ? (
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
                                            value={startTime}
                                            mode="time"
                                            display="spinner"
                                            onChange={(event, date) => {
                                                if (date) setStartTime(date);
                                            }}
                                            textColor="#FFF"
                                        />
                                    </BlurView>
                                </View>
                            </Modal>
                        ) : (
                            <DateTimePicker
                                value={startTime}
                                mode="time"
                                display="default"
                                onChange={(event, date) => {
                                    setShowTimePicker(false);
                                    if (event.type === 'set' && date) setStartTime(date);
                                }}
                            />
                        )
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
    saveBtn: { overflow: 'hidden', borderRadius: RADIUS.full },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnGradient: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
    saveBtnText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Content
    content: { flex: 1 },

    // Title Section
    titleSection: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl },
    titleInput: { fontSize: 28, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary, paddingVertical: SPACING.md },
    charCount: { alignSelf: 'flex-start', backgroundColor: COLORS.surfaceElevated, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm, marginTop: SPACING.sm },
    charCountText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },

    // Section
    section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
    sectionTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.md },

    // Toggle Pills
    togglePills: { flexDirection: 'row', gap: SPACING.sm },
    togglePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, paddingVertical: SPACING.md, borderRadius: RADIUS.lg },
    togglePillActive: { backgroundColor: '#6366F1' },
    togglePillActivePersonal: { backgroundColor: '#10B981' },
    togglePillText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.secondary },
    togglePillTextActive: { color: '#FFF' },

    // Category Grid
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    categoryCardWrap: { width: '48%' },
    categoryCard: { padding: SPACING.md, borderRadius: RADIUS.xl, alignItems: 'center', gap: SPACING.sm, position: 'relative' },
    categoryCardInactive: { padding: SPACING.md, borderRadius: RADIUS.xl, alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated },
    categoryIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    categoryLabel: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
    categoryLabelInactive: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.secondary },
    selectedCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },

    // Date Time
    dateTimeRow: { flexDirection: 'row', gap: SPACING.sm },
    dateTimeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, padding: SPACING.md, borderRadius: RADIUS.lg },
    dateTimeIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#6366F120', alignItems: 'center', justifyContent: 'center' },
    dateTimeInfo: { flex: 1 },
    dateTimeLabel: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary },
    dateTimeValue: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },

    // Input Card
    inputCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceElevated, padding: SPACING.md, borderRadius: RADIUS.lg },
    inputCardText: { flex: 1, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary },

    // Text Area
    textArea: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.lg, padding: SPACING.md, fontSize: TYPOGRAPHY.size.base, color: COLORS.text.primary, minHeight: 100 },

    // Picker Modal
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    pickerModal: { width: '85%', borderRadius: RADIUS.xl, padding: SPACING.lg, overflow: 'hidden' },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
    pickerTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
});

export default CreateEventModal;
