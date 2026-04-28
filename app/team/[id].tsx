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
import { Channel } from '@/types/database.types';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_BUTTON_SIZE = (SCREEN_WIDTH - SPACING.xl * 2 - SPACING.md * 2) / 3;

// ============================================
// MAIN COMPONENT
// ============================================

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

    const canCreateTask = canUser(userRole, 'CREATE_TASK');

    // Load data
    const loadData = useCallback(async () => {
        if (!id || !user?.id) return;

        try {
            const [channelsRes, membersRes] = await Promise.all([
                supabase
                    .from('channels')
                    .select('*')
                    .eq('team_id', id)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('team_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', id)
            ]);

            setChannels((channelsRes.data as Channel[]) || []);
            setMemberCount(membersRes.count || 0);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
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

                    {/* Quick Actions - Horizontal Scroll */}
                    <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickActionsScroll}
                    >
                        <QuickActionCard
                            icon="chatbubbles"
                            label="Chat"
                            color="#10B981"
                            onPress={handleChatPress}
                        />
                        <QuickActionCard
                            icon="checkbox"
                            label="Tarefas"
                            color="#F59E0B"
                            onPress={() => router.push(`/team/${id}/tasks` as any)}
                        />
                        <QuickActionCard
                            icon="folder"
                            label="Ficheiros"
                            color="#6366F1"
                            onPress={() => router.push(`/team/${id}/files` as any)}
                        />
                        <QuickActionCard
                            icon="people"
                            label="Membros"
                            color="#EC4899"
                            onPress={() => router.push(`/team/members?teamId=${id}` as any)}
                        />
                        <QuickActionCard
                            icon="trophy"
                            label="Ranking"
                            color="#FFD700"
                            onPress={() => router.push(`/team/${id}/leaderboard` as any)}
                        />
                        {canCreateTask && (
                            <QuickActionCard
                                icon="add-circle"
                                label="+ Tarefa"
                                color="#8B5CF6"
                                onPress={() => router.push(`/team/${id}/tasks/new` as any)}
                            />
                        )}
                    </ScrollView>

                    {/* Channels Section */}
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Canais</Text>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>{channels.length}</Text>
                        </View>
                    </View>

                    {channels.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="chatbubbles-outline" size={40} color={COLORS.text.tertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>Sem canais</Text>
                            <Text style={styles.emptySubtitle}>Esta squad ainda não tem canais</Text>
                        </View>
                    ) : (
                        channels.map((channel) => (
                            <ChannelCard key={channel.id} channel={channel} teamId={id} />
                        ))
                    )}
                </ScrollView>

                {/* Channels Selection Modal */}
                <Modal
                    visible={chatModalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setChatModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setChatModalVisible(false)}>
                            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                        </Pressable>
                        
                        <View style={styles.modalContentFixed}>
                            <View style={styles.modalHandle} />
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Escolher Canal</Text>
                                <Pressable style={styles.modalCloseBtn} onPress={() => setChatModalVisible(false)}>
                                    <Ionicons name="close" size={20} color={COLORS.text.primary} />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                                {channels.map((channel) => (
                                    <Pressable
                                        key={channel.id}
                                        style={styles.modalChannelItem}
                                        onPress={() => {
                                            setChatModalVisible(false);
                                            router.push(`/team/${id}/channel/${channel.id}` as any);
                                        }}
                                    >
                                        <View style={styles.modalChannelIcon}>
                                            <Text style={styles.modalChannelHash}>#</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalChannelName}>{channel.name}</Text>
                                            {channel.description && (
                                                <Text style={styles.modalChannelDesc} numberOfLines={1}>{channel.description}</Text>
                                            )}
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
                                    </Pressable>
                                ))}
                            </ScrollView>

                            {(userRole === 'owner' || userRole === 'admin') && (
                                <Pressable 
                                    style={styles.modalAddBtn}
                                    onPress={() => {
                                        setChatModalVisible(false);
                                        router.push(`/team/${id}/channels` as any);
                                    }}
                                >
                                    <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
                                    <Text style={styles.modalAddBtnText}>Gerir Canais</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </Modal>
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
});
