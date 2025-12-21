import { colors } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface XPBadgeProps {
    amount: number;
    size?: 'sm' | 'md' | 'lg';
    style?: ViewStyle;
}

/**
 * XP Badge - Mostra quantidade de XP com ícone
 */
export function XPBadge({ amount, size = 'md', style }: XPBadgeProps) {
    const sizes = {
        sm: { padding: 4, paddingH: 8, fontSize: 11, iconSize: 10 },
        md: { padding: 6, paddingH: 12, fontSize: 13, iconSize: 12 },
        lg: { padding: 8, paddingH: 16, fontSize: 15, iconSize: 14 },
    };

    const s = sizes[size];

    return (
        <View
            style={[
                styles.xpContainer,
                { paddingVertical: s.padding, paddingHorizontal: s.paddingH },
                style,
            ]}
        >
            <Ionicons name="flash" size={s.iconSize} color={colors.accent} />
            <Text style={[styles.xpText, { fontSize: s.fontSize }]}>+{amount} XP</Text>
        </View>
    );
}

interface LevelBadgeProps {
    level: number;
    tier?: string;
    size?: 'sm' | 'md' | 'lg';
    style?: ViewStyle;
}

/**
 * Level Badge - Mostra nível do utilizador
 */
export function LevelBadge({ level, tier = 'bronze', size = 'md', style }: LevelBadgeProps) {
    const tierColors: Record<string, { bg: string; text: string }> = {
        bronze: { bg: '#FEF3C7', text: '#92400E' },
        silver: { bg: '#F3F4F6', text: '#374151' },
        gold: { bg: '#FEF9C3', text: '#854D0E' },
        platinum: { bg: '#F0F9FF', text: '#0369A1' },
        diamond: { bg: '#ECFEFF', text: '#0E7490' },
    };

    const colors = tierColors[tier] || tierColors.bronze;

    const sizes = {
        sm: { padding: 4, paddingH: 8, fontSize: 11 },
        md: { padding: 6, paddingH: 12, fontSize: 13 },
        lg: { padding: 8, paddingH: 16, fontSize: 15 },
    };

    const s = sizes[size];

    return (
        <View
            style={[
                styles.levelContainer,
                {
                    paddingVertical: s.padding,
                    paddingHorizontal: s.paddingH,
                    backgroundColor: colors.bg,
                },
                style,
            ]}
        >
            <Text style={[styles.levelText, { fontSize: s.fontSize, color: colors.text }]}>
                Nível {level}
            </Text>
        </View>
    );
}

interface QuestTypeBadgeProps {
    type: 'study' | 'assignment' | 'exam';
    style?: ViewStyle;
}

/**
 * Quest Type Badge - Badge colorido por tipo de quest
 */
export function QuestTypeBadge({ type, style }: QuestTypeBadgeProps) {
    const config = {
        study: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Estudo', icon: 'book-outline' as const },
        assignment: { bg: '#FEF3C7', text: '#B45309', label: 'Trabalho', icon: 'document-text-outline' as const },
        exam: { bg: '#FEE2E2', text: '#DC2626', label: 'Exame', icon: 'school-outline' as const },
    };

    const c = config[type];

    return (
        <View style={[styles.questBadge, { backgroundColor: c.bg }, style]}>
            <Ionicons name={c.icon} size={12} color={c.text} />
            <Text style={[styles.questText, { color: c.text }]}>{c.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    xpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.accentLight,
        borderRadius: 100,
    },
    xpText: {
        fontWeight: '700',
        color: colors.accent,
    },
    levelContainer: {
        borderRadius: 100,
    },
    levelText: {
        fontWeight: '600',
    },
    questBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 100,
    },
    questText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
