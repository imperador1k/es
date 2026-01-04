/**
 * ClassDetailModal - Premium Dark Theme
 * Modal para ver detalhes de uma única aula e mudar para edição
 */

import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { CLASS_TYPE_NAMES, ClassSessionWithSubject, DAY_NAMES } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface ClassDetailModalProps {
    visible: boolean;
    onClose: () => void;
    classSession: ClassSessionWithSubject | null;
    onEdit: () => void;
    onDelete?: () => void;
}

export function ClassDetailModal({
    visible,
    onClose,
    classSession,
    onEdit,
    onDelete,
}: ClassDetailModalProps) {
    if (!classSession) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={[styles.container, { borderTopColor: classSession.subject.color }]}>
                    {/* Header with Close */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: `${classSession.subject.color}20` }]}>
                                <Ionicons name="book" size={20} color={classSession.subject.color} />
                            </View>
                            <Text style={styles.headerTitle} numberOfLines={1}>{classSession.subject.name}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color={COLORS.text.secondary} />
                        </Pressable>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Time & Day */}
                        <View style={styles.row}>
                            <Ionicons name="time-outline" size={20} color={COLORS.text.tertiary} />
                            <Text style={styles.text}>
                                {DAY_NAMES[classSession.day_of_week]} • {classSession.start_time.slice(0, 5)} - {classSession.end_time.slice(0, 5)}
                            </Text>
                        </View>

                        {/* Room */}
                        <View style={styles.row}>
                            <Ionicons name="location-outline" size={20} color={COLORS.text.tertiary} />
                            <Text style={styles.text}>
                                {classSession.room ? classSession.room : 'Sem sala definida'}
                            </Text>
                        </View>

                        {/* Type */}
                        <View style={styles.row}>
                            <Ionicons name="school-outline" size={20} color={COLORS.text.tertiary} />
                            <Text style={styles.text}>
                                {CLASS_TYPE_NAMES[classSession.type]} ({classSession.type})
                            </Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable style={styles.editBtn} onPress={() => {
                            onClose();
                            setTimeout(onEdit, 100);
                        }}>
                            <Ionicons name="pencil" size={18} color="#FFF" />
                            <Text style={styles.editBtnText}>Editar</Text>
                        </Pressable>

                        {onDelete && (
                            <Pressable style={styles.deleteBtn} onPress={onDelete}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </Pressable>
                        )}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        borderTopWidth: 6,
        ...SHADOWS.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flex: 1,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    text: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    editBtn: {
        flex: 1,
        backgroundColor: '#6366F1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.md,
        borderRadius: RADIUS.xl,
        gap: SPACING.sm,
    },
    editBtnText: {
        color: '#FFF',
        fontWeight: TYPOGRAPHY.weight.semibold,
        fontSize: TYPOGRAPHY.size.base,
    },
    deleteBtn: {
        width: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
});
