/**
 * Premium Home Screen - Dashboard Real
 * Dados reais do Supabase + Links corretos
 */

import { ImmersiveCard } from '@/components/ImmersiveCard';
import { useCalendarItems } from '@/hooks/useCalendarItems';
import { supabase } from '@/lib/supabase';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { CopilotStep, walkthroughable } from 'react-native-copilot';

const WalkthroughableView = walkthroughable(View);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// QUICK ACTIONS DATA
// ============================================

const QUICK_ACTIONS = [
  { id: 'calendar', icon: 'calendar-outline', label: 'Calendário', route: '/(tabs)/calendar' },
  { id: 'schedule', icon: 'time-outline', label: 'Horário', route: '/(tabs)/schedule' as any },
  { id: 'rooms', icon: 'people-outline', label: 'Salas', route: '/(app)/study-room' },
  { id: 'ai', icon: 'sparkles', label: 'AI Tutor', route: '/(app)/ai-tutor' },
  { id: 'focus', icon: 'timer-outline', label: 'Foco', route: '/pomodoro' },
];

// ============================================
// TYPES
// ============================================

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
  priority: string;
  subject_id: string | null;
}

interface NextClass {
  id: string;
  subject_name: string;
  room: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
}

// ============================================
// COMPONENT
// ============================================

export default function HomeScreen() {
  const { profile, refetchProfile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch next class from calendar
  const { agendaItems } = useCalendarItems(new Date());

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_todos')
        .select('*')
        .eq('user_id', profile?.id)
        .order('due_date', { ascending: true })
        .limit(5);

      if (!error && data) {
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchNextClass = async () => {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday

      const { data, error } = await supabase
        .from('class_schedule')
        .select(`
          id,
          room,
          start_time,
          end_time,
          day_of_week,
          user_subjects (name)
        `)
        .eq('user_id', profile?.id)
        .eq('day_of_week', dayOfWeek)
        .order('start_time', { ascending: true })
        .limit(1);

      if (!error && data && data.length > 0) {
        const classData = data[0];
        setNextClass({
          id: classData.id,
          subject_name: (classData.user_subjects as any)?.name || 'Aula',
          room: classData.room || 'Sala',
          start_time: classData.start_time,
          end_time: classData.end_time,
          day_of_week: classData.day_of_week,
        });
      }
    } catch (err) {
      console.error('Error fetching next class:', err);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      setLoading(true);
      Promise.all([fetchTasks(), fetchNextClass()]).finally(() => setLoading(false));
    }
  }, [profile?.id]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), fetchTasks(), fetchNextClass()]);
    setRefreshing(false);
  }, [refetchProfile]);

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = profile?.username?.split(' ')[0] || 'Estudante';

  // Format time
  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Format due date
  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'Sem prazo';
    const date = new Date(dueDate);
    const now = new Date();
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 0) return 'Atrasado';
    if (diffHours < 1) return 'Menos de 1h';
    if (diffHours < 24) return `${diffHours}h restantes`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Amanhã';
    return `${diffDays} dias`;
  };

  // Toggle task completion
  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('personal_todos')
        .update({ is_completed: !currentStatus })
        .eq('id', taskId);

      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, is_completed: !currentStatus } : t)
      );
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.text.secondary}
          />
        }
      >

        {/* ========== HEADER ========== */}
        <View style={styles.header}>
          <CopilotStep text="Bem-vindo ao teu QG de estudo! 🚀" order={1} name="home_welcome">
            <WalkthroughableView style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </WalkthroughableView>
          </CopilotStep>
          <Pressable
            style={styles.avatarContainer}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={COLORS.text.secondary} />
              </View>
            )}
            {profile?.current_xp !== undefined && (
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>{profile.current_xp}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ========== SEARCH BAR ========== */}
        <Pressable
          style={styles.searchContainer}
          onPress={() => router.push('/(tabs)/planner')}
        >
          <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
          <Text style={styles.searchPlaceholder}>Pesquisar aulas, tarefas...</Text>
        </Pressable>

        {/* ========== HERO CARD - PRÓXIMA AULA ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximo</Text>
          {nextClass ? (
            <ImmersiveCard
              image="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800"
              title={nextClass.subject_name}
              subtitle="Próxima aula"
              badge="Hoje"
              badgeColor="#10B981"
              time={`${formatTime(nextClass.start_time)} - ${formatTime(nextClass.end_time)}`}
              location={nextClass.room}
              variant="hero"
              onPress={() => router.push('/(tabs)/calendar')}
            />
          ) : (
            <View style={styles.emptyHero}>
              <Ionicons name="sunny-outline" size={48} color={COLORS.text.tertiary} />
              <Text style={styles.emptyHeroText}>Sem aulas agendadas para hoje!</Text>
              <Pressable
                style={styles.emptyHeroButton}
                onPress={() => router.push('/(tabs)/schedule' as any)}
              >
                <Text style={styles.emptyHeroButtonText}>Ver Horário</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ========== QUICK ACTIONS ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={action.icon as any} size={24} color={COLORS.text.primary} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ========== O MEU PLANO (TAREFAS REAIS) ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>O Meu Plano</Text>
            <Pressable onPress={() => router.push('/(tabs)/planner')}>
              <Text style={styles.seeAllText}>Ver tudo</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.accent.primary} style={{ padding: 40 }} />
          ) : tasks.length > 0 ? (
            <View style={styles.planList}>
              {tasks.map((task) => (
                <Pressable
                  key={task.id}
                  style={[styles.taskCard, task.is_completed && styles.taskCompleted]}
                  onPress={() => toggleTask(task.id, task.is_completed)}
                >
                  <View
                    style={[
                      styles.taskColorBar,
                      {
                        backgroundColor: task.is_completed
                          ? COLORS.success
                          : task.priority === 'high'
                            ? '#EF4444'
                            : task.priority === 'medium'
                              ? '#F59E0B'
                              : '#4F46E5',
                      },
                    ]}
                  />
                  <View style={styles.taskContent}>
                    <Text
                      style={[styles.taskTitle, task.is_completed && styles.taskTitleCompleted]}
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>
                    <View style={styles.taskMeta}>
                      <Ionicons
                        name={task.is_completed ? 'checkmark-circle' : 'time-outline'}
                        size={12}
                        color={task.is_completed ? COLORS.success : COLORS.text.tertiary}
                      />
                      <Text
                        style={[
                          styles.taskTime,
                          task.is_completed && { color: COLORS.success },
                        ]}
                      >
                        {task.is_completed ? 'Concluído' : formatDueDate(task.due_date)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.taskCheckbox}>
                    <Ionicons
                      name={task.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={task.is_completed ? COLORS.success : COLORS.text.tertiary}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTasks}>
              <Ionicons name="checkbox-outline" size={32} color={COLORS.text.tertiary} />
              <Text style={styles.emptyTasksText}>Sem tarefas pendentes</Text>
              <Pressable
                style={styles.addTaskButton}
                onPress={() => router.push('/(tabs)/planner')}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addTaskButtonText}>Criar Tarefa</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ========== STATS RÁPIDOS ========== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsGrid}>
            <Pressable style={styles.statCard} onPress={() => router.push('/leaderboard')}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                <Ionicons name="trophy" size={20} color="#6366F1" />
              </View>
              <Text style={styles.statValue}>{profile?.current_xp || 0}</Text>
              <Text style={styles.statLabel}>XP Total</Text>
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => router.push('/badges')}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="flame" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{profile?.current_streak || 0}</Text>
              <Text style={styles.statLabel}>Dias Streak</Text>
            </Pressable>

            <Pressable style={styles.statCard} onPress={() => router.push('/(tabs)/teams')}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Ionicons name="people" size={20} color="#10B981" />
              </View>
              <Text style={styles.statValue}>
                {tasks.filter(t => t.is_completed).length}/{tasks.length}
              </Text>
              <Text style={styles.statLabel}>Tarefas</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Padding for Floating Nav */}
        <View style={{ height: 120 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  headerLeft: {},
  greeting: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#6366F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  xpText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING['2xl'],
    gap: SPACING.md,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.tertiary,
  },

  // Sections
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.accent.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Empty Hero
  emptyHero: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    padding: SPACING['2xl'],
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyHeroText: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text.secondary,
  },
  emptyHeroButton: {
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  emptyHeroButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFF',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  quickActionCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - LAYOUT.screenPadding * 2 - SPACING.md * 3) / 4,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text.secondary,
  },

  // Tasks
  planList: {
    gap: SPACING.md,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  taskCompleted: {
    opacity: 0.6,
  },
  taskColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: SPACING.lg,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.text.tertiary,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  taskTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
  },
  taskCheckbox: {
    marginLeft: SPACING.md,
  },

  // Empty Tasks
  emptyTasks: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    padding: SPACING['2xl'],
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyTasksText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.tertiary,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  addTaskButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFF',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
});
