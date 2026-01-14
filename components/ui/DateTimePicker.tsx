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

    // Web: Use native HTML date input
    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                {label && <Text style={styles.label}>{label}</Text>}
                <Pressable
                    style={styles.picker}
                    onPress={() => {
                        // Trigger the hidden input
                        const input = document.querySelector(`#date-picker-${label?.replace(/\s/g, '-') || 'default'}`) as HTMLInputElement;
                        if (input) input.showPicker?.();
                    }}
                >
                    <View style={[styles.iconWrap, value && styles.iconWrapActive]}>
                        <Ionicons name="calendar" size={20} color={value ? '#6366F1' : COLORS.text.tertiary} />
                    </View>
                    <Text style={[styles.valueText, value && styles.valueTextActive]}>
                        {value ? formatDate(value) : placeholder}
                    </Text>
                    <input
                        id={`date-picker-${label?.replace(/\s/g, '-') || 'default'}`}
                        type="date"
                        value={value ? formatDateForInput(value) : ''}
                        onChange={(e) => handleWebChange(e.target.value)}
                        min={minimumDate ? formatDateForInput(minimumDate) : undefined}
                        max={maximumDate ? formatDateForInput(maximumDate) : undefined}
                        style={{
                            position: 'absolute',
                            opacity: 0,
                            pointerEvents: 'none',
                            width: 0,
                            height: 0,
                        }}
                    />
                </Pressable>
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

    // Web: Use native HTML time input
    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                {label && <Text style={styles.label}>{label}</Text>}
                <Pressable
                    style={[styles.picker, disabled && styles.pickerDisabled]}
                    onPress={() => {
                        if (!disabled) {
                            const input = document.querySelector(`#time-picker-${label?.replace(/\s/g, '-') || 'default'}`) as HTMLInputElement;
                            if (input) input.showPicker?.();
                        }
                    }}
                >
                    <View style={[styles.iconWrap, value && styles.iconWrapActiveTime]}>
                        <Ionicons name="time" size={20} color={value && !disabled ? '#10B981' : COLORS.text.tertiary} />
                    </View>
                    <Text style={[styles.valueText, value && !disabled && styles.valueTextActive]}>
                        {value && !disabled ? formatTime(value) : placeholder}
                    </Text>
                    <input
                        id={`time-picker-${label?.replace(/\s/g, '-') || 'default'}`}
                        type="time"
                        value={getTimeInputValue()}
                        onChange={(e) => handleWebChange(e.target.value)}
                        disabled={disabled}
                        style={{
                            position: 'absolute',
                            opacity: 0,
                            pointerEvents: 'none',
                            width: 0,
                            height: 0,
                        }}
                    />
                </Pressable>
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
});
