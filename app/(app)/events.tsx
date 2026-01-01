/**
 * Events & Challenges Page
 * Hub Central de Live Ops e Gamificação
 * SIMPLIFIED VERSION - Bug fixed
 */

import DailySpinWheel from '@/components/DailySpinWheel';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS as borderRadius, SHADOWS as shadows, SPACING as spacing, TYPOGRAPHY as typography } from '@/lib/theme.premium';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Compatibility layer
const colors = {
    ...COLORS,
    divider: COLORS.surfaceElevated,
    success: { primary: '#10B981' },
};

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
    };
    is_active: boolean;
}

// ============================================
// SIMPLE COUNTDOWN COMPONENT
// ============================================

function CountdownDisplay({ endTime }: { endTime: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculate = () => {
            const end = new Date(endTime).getTime();
            const now = Date.now();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Expirado');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        };

        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    return <Text style={styles.timerText}>{timeLeft}</Text>;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EventsScreen() {
    const { profile } = useProfile();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const [canSpin, setCanSpin] = useState(false);
    const [spinModalVisible, setSpinModalVisible] = useState(false);
    const [currentMultiplier, setCurrentMultiplier] = useState(1.0);

    // ============================================
    // DATA FETCHING
    // ============================================

    const fetchData = async () => {
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
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [profile?.id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // ============================================
    // RENDER HELPERS
    // ============================================

    const activeXPBoost = events.find(e => e.type === 'xp_boost');

    // Calculate time until midnight for spin
    const getTimeUntilMidnight = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.toISOString();
    };

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
                                    XP {activeXPBoost.config.multiplier || 2}x ATIVO!
                                </Text>
                                <Text style={styles.xpBoostDescription}>
                                    {activeXPBoost.title}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.xpBoostTimer}>
                            <Ionicons name="time-outline" size={16} color="#FFF" />
                            <CountdownDisplay endTime={activeXPBoost.end_at} />
                        </View>
                    </LinearGradient>
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
                        style={[styles.spinCard, canSpin && styles.spinCardActive]}
                        onPress={() => canSpin && setSpinModalVisible(true)}
                    >
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
                                        {canSpin ? 'Ganha até 50 XP!' : (
                                            <CountdownDisplay endTime={getTimeUntilMidnight()} />
                                        )}
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

                {/* ========== STUDY ROOMS (LIVE!) ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎧 Study Rooms</Text>

                    <Pressable
                        style={styles.studyRoomCard}
                        onPress={() => router.push('/(app)/study-room' as any)}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.studyRoomGradient}
                        >
                            <View style={styles.studyRoomContent}>
                                <Text style={styles.studyRoomEmoji}>🎧</Text>
                                <View style={styles.studyRoomText}>
                                    <Text style={styles.studyRoomTitle}>Entrar nas Salas</Text>
                                    <Text style={styles.studyRoomSubtitle}>
                                        Estuda com colegas em tempo real!
                                    </Text>
                                </View>
                                <View style={styles.liveBadge}>
                                    <Text style={styles.liveText}>LIVE</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* ========== AI STUDY ASSISTANT (LIVE!) ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🤖 AI Study Assistant</Text>

                    <Pressable
                        style={styles.aiTutorCard}
                        onPress={() => router.push('/(app)/ai-tutor' as any)}
                    >
                        <LinearGradient
                            colors={['#8B5CF6', '#6D28D9']}
                            style={styles.aiTutorGradient}
                        >
                            <View style={styles.aiTutorContent}>
                                <Text style={styles.aiTutorEmoji}>🤖</Text>
                                <View style={styles.aiTutorText}>
                                    <Text style={styles.aiTutorTitle}>Falar com a AI</Text>
                                    <Text style={styles.aiTutorSubtitle}>
                                        Tira dúvidas, fotos e gera imagens!
                                    </Text>
                                </View>
                                <View style={styles.aiBadge}>
                                    <Text style={styles.aiText}>GEMINI</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* ========== TEAM CHALLENGES ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👥 Desafios de Equipa</Text>

                    <View style={styles.teamChallengeCard}>
                        <View style={styles.teamChallengeHeader}>
                            <Text style={styles.teamChallengeName}>🎄 Maratona de Estudo</Text>
                            <Text style={styles.teamChallengeTeam}>Toda a Escola</Text>
                        </View>
                        <View style={styles.teamChallengeProgress}>
                            <View style={styles.teamProgressBar}>
                                <View style={[styles.teamProgressFill, { width: '45%' }]} />
                            </View>
                            <Text style={styles.teamProgressText}>450 / 1000 Horas de Foco</Text>
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
                    fetchData();
                }}
                onSpinComplete={() => {
                    setCanSpin(false);
                }}
            />
        </SafeAreaView>
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

    // Timer
    timerText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: '#FFF',
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
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Spin Card
    spinCard: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.md,
    },
    spinCardActive: {
        borderWidth: 2,
        borderColor: '#10B981',
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

    // Coming Soon Card
    comingSoonCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.sm,
    },
    comingSoonBadge: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
    },
    comingSoonText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    comingSoonTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    comingSoonDescription: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginBottom: spacing.md,
        lineHeight: 20,
    },
    comingSoonFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    featureText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
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

    // Study Room Card
    studyRoomCard: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.md,
    },
    studyRoomGradient: {
        padding: spacing.lg,
    },
    studyRoomContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    studyRoomEmoji: {
        fontSize: 40,
    },
    studyRoomText: {
        flex: 1,
    },
    studyRoomTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    studyRoomSubtitle: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.9)',
    },
    liveBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    liveText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },

    // AI Tutor Card (reusing study room styles structure)
    aiTutorCard: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.md,
    },
    aiTutorGradient: {
        padding: spacing.lg,
    },
    aiTutorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    aiTutorEmoji: {
        fontSize: 40,
    },
    aiTutorText: {
        flex: 1,
    },
    aiTutorTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    aiTutorSubtitle: {
        fontSize: typography.size.sm,
        color: 'rgba(255,255,255,0.9)',
    },
    aiBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    aiText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
});
