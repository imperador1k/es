/**
 * Team Details Screen - Premium Dark Design
 * Fixed layout with proper scroll and quick actions
 */

import { CachedImage } from '@/components/CachedImage';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { useTeam } from '@/providers/TeamsProvider';
import { Channel, Team, TeamTask } from '@/types/database.types';
import { canUser } from '@/utils/permissions';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreateEventModal } from '@/components/CreateEventModal';
import { CreateTodoModal } from '@/components/CreateTodoModal';

// ============================================
// TYPES & INTERFACES
// ============================================

interface TaskWithSubmission extends TeamTask {
    my_submission: { status: string; submitted_at: string | null } | null;
    creator?: { username: string; avatar_url: string | null } | null;
    team?: { name: string; color: string } | null;
}

interface TeamEvent {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
    type: string;
    color?: string | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_BUTTON_SIZE = (SCREEN_WIDTH - SPACING.xl * 2 - SPACING.md * 2) / 3;

// ============================================
// MAIN COMPONENT
// ============================================

type TeamTab = 'general' | 'chat' | 'tasks' | 'events';

export default function TeamDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const { profile } = useProfile();
    const { team, loading: teamLoading } = useTeam(id);
    const userRole = team?.role || null;

    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chatModalVisible, setChatModalVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [activeTab, setActiveTab] = useState<TeamTab>('general');
    const [tasks, setTasks] = useState<TaskWithSubmission[]>([]);
    const [events, setEvents] = useState<TeamEvent[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventModalVisible, setEventModalVisible] = useState(false);

    const canCreateTask = canUser(userRole, 'CREATE_TASK');
    const canCreateEvent = canUser(userRole, 'CREATE_TASK'); // Using same permission for simplicity now

    // Load data
    const loadData = useCallback(async () => {
        if (!id || !user?.id) return;

        try {
            const [channelsRes, membersRes, tasksRes, eventsRes, submissionsRes] = await Promise.all([
                supabase
                    .from('channels')
                    .select('*')
                    .eq('team_id', id)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('team_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', id),
                supabase
                    .from('tasks')
                    .select(`*, creator:created_by(username, avatar_url)`)
                    .eq('team_id', id)
                    .is('deleted_at', null)
                    .order('due_date', { ascending: true, nullsFirst: false }),
                supabase
                    .from('team_events')
                    .select('*')
                    .eq('team_id', id)
                    .order('start_time', { ascending: true }),
                supabase
                    .from('task_submissions')
                    .select('task_id, status, submitted_at')
                    .eq('user_id', user.id)
            ]);

            setChannels((channelsRes.data as Channel[]) || []);
            setMemberCount(membersRes.count || 0);
            
            // Handle Tasks
            const submissionsMap = new Map<string, { status: string; submitted_at: string | null }>();
            (submissionsRes.data || []).forEach((s: any) => {
                submissionsMap.set(s.task_id, { status: s.status, submitted_at: s.submitted_at });
            });

            const combinedTasks: TaskWithSubmission[] = (tasksRes.data || []).map((task: any) => ({
                ...task,
                my_submission: submissionsMap.get(task.id) || null,
            }));
            setTasks(combinedTasks);
            
            // Handle Events
            setEvents((eventsRes.data as TeamEvent[]) || []);

        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
            setTasksLoading(false);
            setEventsLoading(false);
        }
    }, [id, user?.id]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleChatPress = () => {
        if (channels.length === 0) {
            if (userRole === 'owner' || userRole === 'admin') {
                router.push(`/team/${id}/channels` as any);
            } else {
                // For regular members with no channels, maybe do nothing or show alert
                // but usually there's at least one default channel
            }
            return;
        }

        if (channels.length === 1) {
            router.push(`/team/${id}/channel/${channels[0].id}` as any);
            return;
        }

        setChatModalVisible(true);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    useEffect(() => {
        if (!teamLoading && !team && id) {
            setError('Squad não encontrada');
        }
    }, [teamLoading, team, id]);



    if (loading || teamLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            </View>
        );
    }

    if (error || !team) {
        return (
            <View style={styles.container}>
                <SafeAreaView style={styles.errorContainer}>
                    <View style={styles.errorIconContainer}>
                        <Ionicons name="alert-circle" size={48} color="#EF4444" />
                    </View>
                    <Text style={styles.errorTitle}>{error || 'Erro'}</Text>
                    <Pressable style={styles.errorButton} onPress={() => router.back()}>
                        <Text style={styles.errorButtonText}>Voltar</Text>
                    </Pressable>
                </SafeAreaView>
            </View>
        );
    }

    const teamColor = team.color || '#6366F1';

    // ============================================
    // TAB RENDERING
    // ============================================

    const renderGeneralTab = () => (
        <View style={styles.tabSection}>
            <View style={styles.quickActionsGrid}>
                <QuickActionItem 
                    icon="people-outline" 
                    label="Membros" 
                    color="#EC4899" 
                    onPress={() => router.push(`/team/members?teamId=${id}` as any)} 
                />
                <QuickActionItem 
                    icon="folder-outline" 
                    label="Ficheiros" 
                    color="#6366F1" 
                    onPress={() => router.push(`/team/${id}/files` as any)} 
                />
                <QuickActionItem 
                    icon="trophy-outline" 
                    label="Ranking" 
                    color="#FFD700" 
                    onPress={() => router.push(`/team/${id}/leaderboard` as any)} 
                />
                <QuickActionItem 
                    icon="settings-outline" 
                    label="Opções" 
                    color={COLORS.text.tertiary} 
                    onPress={() => router.push(`/team/${id}/settings` as any)} 
                />
            </View>

            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Próximas Tarefas</Text>
                <Pressable onPress={() => setActiveTab('tasks')}>
                    <Text style={styles.seeAllText}>Ver todas</Text>
                </Pressable>
            </View>
            {tasks.filter(t => !t.my_submission || t.my_submission.status !== 'graded').slice(0, 3).map(task => (
                <TaskCard key={task.id} task={task} userId={user?.id || ''} onPress={() => router.push(`/team/${id}/tasks/${task.id}` as any)} />
            ))}
            {tasks.filter(t => !t.my_submission || t.my_submission.status !== 'graded').length === 0 && <Text style={styles.emptyTextInline}>Nenhuma tarefa pendente</Text>}

            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Agenda do Grupo</Text>
                <Pressable onPress={() => setActiveTab('events')}>
                    <Text style={styles.seeAllText}>Ver agenda</Text>
                </Pressable>
            </View>
            {events.slice(0, 2).map(event => (
                <EventCard key={event.id} event={event} />
            ))}
            {events.length === 0 && <Text style={styles.emptyTextInline}>Nenhum evento agendado</Text>}
        </View>
    );

    const renderChatTab = () => (
        <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Canais de Discussão</Text>
                {(userRole === 'owner' || userRole === 'admin') && (
                    <Pressable onPress={() => router.push(`/team/${id}/channels` as any)}>
                        <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                    </Pressable>
                )}
            </View>
            {channels.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={40} color={COLORS.text.tertiary} />
                    <Text style={styles.emptyTitle}>Sem canais</Text>
                </View>
            ) : (
                channels.map((channel) => (
                    <ChannelCard key={channel.id} channel={channel} teamId={id} />
                ))
            )}
        </View>
    );

    const renderTasksTab = () => (
        <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Todas as Tarefas</Text>
                {canCreateTask && (
                    <Pressable onPress={() => router.push(`/team/${id}/tasks/new` as any)}>
                        <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                    </Pressable>
                )}
            </View>
            {tasks.map(task => (
                <TaskCard key={task.id} task={task} userId={user?.id || ''} onPress={() => router.push(`/team/${id}/tasks/${task.id}` as any)} />
            ))}
            {tasks.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="checkbox-outline" size={40} color={COLORS.text.tertiary} />
                    <Text style={styles.emptyTitle}>Sem tarefas</Text>
                </View>
            )}
        </View>
    );

    const renderEventsTab = () => (
        <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Eventos & Reuniões</Text>
                {canCreateEvent && (
                    <Pressable onPress={() => setEventModalVisible(true)}>
                        <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                    </Pressable>
                )}
            </View>
            {events.map(event => (
                <EventCard key={event.id} event={event} />
            ))}
            {events.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={40} color={COLORS.text.tertiary} />
                    <Text style={styles.emptyTitle}>Sem eventos marcados</Text>
                    <Text style={styles.emptySubtitle}>Agenda uma reunião ou sessão de estudo</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Nav Row - Fixed */}
                <View style={styles.navRow}>
                    <Pressable style={styles.navButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <Pressable style={styles.navButton} onPress={() => router.push(`/team/${id}/settings` as any)}>
                        <Ionicons name="settings-outline" size={22} color={COLORS.text.primary} />
                    </Pressable>
                </View>

                {/* Scrollable Content */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />
                    }
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Hero Gradient */}
                    <LinearGradient
                        colors={[`${teamColor}30`, 'transparent']}
                        style={styles.heroGradient}
                    />

                    {/* Team Info */}
                    <View style={styles.teamInfo}>
                        {team.icon_url ? (
                            <CachedImage uri={team.icon_url} style={styles.teamAvatar} />
                        ) : (
                            <LinearGradient colors={[teamColor, `${teamColor}99`]} style={styles.teamAvatarPlaceholder}>
                                <Text style={styles.teamInitial}>{team.name.charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                        )}
                        <Text style={styles.teamName}>{team.name}</Text>
                        {team.description && (
                            <Text style={styles.teamDescription} numberOfLines={2}>{team.description}</Text>
                        )}
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <Pressable style={styles.statItem} onPress={() => router.push(`/team/members?teamId=${id}` as any)}>
                            <Text style={styles.statValue}>{memberCount}</Text>
                            <Text style={styles.statLabel}>Membros</Text>
                        </Pressable>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{channels.length}</Text>
                            <Text style={styles.statLabel}>Canais</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: teamColor }]}>
                                {userRole === 'owner' ? 'Dono' : userRole === 'admin' ? 'Admin' : 'Membro'}
                            </Text>
                            <Text style={styles.statLabel}>Cargo</Text>
                        </View>
                    </View>

                    {/* HUB TABS */}
                    <View style={styles.tabBar}>
                        <TabItem 
                            active={activeTab === 'general'} 
                            label="Geral" 
                            icon="grid-outline" 
                            onPress={() => setActiveTab('general')} 
                        />
                        <TabItem 
                            active={activeTab === 'chat'} 
                            label="Chat" 
                            icon="chatbubbles-outline" 
                            onPress={() => setActiveTab('chat')} 
                        />
                        <TabItem 
                            active={activeTab === 'tasks'} 
                            label="Tarefas" 
                            icon="checkbox-outline" 
                            onPress={() => setActiveTab('tasks')} 
                        />
                        <TabItem 
                            active={activeTab === 'events'} 
                            label="Eventos" 
                            icon="calendar-outline" 
                            onPress={() => setActiveTab('events')} 
                        />
                    </View>

                    {/* TAB CONTENT */}
                    <View style={styles.tabContent}>
                        {activeTab === 'general' && renderGeneralTab()}
                        {activeTab === 'chat' && renderChatTab()}
                        {activeTab === 'tasks' && renderTasksTab()}
                        {activeTab === 'events' && renderEventsTab()}
                    </View>
                </ScrollView>

                {/* MODALS */}
                <CreateEventModal 
                    visible={eventModalVisible} 
                    onClose={() => setEventModalVisible(false)} 
                    teamId={id}
                    onSuccess={() => {
                        setEventModalVisible(false);
                        handleRefresh();
                    }}
                />
            </SafeAreaView>
        </View>
    );
}

// ============================================
// QUICK ACTION CARD - Fixed size
// ============================================

function QuickActionCard({
    icon,
    label,
    color,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={[styles.quickActionCard, { transform: [{ scale }] }]}>
                <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={24} color={color} />
                </View>
                <Text style={styles.quickActionLabel} numberOfLines={1}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// CHANNEL CARD
// ============================================

function ChannelCard({ channel, teamId }: { channel: Channel; teamId: string }) {
    const scale = useRef(new Animated.Value(1)).current;

    return (
        <Pressable
            onPress={() => router.push(`/team/${teamId}/channel/${channel.id}` as any)}
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        >
            <Animated.View style={[styles.channelCard, { transform: [{ scale }] }]}>
                <View style={styles.channelIcon}>
                    {channel.type === 'chat' ? (
                        <Text style={styles.channelHash}>#</Text>
                    ) : (
                        <Ionicons name="mic-outline" size={18} color={COLORS.text.tertiary} />
                    )}
                </View>
                <View style={styles.channelContent}>
                    <Text style={styles.channelName}>{channel.name}</Text>
                    {channel.description && (
                        <Text style={styles.channelDescription} numberOfLines={1}>{channel.description}</Text>
                    )}
                </View>
                {channel.is_private && <Ionicons name="lock-closed" size={14} color={COLORS.text.tertiary} style={{ marginRight: SPACING.sm }} />}
                <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// NEW HUB COMPONENTS
// ============================================

function TabItem({ active, label, icon, onPress }: { active: boolean; label: string; icon: any; onPress: () => void }) {
    return (
        <Pressable style={[styles.tabItem, active && styles.tabItemActive]} onPress={onPress}>
            <Ionicons name={icon} size={20} color={active ? '#6366F1' : COLORS.text.tertiary} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
        </Pressable>
    );
}

function QuickActionItem({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
    return (
        <Pressable style={styles.quickActionItem} onPress={onPress}>
            <View style={[styles.quickActionIconSmall, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.quickActionLabelSmall}>{label}</Text>
        </Pressable>
    );
}

function TaskCard({ task, userId, onPress }: { task: TaskWithSubmission; userId: string; onPress: () => void }) {
    const isCompleted = task.my_submission?.status === 'graded';
    const { text: dueText, color: dueColor } = formatDueDate(task.due_date);

    return (
        <Pressable style={styles.taskCard} onPress={onPress}>
            <View style={[styles.taskIcon, { backgroundColor: isCompleted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name={isCompleted ? 'checkmark-circle' : 'document-text-outline'} size={24} color={isCompleted ? '#22C55E' : '#6366F1'} />
            </View>
            <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={[styles.taskDue, { color: dueColor }]}>{dueText}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
        </Pressable>
    );
}

function EventCard({ event }: { event: TeamEvent }) {
    const startTime = new Date(event.start_time);
    const timeStr = startTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const dateStr = startTime.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });

    // Determinar ícone e cor com base no tipo
    const getEventStyles = (type: string) => {
        switch (type) {
            case 'meeting': return { icon: 'people', color: '#6366F1' };
            case 'presentation': return { icon: 'easel', color: '#8B5CF6' };
            case 'deadline': return { icon: 'time', color: '#EF4444' };
            case 'study_session': return { icon: 'book', color: '#F59E0B' };
            case 'social': return { icon: 'beer', color: '#EC4899' };
            default: return { icon: 'calendar', color: '#10B981' };
        }
    };

    const { icon, color } = getEventStyles(event.type);

    return (
        <View style={styles.eventCard}>
            <View style={[styles.eventColorBar, { backgroundColor: color }]} />
            <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                    <View style={styles.eventTitleRow}>
                        <Ionicons name={icon as any} size={16} color={color} style={{ marginRight: 6 }} />
                        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    </View>
                    <View style={styles.eventTimeBadge}>
                        <Text style={[styles.eventTimeText, { color }]}>{timeStr}</Text>
                    </View>
                </View>
                <View style={styles.eventFooter}>
                    <Text style={styles.eventDate}>{dateStr}</Text>
                    {event.location && (
                        <View style={styles.eventLocation}>
                            <Ionicons name="location-outline" size={12} color={COLORS.text.tertiary} />
                            <Text style={styles.eventLocationText} numberOfLines={1}>{event.location}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

function formatDueDate(dueDate: string | null) {
    if (!dueDate) return { text: 'Sem prazo', color: COLORS.text.tertiary };
    const date = new Date(dueDate);
    const now = new Date();
    now.setHours(0,0,0,0);
    const itemDate = new Date(date);
    itemDate.setHours(0,0,0,0);
    
    const diff = Math.round((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { text: 'Atrasado', color: '#EF4444' };
    if (diff === 0) return { text: 'Hoje', color: '#F59E0B' };
    if (diff === 1) return { text: 'Amanhã', color: '#F59E0B' };
    return { text: date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }), color: COLORS.text.tertiary };
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 60,
    },

    // Nav Row
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    navButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Hero
    heroGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },

    // Team Info
    teamInfo: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.md,
    },
    teamAvatar: {
        width: 80,
        height: 80,
        borderRadius: 24,
        marginBottom: SPACING.md,
    },
    teamAvatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    teamInitial: {
        fontSize: 32,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    teamName: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    teamDescription: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        maxWidth: 280,
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.xl,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
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
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },

    // Section
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.xl,
        marginBottom: SPACING.md,
    },
    sectionBadge: {
        marginLeft: SPACING.sm,
        backgroundColor: COLORS.surfaceMuted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    sectionBadgeText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },

    // Quick Actions - Horizontal scroll
    quickActionsScroll: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
    },
    quickActionCard: {
        width: 90,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    quickActionLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        textAlign: 'center',
    },

    // Channels
    channelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    channelIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    channelHash: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.tertiary,
    },
    channelContent: {
        flex: 1,
    },
    channelName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    channelDescription: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // Error
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    errorTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xl,
    },
    errorButton: {
        backgroundColor: COLORS.surfaceElevated,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.xl,
    },
    errorButtonText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },

    submitText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // ========== CHAT SELECTION MODAL STYLES ==========
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContentFixed: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        paddingBottom: 40,
        maxHeight: '70%',
        ...SHADOWS.lg,
    },
    modalAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        borderRadius: RADIUS.xl,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    modalAddBtnText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: '600',
        color: '#6366F1',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: SPACING.md,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalList: {
        marginBottom: SPACING.lg,
    },
    modalChannelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    modalChannelIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    modalChannelHash: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.tertiary,
    },
    modalChannelName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    modalChannelDesc: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // ========== NEW HUB STYLES ==========
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        marginBottom: SPACING.lg,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.md,
        gap: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: '#6366F1',
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.text.tertiary,
    },
    tabLabelActive: {
        color: '#6366F1',
    },
    tabContent: {
        flex: 1,
    },
    tabSection: {
        paddingBottom: 40,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    quickActionItem: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 3) / 4,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    quickActionIconSmall: {
        width: 50,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceElevated,
    },
    quickActionLabelSmall: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.text.secondary,
        textAlign: 'center',
    },
    seeAllText: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '600',
    },
    emptyTextInline: {
        fontSize: 13,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginVertical: SPACING.lg,
        fontStyle: 'italic',
    },
    
    // Cards
    taskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        padding: SPACING.md,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    taskIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    taskDue: {
        fontSize: 11,
        marginTop: 2,
    },

    eventCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceElevated,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.sm,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    eventColorBar: {
        width: 4,
    },
    eventContent: {
        flex: 1,
        padding: SPACING.md,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    eventTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: SPACING.sm,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text.primary,
    },
    eventTimeBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    eventTimeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6366F1',
    },
    eventFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: SPACING.md,
    },
    eventDate: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.text.secondary,
    },
    eventLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    eventLocationText: {
        fontSize: 11,
        color: COLORS.text.tertiary,
    },
});
// No content here, just removing the duplicate
