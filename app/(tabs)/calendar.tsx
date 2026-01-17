/**
 * Premium Calendar Screen
 * Design TripGlide: Dark, Rounded, Elegant
 */

import CreateEventModal from '@/components/CreateEventModal';
import { CreateTodoModal } from '@/components/CreateTodoModal';
import ItemDetailsModal from '@/components/ItemDetailsModal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
    AgendaItem,
    formatTimeRange,
    getItemColor,
    getItemTypeIcon,
    useCalendarItems,
} from '@/hooks/useCalendarItems';
import { usePersonalTodos } from '@/hooks/usePersonalTodos';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import Animated, {
    FadeInDown
} from 'react-native-reanimated';

const WalkthroughableView = walkthroughable(View);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// LOCALE CONFIG
// ============================================

LocaleConfig.locales['pt'] = {
    monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt';

// ============================================
// TYPES
// ============================================

type FilterType = 'all' | 'class' | 'event' | 'task' | 'todo';

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
    { id: 'all', label: 'Tudo', icon: 'apps' },
    { id: 'event', label: 'Eventos', icon: 'calendar' },
    { id: 'task', label: 'Tarefas', icon: 'checkbox' },
];

// ============================================
// ANIMATED PRESSABLE
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// COMPONENT
// ============================================

export default function CalendarScreen() {
    const { refetchProfile } = useProfile();

    // Tutorial auto-start when navigating from tutorial
    const { useTutorialAutoStart } = require('@/hooks/useTutorialAutoStart');
    useTutorialAutoStart('calendar_view');

    // State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [todoModalVisible, setTodoModalVisible] = useState(false);
    const [showAddOptions, setShowAddOptions] = useState(false);

    // Personal todos hook
    const { createTodo } = usePersonalTodos();

    // Focused month for data fetching
    const focusedMonth = useMemo(() => new Date(selectedDate), [selectedDate]);

    // Calendar data
    const { agendaItems, markedDates, loading, refetch } = useCalendarItems(focusedMonth);

    // Items for selected date (filtered)
    const selectedDayItems = useMemo(() => {
        const items = agendaItems[selectedDate] || [];
        if (activeFilter === 'all') return items;
        return items.filter(item => item.item_type === activeFilter);
    }, [agendaItems, selectedDate, activeFilter]);

    // Memoize initial date for the modal to prevent re-renders
    const modalInitialDate = useMemo(() => new Date(selectedDate), [selectedDate]);

    // Marked dates with selected highlight
    const markedDatesWithSelection = useMemo(() => {
        const marks = { ...markedDates };
        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: '#6366F1',
        };
        return marks;
    }, [markedDates, selectedDate]);

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        await refetch();
        await refetchProfile();
    }, [refetch, refetchProfile]);

    // Format date header
    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateString === today.toISOString().split('T')[0]) {
            return 'Hoje';
        } else if (dateString === tomorrow.toISOString().split('T')[0]) {
            return 'Amanhã';
        }
        return date.toLocaleDateString('pt-PT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    };

    // ============================================
    // RENDER ITEM
    // ============================================

    const renderItem = useCallback(({ item, index }: { item: AgendaItem; index: number }) => {
        const itemColor = item.color || getItemColor(item.item_type, item.category);
        const iconName = getItemTypeIcon(item.item_type, item.category) as keyof typeof Ionicons.glyphMap;
        const timeRange = formatTimeRange(item.start_at, item.end_at);

        return (
            <AnimatedPressable
                entering={FadeInDown.delay(index * 50).springify()}
                style={styles.itemCard}
                onPress={() => {
                    setSelectedItem(item);
                    setDetailsModalVisible(true);
                }}
            >
                {/* Gradient Accent */}
                <LinearGradient
                    colors={[itemColor, `${itemColor}80`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.itemAccent}
                />

                {/* Content */}
                <View style={styles.itemContent}>
                    {/* Header Row */}
                    <View style={styles.itemHeaderRow}>
                        <View style={[styles.itemIconContainer, { backgroundColor: `${itemColor}20` }]}>
                            <Ionicons name={iconName} size={18} color={itemColor} />
                        </View>
                        <View style={styles.itemTimeContainer}>
                            <Ionicons name="time-outline" size={14} color={COLORS.text.tertiary} />
                            <Text style={styles.itemTime}>{timeRange}</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.itemTitle, item.is_completed && styles.itemTitleCompleted]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {/* Footer Row */}
                    <View style={styles.itemFooterRow}>
                        {/* Type Badge */}
                        <View style={[styles.itemBadge, { backgroundColor: `${itemColor}15` }]}>
                            <Text style={[styles.itemBadgeText, { color: itemColor }]}>
                                {getItemTypeLabel(item.item_type, item.category)}
                            </Text>
                        </View>

                        {/* Room */}
                        {item.room && (
                            <View style={styles.itemRoom}>
                                <Ionicons name="location-outline" size={12} color={COLORS.text.tertiary} />
                                <Text style={styles.itemRoomText}>{item.room}</Text>
                            </View>
                        )}

                        {/* Completed */}
                        {item.is_completed && (
                            <View style={styles.completedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Chevron */}
                <View style={styles.itemChevron}>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                </View>
            </AnimatedPressable>
        );
    }, []);

    // ============================================
    // RENDER EMPTY
    // ============================================

    const renderEmpty = useCallback(() => {
        return (
            <EmptyState
                icon="sunny-outline"
                title="Dia livre! 🎉"
                message="Aproveita para descansar ou estudar. Não tens eventos agendados."
                actionLabel="Adicionar Evento"
                onAction={() => setModalVisible(true)}
                centered={false}
            />
        );
    }, []);

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar calendário...</Text>
                </View>
            </View>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[0]}
            >
                {/* ========== HEADER ========== */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <CopilotStep text="O teu calendário! Vê aulas, eventos e tarefas organizados por dia 📅" order={5} name="calendar_view">
                            <WalkthroughableView>
                                <Text style={styles.headerTitle}>Calendário</Text>
                            </WalkthroughableView>
                        </CopilotStep>
                        <Pressable style={styles.headerButton} onPress={handleRefresh}>
                            <Ionicons name="refresh" size={20} color={COLORS.text.secondary} />
                        </Pressable>
                    </View>
                </View>

                {/* ========== CALENDAR ========== */}
                <View style={styles.calendarContainer}>
                    <Calendar
                        current={selectedDate}
                        onDayPress={(day) => setSelectedDate(day.dateString)}
                        onMonthChange={(month) => {
                            const newDate = `${month.year}-${String(month.month).padStart(2, '0')}-01`;
                            if (!selectedDate.startsWith(`${month.year}-${String(month.month).padStart(2, '0')}`)) {
                                setSelectedDate(newDate);
                            }
                        }}
                        markingType="multi-dot"
                        markedDates={markedDatesWithSelection}
                        theme={{
                            backgroundColor: 'transparent',
                            calendarBackground: 'transparent',
                            textSectionTitleColor: COLORS.text.tertiary,
                            selectedDayBackgroundColor: '#6366F1',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#6366F1',
                            todayBackgroundColor: 'rgba(99, 102, 241, 0.15)',
                            dayTextColor: COLORS.text.primary,
                            textDisabledColor: COLORS.text.tertiary,
                            dotColor: '#6366F1',
                            selectedDotColor: '#ffffff',
                            arrowColor: COLORS.text.primary,
                            monthTextColor: COLORS.text.primary,
                            indicatorColor: '#6366F1',
                            textDayFontWeight: '500',
                            textMonthFontWeight: '700',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 15,
                            textMonthFontSize: 18,
                            textDayHeaderFontSize: 12,
                        }}
                        style={styles.calendar}
                    />
                </View>

                {/* ========== FILTERS ========== */}
                <View style={styles.filtersContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersContent}
                    >
                        {FILTERS.map((filter) => (
                            <Pressable
                                key={filter.id}
                                style={[
                                    styles.filterChip,
                                    activeFilter === filter.id && styles.filterChipActive,
                                ]}
                                onPress={() => setActiveFilter(filter.id)}
                            >
                                <Ionicons
                                    name={filter.icon as any}
                                    size={16}
                                    color={activeFilter === filter.id ? '#FFF' : COLORS.text.secondary}
                                />
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        activeFilter === filter.id && styles.filterChipTextActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* ========== DATE HEADER ========== */}
                <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>{formatDateHeader(selectedDate)}</Text>
                    <View style={styles.dateHeaderBadge}>
                        <Text style={styles.dateHeaderBadgeText}>{selectedDayItems.length}</Text>
                    </View>
                </View>

                {/* ========== ITEMS LIST ========== */}
                <View style={styles.listContainer}>
                    {selectedDayItems.length > 0 ? (
                        selectedDayItems.map((item, index) => (
                            <View key={item.id}>{renderItem({ item, index })}</View>
                        ))
                    ) : (
                        renderEmpty()
                    )}
                </View>

                {/* Bottom Padding */}
                <View style={{ height: 150 }} />
            </ScrollView>

            {/* ========== FAB with Options ========== */}
            {showAddOptions && (
                <Pressable style={styles.fabOverlay} onPress={() => setShowAddOptions(false)}>
                    <View style={styles.fabOptions}>
                        <Pressable
                            style={styles.fabOption}
                            onPress={() => {
                                setShowAddOptions(false);
                                setTodoModalVisible(true);
                            }}
                        >
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.fabOptionIcon}>
                                <Ionicons name="checkbox" size={20} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.fabOptionText}>Nova Tarefa</Text>
                        </Pressable>
                        <Pressable
                            style={styles.fabOption}
                            onPress={() => {
                                setShowAddOptions(false);
                                setModalVisible(true);
                            }}
                        >
                            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.fabOptionIcon}>
                                <Ionicons name="calendar" size={20} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.fabOptionText}>Novo Evento</Text>
                        </Pressable>
                    </View>
                </Pressable>
            )}
            <Pressable style={styles.fab} onPress={() => setShowAddOptions(true)}>
                <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </LinearGradient>
            </Pressable>

            {/* ========== MODALS ========== */}
            {modalVisible && (
                <CreateEventModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onSuccess={() => refetch()}
                    initialDate={modalInitialDate}
                />
            )}

            <ItemDetailsModal
                visible={detailsModalVisible}
                item={selectedItem}
                onClose={() => {
                    setDetailsModalVisible(false);
                    setSelectedItem(null);
                }}
                onUpdate={() => refetch()}
            />

            <CreateTodoModal
                visible={todoModalVisible}
                onClose={() => setTodoModalVisible(false)}
                onSubmit={async (input) => {
                    await createTodo(input);
                    await refetch();
                }}
            />
        </View>
    );
}

// ============================================
// HELPERS
// ============================================

function getItemTypeLabel(itemType: string, category?: string): string {
    switch (itemType) {
        case 'class': return 'Aula';
        case 'event': return 'Evento';
        case 'task': return 'Tarefa';
        case 'todo':
            // Check category to distinguish task from reminder
            return category === 'tarefa' ? 'Tarefa' : 'Lembrete';
        default: return 'Item';
    }
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },

    // Header
    header: {
        backgroundColor: COLORS.background,
        paddingTop: 60,
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: SPACING.lg,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size['3xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Calendar
    calendarContainer: {
        marginHorizontal: LAYOUT.screenPadding,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.md,
        marginBottom: SPACING.xl,
        ...SHADOWS.md,
    },
    calendar: {
        borderRadius: RADIUS.xl,
    },

    // Filters
    filtersContainer: {
        marginBottom: SPACING.lg,
    },
    filtersContent: {
        paddingHorizontal: LAYOUT.screenPadding,
        gap: SPACING.sm,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    filterChipActive: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    filterChipText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
    filterChipTextActive: {
        color: '#FFF',
    },

    // Date Header
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingHorizontal: LAYOUT.screenPadding,
        marginBottom: SPACING.lg,
    },
    dateHeaderText: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        textTransform: 'capitalize',
    },
    dateHeaderBadge: {
        backgroundColor: '#6366F1',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    dateHeaderBadgeText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },

    // List
    listContainer: {
        paddingHorizontal: LAYOUT.screenPadding,
        gap: SPACING.md,
    },

    // Item Card
    itemCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    itemAccent: {
        width: 4,
    },
    itemContent: {
        flex: 1,
        padding: SPACING.lg,
        gap: SPACING.sm,
    },
    itemHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemIconContainer: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    itemTime: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    itemTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    itemTitleCompleted: {
        textDecorationLine: 'line-through',
        color: COLORS.text.tertiary,
    },
    itemFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginTop: SPACING.xs,
    },
    itemBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    itemBadgeText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    itemRoom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    itemRoomText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },
    completedBadge: {
        marginLeft: 'auto',
    },
    itemChevron: {
        justifyContent: 'center',
        paddingRight: SPACING.md,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING['3xl'],
        gap: SPACING.md,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: '#6366F1',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
        marginTop: SPACING.lg,
    },
    emptyButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 120,
        right: LAYOUT.screenPadding,
        ...SHADOWS.lg,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingBottom: 190,
        paddingRight: LAYOUT.screenPadding,
    },
    fabOptions: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.sm,
        gap: SPACING.xs,
        ...SHADOWS.lg,
    },
    fabOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    fabOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabOptionText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
});