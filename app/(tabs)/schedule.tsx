/**
 * Premium Schedule Screen
 * Vista dedicada do horário - Acesso rápido
 */

import { AddClassModal } from '@/components/schedule/AddClassModal';
import { AddEventModal, EventType } from '@/components/schedule/AddEventModal';
import { ClassDetailModal } from '@/components/schedule/ClassDetailModal';
import { QuickAddModal, QuickAddType } from '@/components/schedule/QuickAddModal';
import { WeeklyScheduleGrid } from '@/components/schedule/WeeklyScheduleGrid';
import { useSchedule } from '@/hooks/useSubjects';
import { COLORS, LAYOUT, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { ClassSessionWithSubject, DayOfWeek } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { CopilotStep, walkthroughable } from 'react-native-copilot';

const WalkthroughableView = walkthroughable(View);

export default function ScheduleScreen() {
    const { loading, fetchSchedule, deleteClassSession } = useSchedule();
    const { showAlert } = useAlert();
    const [refreshing, setRefreshing] = useState(false);

    // Tutorial auto-start when navigating from tutorial
    const { useTutorialAutoStart } = require('@/hooks/useTutorialAutoStart');
    useTutorialAutoStart('schedule_view');

    // UI State
    const [classModalVisible, setClassModalVisible] = useState(false);
    const [classDetailVisible, setClassDetailVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState<ClassSessionWithSubject | null>(null);
    const [quickAddVisible, setQuickAddVisible] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ day: DayOfWeek; hour: number } | null>(null);
    const [eventModalVisible, setEventModalVisible] = useState(false);
    const [eventType, setEventType] = useState<EventType>('study');

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchSchedule();
        setRefreshing(false);
    }, [fetchSchedule]);

    const handleBack = () => {
        router.back();
    };

    // Quick add handlers
    const handleSlotPress = (day: DayOfWeek, hour: number) => {
        setSelectedSlot({ day, hour });
        setQuickAddVisible(true);
    };

    const handleQuickAddSelect = (type: QuickAddType, day: DayOfWeek, hour: number) => {
        setQuickAddVisible(false);
        setSelectedSlot({ day, hour });
        if (type === 'class') {
            setClassModalVisible(true);
        } else {
            setEventType(type === 'event' ? 'event' : 'study');
            setEventModalVisible(true);
        }
    };

    const handleSessionPress = (session: ClassSessionWithSubject) => {
        setSelectedSession(session);
        setClassDetailVisible(true);
    };

    const handleEditClass = () => {
        setClassDetailVisible(false);
        setTimeout(() => setClassModalVisible(true), 100);
    };

    const handleDeleteClass = () => {
        if (!selectedSession) return;

        showAlert({
            title: 'Eliminar Aula',
            message: 'Tens a certeza que queres eliminar esta aula?',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteClassSession(selectedSession.id);
                        setClassDetailVisible(false);
                        setSelectedSession(null);
                        handleRefresh();
                    }
                }
            ]
        });
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* ========== HEADER ========== */}
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                </Pressable>
                <CopilotStep text="O teu horário escolar semanal! Vê todas as aulas organizadas! ⏰" order={7} name="schedule_view">
                    <WalkthroughableView>
                        <Text style={styles.headerTitle}>Horário</Text>
                    </WalkthroughableView>
                </CopilotStep>
                <View style={{ width: 40 }} />
            </View>

            {/* ========== CONTENT ========== */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.text.secondary} />
                }
                showsVerticalScrollIndicator={false}
            >
                <WeeklyScheduleGrid
                    onEmptySlotPress={handleSlotPress}
                    onClassPress={handleSessionPress}
                />

                {/* Bottom padding for floating nav */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ========== MODALS ========== */}
            <ClassDetailModal
                visible={classDetailVisible}
                onClose={() => setClassDetailVisible(false)}
                classSession={selectedSession}
                onEdit={handleEditClass}
                onDelete={handleDeleteClass}
            />

            <AddClassModal
                visible={classModalVisible}
                onClose={() => { setClassModalVisible(false); setSelectedSession(null); }}
                onSuccess={handleRefresh}
                initialData={selectedSession}
            />

            <QuickAddModal
                visible={quickAddVisible}
                onClose={() => setQuickAddVisible(false)}
                onSelect={handleQuickAddSelect}
                day={selectedSlot?.day ?? null}
                hour={selectedSlot?.hour ?? null}
            />

            <AddEventModal
                visible={eventModalVisible}
                onClose={() => setEventModalVisible(false)}
                onSuccess={handleRefresh}
                initialDay={selectedSlot?.day}
                initialHour={selectedSlot?.hour}
                initialType={eventType}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: SPACING.md,
        paddingHorizontal: LAYOUT.screenPadding,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: COLORS.surface,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: LAYOUT.screenPadding,
        paddingTop: SPACING.lg,
    },
});
