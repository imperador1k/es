/**
 * Universal DatePicker Component
 * Works on iOS, Android, and Web
 * 
 * Uses native DateTimePicker on mobile and HTML input type="date" on web
 */

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useRef, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface DatePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    label?: string;
    placeholder?: string;
    minimumDate?: Date;
    maximumDate?: Date;
}

export function DatePicker({
    value,
    onChange,
    label,
    placeholder = 'Escolher data',
    minimumDate,
    maximumDate,
}: DatePickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(value || new Date());
    const webInputRef = useRef<TextInput>(null);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleWebChange = (dateString: string) => {
        if (dateString) {
            const [year, month, day] = dateString.split('-').map(Number);
            const newDate = new Date(year, month - 1, day);
            if (value) {
                // Preserve time from existing value
                newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
            }
            onChange(newDate);
        }
    };

    const handleNativeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            // On Android, event.type is 'set' for confirm, 'dismissed' for cancel
            if (event.type === 'set' && selectedDate) {
                const newDate = new Date(selectedDate);
                if (value) {
                    // Preserve time from existing value
                    newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
                }
                onChange(newDate);
            }
        } else if (Platform.OS === 'ios') {
            // iOS uses spinner - update temp value
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };

    const handleIOSConfirm = () => {
        const newDate = new Date(tempDate);
        if (value) {
            newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
        }
        onChange(newDate);
        setShowPicker(false);
    };

    // Web/Electron: Custom modal picker (no HTML input to avoid hydration issues)
    if (Platform.OS === 'web') {
        const handleWebConfirm = () => {
            const newDate = new Date(tempDate);
            if (value) {
                newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
            }
            onChange(newDate);
            setShowPicker(false);
        };

        const changeDay = (delta: number) => {
            const newDate = new Date(tempDate);
            newDate.setDate(newDate.getDate() + delta);
            setTempDate(newDate);
        };

        const changeMonth = (delta: number) => {
            const newDate = new Date(tempDate);
            newDate.setMonth(newDate.getMonth() + delta);
            setTempDate(newDate);
        };

        return (
            <View style={styles.container}>
                {label && <Text style={styles.label}>{label}</Text>}
                <Pressable
                    style={styles.picker}
                    onPress={() => {
                        setTempDate(value || new Date());
                        setShowPicker(true);
                    }}
                >
                    <View style={[styles.iconWrap, value && styles.iconWrapActive]}>
                        <Ionicons name="calendar" size={20} color={value ? '#6366F1' : COLORS.text.tertiary} />
                    </View>
                    <Text style={[styles.valueText, value && styles.valueTextActive]}>
                        {value ? formatDate(value) : placeholder}
                    </Text>
                </Pressable>

                {/* Custom Web Modal */}
                <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
                    <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
                        <View style={styles.webModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Escolher Data</Text>
                                <Pressable onPress={() => setShowPicker(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text.secondary} />
                                </Pressable>
                            </View>

                            {/* Month Row */}
                            <View style={styles.webDateDisplay}>
                                <Pressable style={styles.webArrowBtn} onPress={() => changeMonth(-1)}>
                                    <Ionicons name="chevron-back" size={28} color="#6366F1" />
                                </Pressable>
                                <View style={styles.webDateCenter}>
                                    <Text style={styles.webDateMonth}>
                                        {tempDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                                    </Text>
                                </View>
                                <Pressable style={styles.webArrowBtn} onPress={() => changeMonth(1)}>
                                    <Ionicons name="chevron-forward" size={28} color="#6366F1" />
                                </Pressable>
                            </View>

                            {/* Day Row */}
                            <View style={styles.webDayRow}>
                                <Pressable style={styles.webArrowBtn} onPress={() => changeDay(-1)}>
                                    <Ionicons name="remove-circle" size={36} color="#6366F1" />
                                </Pressable>
                                <View style={styles.webDayDisplay}>
                                    <Text style={styles.webDayText}>{tempDate.getDate()}</Text>
                                    <Text style={styles.webDayLabel}>
                                        {tempDate.toLocaleDateString('pt-PT', { weekday: 'long' })}
                                    </Text>
                                </View>
                                <Pressable style={styles.webArrowBtn} onPress={() => changeDay(1)}>
                                    <Ionicons name="add-circle" size={36} color="#6366F1" />
                                </Pressable>
                            </View>

                            {/* Confirm Button */}
                            <Pressable style={styles.webConfirmBtn} onPress={handleWebConfirm}>
                                <Text style={styles.webConfirmText}>Confirmar</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Pressable style={styles.picker} onPress={() => {
                setTempDate(value || new Date());
                setShowPicker(true);
            }}>
                <View style={[styles.iconWrap, value && styles.iconWrapActive]}>
                    <Ionicons name="calendar" size={20} color={value ? '#6366F1' : COLORS.text.tertiary} />
                </View>
                <Text style={[styles.valueText, value && styles.valueTextActive]}>
                    {value ? formatDate(value) : placeholder}
                </Text>
            </Pressable>

            {/* iOS Modal with Spinner */}
            {showPicker && Platform.OS === 'ios' && (
                <Modal transparent animationType="fade">
                    <View style={styles.overlay}>
                        <BlurView intensity={100} tint="dark" style={styles.modal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Escolher Data</Text>
                                <Pressable onPress={handleIOSConfirm}>
                                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                </Pressable>
                            </View>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                onChange={handleNativeChange}
                                minimumDate={minimumDate}
                                maximumDate={maximumDate}
                                textColor="#FFF"
                            />
                        </BlurView>
                    </View>
                </Modal>
            )}

            {/* Android Picker */}
            {showPicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={handleNativeChange}
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                />
            )}
        </View>
    );
}

// ============================================
// TIME PICKER
// ============================================

interface TimePickerProps {
    value: Date | null;
    onChange: (date: Date) => void;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
}

export function UniversalTimePicker({
    value,
    onChange,
    label,
    placeholder = '--:--',
    disabled = false,
}: TimePickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(value || new Date());

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

    const handleWebChange = (timeString: string) => {
        if (timeString && value) {
            const [hours, minutes] = timeString.split(':').map(Number);
            const newDate = new Date(value);
            newDate.setHours(hours, minutes, 0, 0);
            onChange(newDate);
        }
    };

    const handleNativeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            // On Android, event.type is 'set' for confirm, 'dismissed' for cancel
            if (event.type === 'set' && selectedDate && value) {
                const newDate = new Date(value);
                newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                onChange(newDate);
            }
        } else if (Platform.OS === 'ios') {
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };

    const handleIOSConfirm = () => {
        if (value) {
            const newDate = new Date(value);
            newDate.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0);
            onChange(newDate);
        }
        setShowPicker(false);
    };

    const getTimeInputValue = () => {
        if (!value) return '';
        const hours = String(value.getHours()).padStart(2, '0');
        const minutes = String(value.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Web: Custom modal time picker (no HTML input)
    if (Platform.OS === 'web') {
        const handleWebTimeConfirm = () => {
            const baseDate = value ? new Date(value) : new Date();
            baseDate.setHours(tempDate.getHours(), tempDate.getMinutes(), 0, 0);
            onChange(baseDate);
            setShowPicker(false);
        };

        const changeHour = (delta: number) => {
            const newDate = new Date(tempDate);
            newDate.setHours(newDate.getHours() + delta);
            setTempDate(newDate);
        };

        const changeMinute = (delta: number) => {
            const newDate = new Date(tempDate);
            newDate.setMinutes(newDate.getMinutes() + delta);
            setTempDate(newDate);
        };

        return (
            <View style={styles.container}>
                {label && <Text style={styles.label}>{label}</Text>}
                <Pressable
                    style={[styles.picker, disabled && styles.pickerDisabled]}
                    onPress={() => {
                        if (!disabled) {
                            setTempDate(value || new Date());
                            setShowPicker(true);
                        }
                    }}
                    disabled={disabled}
                >
                    <View style={[styles.iconWrap, value && styles.iconWrapActiveTime]}>
                        <Ionicons name="time" size={20} color={value && !disabled ? '#10B981' : COLORS.text.tertiary} />
                    </View>
                    <Text style={[styles.valueText, value && !disabled && styles.valueTextActive]}>
                        {value && !disabled ? formatTime(value) : placeholder}
                    </Text>
                </Pressable>

                {/* Custom Web Time Modal */}
                <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
                    <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
                        <View style={styles.webModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Escolher Hora</Text>
                                <Pressable onPress={() => setShowPicker(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text.secondary} />
                                </Pressable>
                            </View>

                            {/* Time Display */}
                            <View style={styles.webTimeRow}>
                                {/* Hours */}
                                <View style={styles.webTimeColumn}>
                                    <Pressable style={styles.webTimeBtn} onPress={() => changeHour(1)}>
                                        <Ionicons name="chevron-up" size={28} color="#10B981" />
                                    </Pressable>
                                    <Text style={styles.webTimeValue}>
                                        {String(tempDate.getHours()).padStart(2, '0')}
                                    </Text>
                                    <Pressable style={styles.webTimeBtn} onPress={() => changeHour(-1)}>
                                        <Ionicons name="chevron-down" size={28} color="#10B981" />
                                    </Pressable>
                                </View>

                                <Text style={styles.webTimeSeparator}>:</Text>

                                {/* Minutes */}
                                <View style={styles.webTimeColumn}>
                                    <Pressable style={styles.webTimeBtn} onPress={() => changeMinute(5)}>
                                        <Ionicons name="chevron-up" size={28} color="#10B981" />
                                    </Pressable>
                                    <Text style={styles.webTimeValue}>
                                        {String(tempDate.getMinutes()).padStart(2, '0')}
                                    </Text>
                                    <Pressable style={styles.webTimeBtn} onPress={() => changeMinute(-5)}>
                                        <Ionicons name="chevron-down" size={28} color="#10B981" />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Confirm Button */}
                            <Pressable style={[styles.webConfirmBtn, { backgroundColor: '#10B981' }]} onPress={handleWebTimeConfirm}>
                                <Text style={styles.webConfirmText}>Confirmar</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Pressable
                style={[styles.picker, disabled && styles.pickerDisabled]}
                onPress={() => {
                    if (!disabled && value) {
                        setTempDate(value);
                        setShowPicker(true);
                    }
                }}
                disabled={disabled}
            >
                <View style={[styles.iconWrap, value && !disabled && styles.iconWrapActiveTime]}>
                    <Ionicons name="time" size={20} color={value && !disabled ? '#10B981' : COLORS.text.tertiary} />
                </View>
                <Text style={[styles.valueText, value && !disabled && styles.valueTextActive]}>
                    {value && !disabled ? formatTime(value) : placeholder}
                </Text>
            </Pressable>

            {/* iOS Modal with Spinner */}
            {showPicker && Platform.OS === 'ios' && value && (
                <Modal transparent animationType="fade">
                    <View style={styles.overlay}>
                        <BlurView intensity={100} tint="dark" style={styles.modal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Escolher Hora</Text>
                                <Pressable onPress={handleIOSConfirm}>
                                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                </Pressable>
                            </View>
                            <DateTimePicker
                                value={tempDate}
                                mode="time"
                                display="spinner"
                                onChange={handleNativeChange}
                                textColor="#FFF"
                            />
                        </BlurView>
                    </View>
                </Modal>
            )}

            {/* Android Picker */}
            {showPicker && Platform.OS === 'android' && value && (
                <DateTimePicker
                    value={tempDate}
                    mode="time"
                    display="default"
                    onChange={handleNativeChange}
                />
            )}
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    label: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xs,
    },
    picker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.surfaceElevated,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    pickerDisabled: {
        opacity: 0.5,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapActive: {
        backgroundColor: '#6366F120',
    },
    iconWrapActiveTime: {
        backgroundColor: '#10B98120',
    },
    valueText: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: '600',
        color: COLORS.text.secondary,
    },
    valueTextActive: {
        color: COLORS.text.primary,
    },

    // Modal
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '85%',
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '700',
        color: '#FFF',
    },

    // Web Modal Styles
    webModal: {
        width: '85%',
        maxWidth: 340,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
    },
    webDateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.lg,
    },
    webArrowBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    webDateCenter: {
        flex: 1,
        alignItems: 'center',
    },
    webDateMonth: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: '600',
        color: COLORS.text.primary,
        textTransform: 'capitalize',
    },
    webDayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    webDayDisplay: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.md,
    },
    webDayText: {
        fontSize: 48,
        fontWeight: '700',
        color: '#6366F1',
    },
    webDayLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
        textTransform: 'capitalize',
        marginTop: SPACING.xs,
    },
    webConfirmBtn: {
        backgroundColor: '#6366F1',
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
    },
    webConfirmText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: '600',
        color: '#FFF',
    },

    // Web Time Picker Styles
    webTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        gap: SPACING.lg,
    },
    webTimeColumn: {
        alignItems: 'center',
    },
    webTimeBtn: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    webTimeValue: {
        fontSize: 48,
        fontWeight: '700',
        color: '#10B981',
        minWidth: 80,
        textAlign: 'center',
    },
    webTimeSeparator: {
        fontSize: 48,
        fontWeight: '700',
        color: COLORS.text.secondary,
    },
});
