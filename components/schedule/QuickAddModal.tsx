/**
 * QuickAddModal Component
 * Action sheet para adicionar rapidamente aulas, reuniões ou eventos
 * Aparece quando o utilizador clica num slot vazio do horário
 */

import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { DAY_NAMES, DayOfWeek } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// ============================================
// TYPES
// ============================================

export type QuickAddType = 'class' | 'meeting' | 'event' | 'study';

interface QuickAddOption {
    type: QuickAddType;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    color: string;
    gradient: [string, string];
}

const OPTIONS: QuickAddOption[] = [
    {
        type: 'class',
        icon: 'book-outline',
        title: 'Aula',
        subtitle: 'Adicionar aula ao horário',
        color: colors.accent.primary,
        gradient: ['#6366F1', '#4F46E5'],
    },
    {
        type: 'study',
        icon: 'library-outline',
        title: 'Sessão de Estudo',
        subtitle: 'Bloquear tempo para estudar',
        color: colors.success.primary,
        gradient: ['#10B981', '#059669'],
    },
    {
        type: 'meeting',
        icon: 'people-outline',
        title: 'Reunião',
        subtitle: 'Reunião de grupo ou projeto',
        color: colors.warning.primary,
        gradient: ['#F59E0B', '#D97706'],
    },
    {
        type: 'event',
        icon: 'calendar-outline',
        title: 'Evento',
        subtitle: 'Outro compromisso',
        color: '#8B5CF6',
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

export function QuickAddModal({ visible, day, hour, onClose, onSelect }: QuickAddModalProps) {
    if (day === null || hour === null) return null;

    const dayName = DAY_NAMES[day];
    const timeString = `${hour.toString().padStart(2, '0')}:00`;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Adicionar em</Text>
                        <View style={styles.timeInfo}>
                            <View style={styles.timeBadge}>
                                <Ionicons name="calendar" size={14} color={colors.accent.primary} />
                                <Text style={styles.timeBadgeText}>{dayName}</Text>
                            </View>
                            <View style={styles.timeBadge}>
                                <Ionicons name="time" size={14} color={colors.accent.primary} />
                                <Text style={styles.timeBadgeText}>{timeString}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Options */}
                    <View style={styles.options}>
                        {OPTIONS.map((option) => (
                            <Pressable
                                key={option.type}
                                style={({ pressed }) => [
                                    styles.option,
                                    pressed && styles.optionPressed,
                                ]}
                                onPress={() => {
                                    onSelect(option.type, day, hour);
                                    onClose();
                                }}
                            >
                                <LinearGradient
                                    colors={option.gradient}
                                    style={styles.optionIcon}
                                >
                                    <Ionicons name={option.icon} size={24} color="#FFFFFF" />
                                </LinearGradient>
                                <View style={styles.optionText}>
                                    <Text style={styles.optionTitle}>{option.title}</Text>
                                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                            </Pressable>
                        ))}
                    </View>

                    {/* Cancel */}
                    <Pressable style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        paddingBottom: spacing['3xl'],
        ...shadows.lg,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: colors.divider,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    header: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    timeInfo: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.accent.light,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    timeBadgeText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
    },
    options: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        gap: spacing.md,
    },
    optionPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    optionSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    cancelButton: {
        marginTop: spacing.lg,
        marginHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
});
