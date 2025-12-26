/**
 * Events & Challenges Page
 * Hub Central de Live Ops e Gamificação
 */

import DailySpinWheel from '@/components/DailySpinWheel';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface Event {
    id: string;
    title: string;
    description: string | null;
    type: 'xp_boost' | 'focus_marathon' | 'team_clash' | 'login_streak' | 'special';
    start_at: string;
    end_at: string;
    config: {
        multiplier?: number;
        target_badge_id?: string;
        target_xp?: number;
    };
    banner_url: string | null;
    is_active: boolean;
}

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    unlock_condition: string;
}

// ============================================
// HELPER: Countdown Timer (using timestamp for stable dependency)
// ============================================

function useCountdown(targetTimestamp: number | null) {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

    useEffect(() => {
        if (!targetTimestamp) {
            setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
            return;
        }

        const calculate = () => {
            const now = Date.now();
            if (now >= targetTimestamp) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
                return;
            }

            const diff = targetTimestamp - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds, expired: false });
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [targetTimestamp]);

    return timeLeft;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EventsScreen() {
    const { profile } = useProfile();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const [specialBadges, setSpecialBadges] = useState<Badge[]>([]);
    const [canSpin, setCanSpin] = useState(false);
    const [spinModalVisible, setSpinModalVisible] = useState(false);
    const [currentMultiplier, setCurrentMultiplier] = useState(1.0);

    // Animations
    const boostPulse = useSharedValue(1);
    const spinGlow = useSharedValue(0);

    // ============================================
    // DATA FETCHING
    // ============================================

    const fetchData = useCallback(async () => {
        try {
            // 1. Fetch active events
            const { data: eventsData } = await supabase
                .from('events_system')
                .select('*')
                .eq('is_active', true)
                .gte('end_at', new Date().toISOString())
                .order('start_at', { ascending: true });

            setEvents(eventsData || []);

            // 2. Get current XP multiplier
            const { data: multData } = await supabase.rpc('get_current_xp_multiplier');
            setCurrentMultiplier(multData || 1.0);

            // 3. Check daily spin availability
            if (profile?.id) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('last_daily_spin')
                    .eq('id', profile.id)
                    .single();

                if (!profileData?.last_daily_spin) {
                    setCanSpin(true);
                } else {
                    const lastSpin = new Date(profileData.last_daily_spin);
                    const today = new Date();
                    setCanSpin(lastSpin.toDateString() !== today.toDateString());
                }
            }

            // 4. Fetch special badges
            const { data: badgesData } = await supabase
                .from('badges')
                .select('*')
                .eq('category', 'special')
                .limit(6);

            setSpecialBadges(badgesData || []);

        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Pulse animation for XP boost
    useEffect(() => {
        if (currentMultiplier > 1) {
            boostPulse.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1,
                true
            );
        }
    }, [currentMultiplier]);

    // Glow animation for spin
    useEffect(() => {
        if (canSpin) {
            spinGlow.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1000 }),
                    withTiming(0.3, { duration: 1000 })
                ),
                -1,
                true
            );
        }
    }, [canSpin]);

    const boostAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: boostPulse.value }],
    }));

    const spinGlowStyle = useAnimatedStyle(() => ({
        opacity: spinGlow.value,
    }));

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // ============================================
    // RENDER HELPERS
    // ============================================

    const activeXPBoost = events.find(e => e.type === 'xp_boost');
    const otherEvents = events.filter(e => e.type !== 'xp_boost');

    // Countdown for XP boost (using timestamp)
    const xpBoostEndTimestamp = useMemo(() => {
        if (!activeXPBoost) return null;
        return new Date(activeXPBoost.end_at).getTime();
    }, [activeXPBoost?.end_at]);
    const xpBoostCountdown = useCountdown(xpBoostEndTimestamp);

    // Countdown for next spin (midnight) - memoized timestamp
    const midnightTimestamp = useMemo(() => {
        if (canSpin) return null;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }, [canSpin]);
    const spinCountdown = useCountdown(midnightTimestamp);

    if (loading) {
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
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                    </Pressable>
                    <View>
                        <Text style={styles.headerTitle}>🎮 Eventos & Desafios</Text>
                        <Text style={styles.headerSubtitle}>Live Ops & Gamificação</Text>
                    </View>
                </View>

                {/* ========== XP BOOST BANNER ========== */}
                {activeXPBoost ? (
                    <Animated.View style={boostAnimatedStyle}>
                        <LinearGradient
                            colors={['#7C3AED', '#F59E0B', '#EF4444']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.xpBoostBanner}
                        >
                            <View style={styles.xpBoostContent}>
                                <Text style={styles.xpBoostEmoji}>⚡</Text>
                                <View style={styles.xpBoostText}>
                                    <Text style={styles.xpBoostTitle}>
                                        XP {activeXPBoost.config.multiplier}x ATIVO!
                                    </Text>
                                    <Text style={styles.xpBoostDescription}>
                                        {activeXPBoost.title}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.xpBoostTimer}>
                                <Ionicons name="time-outline" size={16} color="#FFF" />
                                <Text style={styles.xpBoostTimerText}>
                                    {xpBoostCountdown.expired
                                        ? 'Expirado'
                                        : `${xpBoostCountdown.hours}h ${xpBoostCountdown.minutes}m ${xpBoostCountdown.seconds}s`
                                    }
                                </Text>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                ) : (
                    <View style={styles.noEventBanner}>
                        <Ionicons name="calendar-outline" size={24} color={colors.text.tertiary} />
                        <Text style={styles.noEventText}>
                            Prepara-te para o próximo evento! 🚀
                        </Text>
                    </View>
                )}

                {/* ========== DAILY SPIN SECTION ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎰 Roda da Sorte Diária</Text>

                    <Pressable
                        style={styles.spinCard}
                        onPress={() => canSpin && setSpinModalVisible(true)}
                    >
                        {canSpin && (
                            <Animated.View style={[styles.spinGlow, spinGlowStyle]} />
                        )}

                        <LinearGradient
                            colors={canSpin ? ['#10B981', '#059669'] : ['#374151', '#1F2937']}
                            style={styles.spinCardGradient}
                        >
                            <View style={styles.spinCardContent}>
                                <Text style={styles.spinCardEmoji}>🎰</Text>
                                <View style={styles.spinCardText}>
                                    <Text style={styles.spinCardTitle}>
                                        {canSpin ? 'GIRAR AGORA (Grátis!)' : 'Volta Amanhã'}
                                    </Text>
                                    <Text style={styles.spinCardSubtitle}>
                                        {canSpin
                                            ? 'Ganha até 50 XP!'
                                            : `Próximo giro em ${spinCountdown.hours}h ${spinCountdown.minutes}m`
                                        }
                                    </Text>
                                </View>
                                {canSpin ? (
                                    <View style={styles.spinArrow}>
                                        <Ionicons name="arrow-forward" size={24} color="#FFF" />
                                    </View>
                                ) : (
                                    <View style={styles.spinLocked}>
                                        <Ionicons name="lock-closed" size={24} color={colors.text.tertiary} />
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* ========== OTHER EVENTS ========== */}
                {otherEvents.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🏆 Eventos Ativos</Text>
                        {otherEvents.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </View>
                )}

                {/* ========== LIMITED BADGES ========== */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏅 Badges Limitados</Text>
                        <View style={styles.fomoTag}>
                            <Text style={styles.fomoText}>FOMO!</Text>
                        </View>
                    </View>

                    <View style={styles.badgesGrid}>
                        {specialBadges.length > 0 ? (
                            specialBadges.map(badge => (
                                <BadgeCard key={badge.id} badge={badge} locked />
                            ))
                        ) : (
                            <View style={styles.emptyBadges}>
                                <Ionicons name="ribbon-outline" size={40} color={colors.text.tertiary} />
                                <Text style={styles.emptyBadgesText}>
                                    Badges especiais brevemente...
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ========== TEAM CHALLENGES (Placeholder) ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👥 Desafios de Equipa</Text>

                    <View style={styles.teamChallengeCard}>
                        <View style={styles.teamChallengeHeader}>
                            <Text style={styles.teamChallengeName}>🎄 Maratona de Natal</Text>
                            <Text style={styles.teamChallengeTeam}>Classe 12ºB</Text>
                        </View>
                        <View style={styles.teamChallengeProgress}>
                            <View style={styles.teamProgressBar}>
                                <View style={[styles.teamProgressFill, { width: '45%' }]} />
                            </View>
                            <Text style={styles.teamProgressText}>450 / 1000 Tarefas</Text>
                        </View>
                        <View style={styles.teamChallengeReward}>
                            <Ionicons name="gift-outline" size={16} color={colors.accent.primary} />
                            <Text style={styles.teamRewardText}>Recompensa: Badge Exclusivo + 500 XP</Text>
                        </View>
                    </View>
                </View>

                {/* Bottom Spacing */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Daily Spin Modal */}
            <DailySpinWheel
                visible={spinModalVisible}
                onClose={() => {
                    setSpinModalVisible(false);
                    fetchData(); // Refresh to update canSpin state
                }}
                onSpinComplete={() => {
                    setCanSpin(false);
                }}
            />
        </SafeAreaView>
    );
}

// ============================================
// SUB COMPONENTS
// ============================================

function EventCard({ event }: { event: Event }) {
    const endTimestamp = useMemo(() => new Date(event.end_at).getTime(), [event.end_at]);
    const countdown = useCountdown(endTimestamp);

    const getEventIcon = () => {
        switch (event.type) {
            case 'focus_marathon': return '🎯';
            case 'team_clash': return '⚔️';
            case 'login_streak': return '🔥';
            default: return '🎮';
        }
    };

    const getEventColors = (): [string, string] => {
        switch (event.type) {
            case 'focus_marathon': return ['#3B82F6', '#1D4ED8'];
            case 'team_clash': return ['#EF4444', '#B91C1C'];
            case 'login_streak': return ['#F59E0B', '#D97706'];
            default: return ['#8B5CF6', '#6D28D9'];
        }
    };

    return (
        <LinearGradient colors={getEventColors()} style={styles.eventCard}>
            <View style={styles.eventCardContent}>
                <Text style={styles.eventCardEmoji}>{getEventIcon()}</Text>
                <View style={styles.eventCardText}>
                    <Text style={styles.eventCardTitle}>{event.title}</Text>
                    <Text style={styles.eventCardDescription} numberOfLines={2}>
                        {event.description}
                    </Text>
                </View>
            </View>
            <View style={styles.eventCardTimer}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.eventCardTimerText}>
                    {countdown.expired
                        ? 'Terminado'
                        : `${countdown.hours}h ${countdown.minutes}m restantes`
                    }
                </Text>
            </View>
        </LinearGradient>
    );
}

function BadgeCard({ badge, locked }: { badge: Badge; locked?: boolean }) {
    return (
        <View style={[styles.badgeCard, locked && styles.badgeCardLocked]}>
            <View style={styles.badgeIconContainer}>
                <Text style={styles.badgeIcon}>{badge.icon || '🏅'}</Text>
                {locked && (
                    <View style={styles.badgeLockOverlay}>
                        <Ionicons name="lock-closed" size={16} color="#FFF" />
                    </View>
                )}
            </View>
            <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
            <Text style={styles.badgeCondition} numberOfLines={2}>
                {badge.unlock_condition || badge.description}
            </Text>
        </View>
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
        paddingHorizontal: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // XP Boost Banner
    xpBoostBanner: {
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadows.lg,
    },
    xpBoostContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    xpBoostEmoji: {
        fontSize: 40,
    },
    xpBoostText: {
        flex: 1,
    },
    xpBoostTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    xpBoostDescription: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    xpBoostTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    xpBoostTimerText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
    },

    // No Event Banner
    noEventBanner: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.divider,
        borderStyle: 'dashed',
    },
    noEventText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
    },

    // Sections
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    fomoTag: {
        backgroundColor: '#EF4444',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    fomoText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },

    // Spin Card
    spinCard: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        position: 'relative',
        ...shadows.md,
    },
    spinGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        backgroundColor: '#10B981',
        borderRadius: borderRadius.xl + 4,
        zIndex: -1,
    },
    spinCardGradient: {
        padding: spacing.lg,
    },
    spinCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    spinCardEmoji: {
        fontSize: 40,
    },
    spinCardText: {
        flex: 1,
    },
    spinCardTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    spinCardSubtitle: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    spinArrow: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinLocked: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Event Card
    eventCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.md,
    },
    eventCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    eventCardEmoji: {
        fontSize: 32,
    },
    eventCardText: {
        flex: 1,
    },
    eventCardTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    eventCardDescription: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    eventCardTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
    },
    eventCardTimerText: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.8)',
    },

    // Badges
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    badgeCard: {
        width: '30%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        ...shadows.sm,
    },
    badgeCardLocked: {
        opacity: 0.7,
    },
    badgeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
        position: 'relative',
    },
    badgeIcon: {
        fontSize: 24,
    },
    badgeLockOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        textAlign: 'center',
    },
    badgeCondition: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        textAlign: 'center',
        marginTop: 2,
    },
    emptyBadges: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    emptyBadgesText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.sm,
    },

    // Team Challenges
    teamChallengeCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.sm,
    },
    teamChallengeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    teamChallengeName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    teamChallengeTeam: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },
    teamChallengeProgress: {
        marginBottom: spacing.md,
    },
    teamProgressBar: {
        height: 8,
        backgroundColor: colors.divider,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    teamProgressFill: {
        height: '100%',
        backgroundColor: colors.success.primary,
        borderRadius: 4,
    },
    teamProgressText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    teamChallengeReward: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.accent.primary + '15',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
    },
    teamRewardText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },
});
