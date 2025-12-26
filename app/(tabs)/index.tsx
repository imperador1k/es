import { NextClassCard } from '@/components/schedule/NextClassCard';
import { useTasks } from '@/hooks/useTasks';
import { borderRadius, colors, getQuestStyle, getTierStyle, shadows, spacing, typography } from '@/lib/theme';
import { useProfile } from '@/providers/ProfileProvider';
import { Task, TaskType } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// HELPERS
// ============================================
function getLevel(xp: number): { level: number; progress: number } {
  const xpPerLevel = 200;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXP = (level - 1) * xpPerLevel;
  const progress = ((xp - currentLevelXP) / xpPerLevel) * 100;
  return { level, progress };
}

function formatDueDate(dateString: string | null): string {
  if (!dateString) return 'Sem prazo';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays < 7) return `Em ${diffDays} dias`;
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function HomeScreen() {
  const { profile, loading: profileLoading, refetchProfile } = useProfile();
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const [refreshing, setRefreshing] = useState(false);

  // User data
  const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'Estudante';
  const userXP = profile?.current_xp || 0;
  const userTier = profile?.current_tier || 'Bronze';
  const { level, progress } = getLevel(userXP);
  const tierStyle = getTierStyle(userTier.toLowerCase());

  // Filter tasks
  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedCount = tasks.filter(t => t.is_completed).length;
  const todayQuest = pendingTasks[0]; // Featured quest

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchTasks()]);
    setRefreshing(false);
  }, [refetchProfile, refetchTasks]);

  // Loading state
  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
      >
        {/* ========== HEADER ========== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Olá, {firstName}</Text>
            <Pressable
              style={styles.levelBadge}
              onPress={() => router.push('/leaderboard' as any)}
            >
              <Ionicons name="flash" size={14} color={colors.accent.primary} />
              <Text style={styles.levelText}>Nível {level} · {userXP.toLocaleString()} XP</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
            </Pressable>
          </View>
          <Pressable
            style={styles.avatarContainer}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: tierStyle.bg }]}>
                <Text style={[styles.avatarInitial, { color: tierStyle.text }]}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.tierDot, { backgroundColor: tierStyle.accent }]} />
          </Pressable>
        </View>

        {/* ========== NEXT CLASS CARD ========== */}
        <NextClassCard onPress={() => router.push('/(tabs)/subjects' as any)} />

        {/* ========== FEATURED QUEST CARD ========== */}
        {todayQuest ? (
          <Pressable
            style={styles.featuredCard}
            onPress={() => router.push('/(tabs)/calendar')}
          >
            <View style={styles.featuredHeader}>
              <View style={styles.featuredBadge}>
                <Ionicons name="flash" size={12} color={colors.accent.primary} />
                <Text style={styles.featuredBadgeText}>Quest Prioritária</Text>
              </View>
              <XPBadge amount={todayQuest.xp_reward || 30} />
            </View>
            <Text style={styles.featuredTitle}>{todayQuest.title}</Text>
            {todayQuest.description && (
              <Text style={styles.featuredDescription} numberOfLines={2}>
                {todayQuest.description}
              </Text>
            )}
            <View style={styles.featuredFooter}>
              <View style={styles.featuredMeta}>
                <QuestTypePill type={todayQuest.type} />
                <Text style={styles.featuredDue}>
                  {formatDueDate(todayQuest.due_date)}
                </Text>
              </View>
              <View style={styles.featuredArrow}>
                <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success.primary} />
            </View>
            <Text style={styles.emptyTitle}>Tudo em dia!</Text>
            <Text style={styles.emptySubtitle}>
              Não tens quests pendentes. Adiciona novas na aba Quests.
            </Text>
          </View>
        )}

        {/* ========== STATS ROW ========== */}
        <View style={styles.statsRow}>
          <StatCard
            icon="flash-outline"
            value={userXP.toLocaleString()}
            label="XP Total"
            color={colors.accent.primary}
          />
          <StatCard
            icon="checkmark-done-outline"
            value={completedCount.toString()}
            label="Completas"
            color={colors.success.primary}
          />
          <StatCard
            icon="time-outline"
            value={pendingTasks.length.toString()}
            label="Pendentes"
            color={colors.warning.primary}
          />
        </View>

        {/* ========== POMODORO QUICK ACCESS ========== */}
        <Pressable
          style={styles.pomodoroCard}
          onPress={() => router.push('/pomodoro' as any)}
        >
          <View style={styles.pomodoroLeft}>
            <View style={styles.pomodoroIcon}>
              <Ionicons name="timer-outline" size={28} color={colors.accent.primary} />
            </View>
            <View>
              <Text style={styles.pomodoroTitle}>⏱️ Pomodoro Timer</Text>
              <Text style={styles.pomodoroSubtitle}>
                Foca-te e ganha XP por cada sessão
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </Pressable>



        {/* ========== LEVEL PROGRESS ========== */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Progresso</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {200 - (userXP % 200)} XP para o próximo nível
          </Text>
        </View>

        {/* ========== UPCOMING QUESTS ========== */}
        {pendingTasks.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximas Quests</Text>
              <Pressable onPress={() => router.push('/(tabs)/calendar')}>
                <Text style={styles.sectionLink}>Ver todas</Text>
              </Pressable>
            </View>
            {pendingTasks.slice(1, 4).map((task) => (
              <QuestCard key={task.id} task={task} />
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// SUB COMPONENTS
// ============================================
function XPBadge({ amount }: { amount: number }) {
  return (
    <View style={styles.xpBadge}>
      <Text style={styles.xpText}>+{amount} XP</Text>
    </View>
  );
}

function QuestTypePill({ type }: { type: TaskType }) {
  const style = getQuestStyle(type);
  const icons: Record<TaskType, keyof typeof Ionicons.glyphMap> = {
    study: 'book-outline',
    assignment: 'document-text-outline',
    exam: 'school-outline',
  };
  const labels: Record<TaskType, string> = {
    study: 'Estudo',
    assignment: 'Trabalho',
    exam: 'Exame',
  };

  return (
    <View style={[styles.typePill, { backgroundColor: style.bg }]}>
      <Ionicons name={icons[type]} size={12} color={style.icon} />
      <Text style={[styles.typePillText, { color: style.text }]}>{labels[type]}</Text>
    </View>
  );
}

function StatCard({ icon, value, label, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuestCard({ task }: { task: Task }) {
  const questStyle = getQuestStyle(task.type);

  return (
    <Pressable style={styles.questCard}>
      <View style={[styles.questIndicator, { backgroundColor: questStyle.icon }]} />
      <View style={styles.questContent}>
        <Text style={styles.questTitle} numberOfLines={1}>{task.title}</Text>
        <Text style={styles.questMeta}>
          {formatDueDate(task.due_date)}
        </Text>
      </View>
      <View style={styles.questXP}>
        <Text style={styles.questXPText}>+{task.xp_reward || 30}</Text>
        <Ionicons name="flash" size={12} color={colors.accent.primary} />
      </View>
    </Pressable>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  levelText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  tierDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.background,
  },

  // Featured Card
  featuredCard: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    ...shadows.lg,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  featuredBadgeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },
  featuredTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  featuredDescription: {
    fontSize: typography.size.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featuredDue: {
    fontSize: typography.size.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  featuredArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing['3xl'],
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    ...shadows.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // XP Badge
  xpBadge: {
    backgroundColor: colors.success.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  xpText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.success.dark,
  },

  // Type Pill
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typePillText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  // Progress Section
  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
    ...shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressPercent: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },

  // Section
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  sectionLink: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.accent.primary,
  },

  // Quest Card
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  questIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  questContent: {
    flex: 1,
  },
  questTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  questMeta: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  questXP: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  questXPText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.accent.primary,
  },

  // Pomodoro Quick Access
  pomodoroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.primary + '30',
    ...shadows.sm,
  },
  pomodoroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pomodoroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomodoroTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  pomodoroSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
