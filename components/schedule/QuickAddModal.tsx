/**
 * QuickAddModal Component - Premium Dark Theme
 * Action sheet para adicionar rapidamente aulas, reuniões ou eventos
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { DAY_NAMES, DayOfWeek } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

// ============================================
// TYPES
// ============================================

export type QuickAddType = 'class' | 'meeting' | 'event' | 'study';

interface QuickAddOption {
    type: QuickAddType;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    gradient: [string, string];
}

const OPTIONS: QuickAddOption[] = [
    {
        type: 'class',
        icon: 'book',
        title: 'Aula',
        subtitle: 'Adicionar aula ao horário',
        gradient: ['#6366F1', '#4F46E5'],
    },
    {
        type: 'study',
        icon: 'library',
        title: 'Sessão de Estudo',
        subtitle: 'Bloquear tempo para estudar',
        gradient: ['#10B981', '#059669'],
    },
    {
        type: 'meeting',
        icon: 'people',
        title: 'Reunião',
        subtitle: 'Reunião de grupo ou projeto',
        gradient: ['#F59E0B', '#D97706'],
    },
    {
        type: 'event',
        icon: 'calendar',
        title: 'Evento',
        subtitle: 'Outro compromisso',
        gradient: ['#8B5CF6', '#7C3AED'],
    },
];

// ============================================
// PROPS
// ============================================

interface QuickAddModalProps {
    visible: boolean;
    day: DayOfWeek | null;
    hour: number | null;
    onClose: () => void;
    onSelect: (type: QuickAddType, day: DayOfWeek, hour: number) => void;
}

// ============================================
// COMPONENT
// ============================================

// Helper to avoid Reanimated on Web
const SheetComponent = Platform.OS === 'web' ? View : Animated.View;
const OptionComponent = Platform.OS === 'web' ? View : Animated.View;

export function QuickAddModal({ visible, day, hour, onClose, onSelect }: QuickAddModalProps) {
    // Early return if no valid day/hour
    if (!visible) return null;

    const dayName = day !== null && day !== undefined ? (DAY_NAMES[day] || 'Dia') : 'Dia';
    const timeString = hour !== null && hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '--:--';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <SheetComponent
                    entering={Platform.OS === 'web' ? undefined : FadeInUp.springify()}
                    style={styles.sheet}
                >
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Adicionar em</Text>
                        <View style={styles.timeInfo}>
                            <View style={styles.timeBadge}>
                                <Ionicons name="calendar" size={14} color="#6366F1" />
                                <Text style={styles.timeBadgeText}>{dayName}</Text>
                            </View>
                            <View style={styles.timeBadge}>
                                <Ionicons name="time" size={14} color="#6366F1" />
                                <Text style={styles.timeBadgeText}>{timeString}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Options */}
                    <View style={styles.options}>
                        {OPTIONS.map((option, index) => (
                            <OptionComponent
                                key={option.type}
                                entering={Platform.OS === 'web' ? undefined : FadeInUp.delay(50 * index).springify()}
                            >
                                <Pressable
                                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                                    onPress={() => {
                                        if (day !== null && hour !== null) {
                                            onSelect(option.type, day, hour);
                                        }
                                        onClose();
                                    }}
                                >
                                    <LinearGradient colors={option.gradient} style={styles.optionIcon}>
                                        <Ionicons name={option.icon} size={22} color="#FFF" />
                                    </LinearGradient>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionTitle}>{option.title}</Text>
                                        <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                                </Pressable>
                            </OptionComponent>
                        ))}
                    </View>

                    {/* Cancel */}
                    <Pressable style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </Pressable>
                </SheetComponent>
            </Pressable>
        </Modal>
    );
}

// ============================================
// STYLES - PREMIUM DARK THEME
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        paddingBottom: 40,
        ...SHADOWS.lg,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: SPACING.md,
        marginBottom: SPACING.lg,
    },
    header: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    timeInfo: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.full,
    },
    timeBadgeText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#6366F1',
    },
    options: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.sm,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        gap: SPACING.md,
    },
    optionPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    optionSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    cancelButton: {
        marginTop: SPACING.lg,
        marginHorizontal: SPACING.lg,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
});
