/**
 * Componente de Seleção de Hora
 * Escola+ App
 * 
 * Picker simples de hora/minuto para React Native
 */

import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TimePickerProps {
    value: string; // formato 'HH:MM'
    onChange: (time: string) => void;
    label?: string;
    error?: string;
}

// Gerar arrays de horas e minutos
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45']; // Intervalos de 15 min

export function TimePicker({ value, onChange, label, error }: TimePickerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [tempHour, setTempHour] = useState(value.split(':')[0] || '09');
    const [tempMinute, setTempMinute] = useState(value.split(':')[1] || '00');

    const handleOpen = () => {
        const [h, m] = value.split(':');
        setTempHour(h || '09');
        setTempMinute(m || '00');
        setModalVisible(true);
    };

    const handleConfirm = () => {
        onChange(`${tempHour}:${tempMinute}`);
        setModalVisible(false);
    };

    const displayValue = value || '--:--';

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <Pressable
                style={[styles.selector, error && styles.selectorError]}
                onPress={handleOpen}
            >
                <Ionicons name="time-outline" size={20} color={colors.text.tertiary} />
                <Text style={styles.selectorText}>{displayValue}</Text>
            </Pressable>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>Selecionar Hora</Text>
                        <Pressable onPress={handleConfirm}>
                            <Text style={styles.confirmText}>OK</Text>
                        </Pressable>
                    </View>

                    {/* Preview */}
                    <View style={styles.previewContainer}>
                        <Text style={styles.previewTime}>{tempHour}:{tempMinute}</Text>
                    </View>

                    {/* Pickers */}
                    <View style={styles.pickersContainer}>
                        {/* Hours */}
                        <View style={styles.pickerColumn}>
                            <Text style={styles.pickerLabel}>Hora</Text>
                            <FlatList
                                data={HOURS}
                                keyExtractor={(item) => item}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.pickerList}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={[
                                            styles.pickerItem,
                                            tempHour === item && styles.pickerItemSelected,
                                        ]}
                                        onPress={() => setTempHour(item)}
                                    >
                                        <Text
                                            style={[
                                                styles.pickerItemText,
                                                tempHour === item && styles.pickerItemTextSelected,
                                            ]}
                                        >
                                            {item}
                                        </Text>
                                    </Pressable>
                                )}
                            />
                        </View>

                        {/* Separator */}
                        <Text style={styles.pickerSeparator}>:</Text>

                        {/* Minutes */}
                        <View style={styles.pickerColumn}>
                            <Text style={styles.pickerLabel}>Min</Text>
                            <FlatList
                                data={MINUTES}
                                keyExtractor={(item) => item}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.pickerList}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={[
                                            styles.pickerItem,
                                            tempMinute === item && styles.pickerItemSelected,
                                        ]}
                                        onPress={() => setTempMinute(item)}
                                    >
                                        <Text
                                            style={[
                                                styles.pickerItemText,
                                                tempMinute === item && styles.pickerItemTextSelected,
                                            ]}
                                        >
                                            {item}
                                        </Text>
                                    </Pressable>
                                )}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    selectorError: {
        borderColor: colors.danger.primary,
    },
    selectorText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    errorText: {
        fontSize: typography.size.xs,
        color: colors.danger.primary,
        marginTop: spacing.xs,
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
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
    cancelText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    confirmText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },

    // Preview
    previewContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    previewTime: {
        fontSize: 56,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        fontVariant: ['tabular-nums'],
    },

    // Pickers
    pickersContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.xl,
        flex: 1,
    },
    pickerColumn: {
        flex: 1,
        maxWidth: 100,
    },
    pickerLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    pickerList: {
        paddingVertical: spacing.md,
    },
    pickerItem: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    pickerItemSelected: {
        backgroundColor: colors.accent.primary,
    },
    pickerItemText: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
        textAlign: 'center',
    },
    pickerItemTextSelected: {
        color: colors.text.inverse,
    },
    pickerSeparator: {
        fontSize: 48,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
        paddingTop: spacing.xl,
    },
});
