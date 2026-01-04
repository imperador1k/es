/**
 * Premium Subjects & Schedule Screen
 * Design TripGlide: Gestão de disciplinas + Horário semanal
 */

import { AddClassModal } from '@/components/schedule/AddClassModal';
import { AddEventModal, EventType } from '@/components/schedule/AddEventModal';
import { ClassDetailModal } from '@/components/schedule/ClassDetailModal';
import { QuickAddModal, QuickAddType } from '@/components/schedule/QuickAddModal';
import { SubjectDetailModal } from '@/components/schedule/SubjectDetailModal';
import { WeeklyScheduleGrid } from '@/components/schedule/WeeklyScheduleGrid';
import { useSchedule, useSubjects } from '@/hooks/useSubjects';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { ClassSessionWithSubject, DayOfWeek, Subject } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import Animated, { FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const WalkthroughableView = walkthroughable(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// SUBJECT CARD
// ============================================

function SubjectCard({
    subject,
    index,
    sessionsCount,
    onPress,
    onLongPress,
}: {
    subject: Subject;
    index: number;
    sessionsCount: number;
    onPress: () => void;
    onLongPress: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable
            entering={FadeInRight.delay(index * 50).springify()}
            style={[styles.subjectCard, animatedStyle]}
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
        >
            {/* Color Bar */}
            <View style={[styles.subjectColorBar, { backgroundColor: subject.color }]} />

            {/* Content */}
            <View style={styles.subjectContent}>
                <View style={styles.subjectHeader}>
                    <View style={[styles.subjectIcon, { backgroundColor: `${subject.color}20` }]}>
                        <Ionicons name="book" size={18} color={subject.color} />
                    </View>
                    <View style={styles.subjectTitleArea}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        {sessionsCount > 0 && (
                            <View style={styles.sessionsBadge}>
                                <Text style={styles.sessionsBadgeText}>{sessionsCount} aula{sessionsCount > 1 ? 's' : ''}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.subjectDetails}>
                    {subject.teacher_name && (
                        <View style={styles.subjectDetail}>
                            <Ionicons name="person-outline" size={14} color={COLORS.text.tertiary} />
                            <Text style={styles.subjectDetailText}>{subject.teacher_name}</Text>
                        </View>
                    )}
                    {subject.room && (
                        <View style={styles.subjectDetail}>
                            <Ionicons name="location-outline" size={14} color={COLORS.text.tertiary} />
                            <Text style={styles.subjectDetailText}>{subject.room}</Text>
                        </View>
                    )}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
        </AnimatedPressable>
    );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function SubjectsScreen() {
    const { subjects, loading, fetchSubjects, deleteSubject } = useSubjects();
    const { schedule, loading: scheduleLoading, fetchSchedule, getScheduleByDay, deleteClassSession } = useSchedule();
    const { showAlert } = useAlert();

    const [subjectModalVisible, setSubjectModalVisible] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedSession, setSelectedSession] = useState<ClassSessionWithSubject | null>(null);
    const [classModalVisible, setClassModalVisible] = useState(false);
    const [classDetailVisible, setClassDetailVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'disciplinas' | 'horario'>('disciplinas');

    // Quick Add Modal state
    const [quickAddVisible, setQuickAddVisible] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ day: DayOfWeek; hour: number } | null>(null);
    const [eventModalVisible, setEventModalVisible] = useState(false);
    const [eventType, setEventType] = useState<EventType>('study');

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchSubjects(), fetchSchedule()]);
        setRefreshing(false);
    }, [fetchSubjects, fetchSchedule]);

    const getSessionsCountForSubject = (subjectId: string) => {
        return schedule.filter((s) => s.subject_id === subjectId).length;
    };

    const handleAddNew = () => {
        setSelectedSubject(null);
        setSubjectModalVisible(true);
    };

    const handleEditSubject = (subject: Subject) => {
        setSelectedSubject(subject);
        setSubjectModalVisible(true);
    };

    const handleDeleteSubject = (subject: Subject) => {
        showAlert({
            title: 'Eliminar Disciplina',
            message: `Eliminar "${subject.name}" e todas as aulas associadas?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteSubject(subject.id);
                    },
                },
            ]
        });
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
        // Small delay to allow modal to close
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

    return (
        <View style={styles.container}>
            {/* ========== HEADER ========== */}
            <View style={styles.header}>
                <CopilotStep text="As tuas disciplinas e materiais de estudo! Adiciona novas ou gere as existentes! 📚" order={8} name="subjects_view">
                    <WalkthroughableView>
                        <Text style={styles.headerTitle}>Disciplinas</Text>
                    </WalkthroughableView>
                </CopilotStep>
                <Pressable style={styles.addButton} onPress={handleAddNew}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </Pressable>
            </View>

            {/* ========== TABS ========== */}
            <View style={styles.tabsContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'disciplinas' && styles.tabActive]}
                    onPress={() => setActiveTab('disciplinas')}
                >
                    <Ionicons name={activeTab === 'disciplinas' ? 'book' : 'book-outline'} size={18} color={activeTab === 'disciplinas' ? '#FFF' : COLORS.text.secondary} />
                    <Text style={[styles.tabText, activeTab === 'disciplinas' && styles.tabTextActive]}>Disciplinas</Text>
                    {subjects.length > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>{subjects.length}</Text>
                        </View>
                    )}
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'horario' && styles.tabActive]}
                    onPress={() => setActiveTab('horario')}
                >
                    <Ionicons name={activeTab === 'horario' ? 'calendar' : 'calendar-outline'} size={18} color={activeTab === 'horario' ? '#FFF' : COLORS.text.secondary} />
                    <Text style={[styles.tabText, activeTab === 'horario' && styles.tabTextActive]}>Horário</Text>
                </Pressable>
            </View>

            {/* ========== CONTENT ========== */}
            {activeTab === 'disciplinas' ? (
                <FlatList
                    data={subjects}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <SubjectCard
                            subject={item}
                            index={index}
                            sessionsCount={getSessionsCountForSubject(item.id)}
                            onPress={() => handleEditSubject(item)}
                            onLongPress={() => handleDeleteSubject(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.emptyIconGradient}>
                                    <Ionicons name="book-outline" size={40} color="#FFF" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.emptyTitle}>Sem disciplinas</Text>
                            <Text style={styles.emptySubtitle}>Adiciona disciplinas e os seus horários</Text>
                            <Pressable style={styles.emptyButton} onPress={handleAddNew}>
                                <Ionicons name="add" size={18} color="#FFF" />
                                <Text style={styles.emptyButtonText}>Adicionar Disciplina</Text>
                            </Pressable>
                        </View>
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.text.secondary} />}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scheduleContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.text.secondary} />}
                    showsVerticalScrollIndicator={false}
                >
                    <WeeklyScheduleGrid
                        onEmptySlotPress={handleSlotPress}
                        onClassPress={handleSessionPress}
                    />
                    <View style={{ height: 150 }} />
                </ScrollView>
            )}

            {/* ========== MODALS ========== */}
            <SubjectDetailModal
                visible={subjectModalVisible}
                onClose={() => { setSubjectModalVisible(false); setSelectedSubject(null); }}
                subject={selectedSubject}
                onSuccess={handleRefresh}
            />

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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: SPACING.lg,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size['3xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
    },

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        marginHorizontal: LAYOUT.screenPadding,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: 4,
        marginBottom: SPACING.lg,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.xl,
    },
    tabActive: {
        backgroundColor: '#6366F1',
    },
    tabText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    tabTextActive: {
        color: '#FFF',
    },
    tabBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // List
    listContent: {
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: 150,
    },
    scheduleContent: {
        paddingHorizontal: LAYOUT.screenPadding,
    },

    // Subject Card
    subjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        marginBottom: SPACING.md,
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    subjectColorBar: {
        width: 6,
        height: '100%',
        borderTopLeftRadius: RADIUS['2xl'],
        borderBottomLeftRadius: RADIUS['2xl'],
    },
    subjectContent: {
        flex: 1,
        padding: SPACING.lg,
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    subjectIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subjectTitleArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    subjectName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    sessionsBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    sessionsBadgeText: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#6366F1',
    },
    subjectDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginLeft: 48,
    },
    subjectDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    subjectDetailText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING['3xl'],
    },
    emptyIconContainer: {
        marginBottom: SPACING.lg,
    },
    emptyIconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: '#6366F1',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
    },
    emptyButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
});
