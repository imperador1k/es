/**
 * Premium Profile Screen
 * Ultra-premium design inspirado em apps de gaming/social
 */

import { supabase } from '@/lib/supabase';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Tier } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TIER CONFIG
// ============================================

const TIER_CONFIG: Record<Tier, { emoji: string; gradient: [string, string]; next: Tier | null; xpRequired: number }> = {
    Bronze: { emoji: '🥉', gradient: ['#CD7F32', '#8B4513'], next: 'Prata', xpRequired: 500 },
    Prata: { emoji: '🥈', gradient: ['#C0C0C0', '#808080'], next: 'Ouro', xpRequired: 1500 },
    Ouro: { emoji: '🥇', gradient: ['#FFD700', '#FFA500'], next: 'Platina', xpRequired: 3000 },
    Platina: { emoji: '💎', gradient: ['#E5E4E2', '#A9A9A9'], next: 'Diamante', xpRequired: 6000 },
    Diamante: { emoji: '👑', gradient: ['#B9F2FF', '#00CED1'], next: 'Elite', xpRequired: 12000 },
    Elite: { emoji: '🔥', gradient: ['#FF4500', '#8B0000'], next: null, xpRequired: 999999 },
};

// ============================================
// HELPERS
// ============================================

function getLevelInfo(xp: number) {
    const xpPerLevel = 200;
    const level = Math.floor(xp / xpPerLevel) + 1;
    const currentLevelXP = (level - 1) * xpPerLevel;
    const progress = ((xp - currentLevelXP) / xpPerLevel) * 100;
    const nextLevelXP = level * xpPerLevel;
    return { level, progress, nextLevelXP, currentLevelXP };
}

// ============================================
// ANIMATED COMPONENTS
// ============================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// STAT CARD
// ============================================

function StatCard({
    icon,
    value,
    label,
    color,
    index,
    onPress,
}: {
    icon: string;
    value: string | number;
    label: string;
    color: string;
    index: number;
    onPress?: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <AnimatedPressable
            entering={FadeInDown.delay(100 + index * 50).springify()}
            style={[styles.statCard, animatedStyle]}
            onPress={onPress}
            onPressIn={() => { scale.value = withSpring(0.95); }}
            onPressOut={() => { scale.value = withSpring(1); }}
        >
            <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </AnimatedPressable>
    );
}

// ============================================
// MENU ITEM
// ============================================

function MenuItem({
    icon,
    label,
    subtitle,
    color = COLORS.text.primary,
    onPress,
    showArrow = true,
    danger = false,
}: {
    icon: string;
    label: string;
    subtitle?: string;
    color?: string;
    onPress: () => void;
    showArrow?: boolean;
    danger?: boolean;
}) {
    return (
        <Pressable style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, { backgroundColor: danger ? '#EF444420' : `${color}15` }]}>
                <Ionicons name={icon as any} size={20} color={danger ? '#EF4444' : color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, danger && { color: '#EF4444' }]}>{label}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            {showArrow && <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />}
        </Pressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProfileScreen() {
    const { user, signOut, isLoading: authLoading } = useAuthContext();
    const { profile, loading, refetchProfile } = useProfile();
    const [deleting, setDeleting] = useState(false);
    const [frameConfig, setFrameConfig] = useState<{
        border_color: string;
        border_width: number;
        glow_color?: string;
        glow?: boolean;
        animated?: boolean;
    } | null>(null);

    // Carregar moldura equipada
    const loadEquippedFrame = useCallback(async () => {
        if (!profile?.equipped_frame) {
            setFrameConfig(null);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('shop_items')
                .select('config')
                .eq('id', profile.equipped_frame)
                .single();

            if (error) throw error;
            if (data?.config) {
                setFrameConfig(data.config);
            }
        } catch (err) {
            console.error('Erro ao carregar moldura:', err);
        }
    }, [profile?.equipped_frame]);

    useEffect(() => {
        loadEquippedFrame();
    }, [loadEquippedFrame]);

    // Handlers
    const handleSignOut = () => {
        Alert.alert('Terminar Sessão', 'Tens a certeza que queres sair?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: signOut },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Eliminar Conta',
            'Esta ação é PERMANENTE.\n\nIrá apagar todos os teus dados.',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
            ]
        );
    };

    const confirmDelete = async () => {
        if (!user?.id) return;
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('delete_user');
            if (error) throw error;
            await signOut();
        } catch (err) {
            Alert.alert('Erro', 'Não foi possível eliminar a conta.');
        } finally {
            setDeleting(false);
        }
    };

    if (loading || authLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            </View>
        );
    }

    // Profile data
    const displayName = profile?.full_name || profile?.username || 'Estudante';
    const username = profile?.username || 'user';
    const tier = (profile?.current_tier || 'Bronze') as Tier;
    const xp = profile?.current_xp || 0;
    const streak = profile?.current_streak || 0;
    const focusMinutes = profile?.focus_minutes_total || 0;
    const { level, progress, nextLevelXP } = getLevelInfo(xp);
    const tierConfig = TIER_CONFIG[tier];

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* ========== HERO HEADER ========== */}
                <View style={styles.heroContainer}>
                    <LinearGradient
                        colors={tierConfig.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    />
                    <View style={styles.heroOverlay} />

                    {/* Settings Button */}
                    <Pressable style={styles.settingsButton} onPress={() => router.push('/settings')}>
                        <BlurView intensity={40} tint="dark" style={styles.settingsBlur}>
                            <Ionicons name="settings-outline" size={22} color="#FFF" />
                        </BlurView>
                    </Pressable>

                    {/* Avatar com Moldura */}
                    <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.avatarContainer}>
                        {/* Glow Effect se moldura tiver glow */}
                        {frameConfig?.glow && (
                            <View style={[
                                styles.avatarGlow,
                                { backgroundColor: frameConfig.glow_color || 'rgba(255,215,0,0.5)' }
                            ]} />
                        )}

                        {/* Avatar */}
                        {profile?.avatar_url ? (
                            <Image
                                source={{ uri: profile.avatar_url }}
                                style={[
                                    styles.avatar,
                                    frameConfig && {
                                        borderColor: frameConfig.border_color,
                                        borderWidth: frameConfig.border_width,
                                    }
                                ]}
                            />
                        ) : (
                            <LinearGradient
                                colors={tierConfig.gradient}
                                style={[
                                    styles.avatarFallback,
                                    frameConfig && {
                                        borderColor: frameConfig.border_color,
                                        borderWidth: frameConfig.border_width,
                                    }
                                ]}
                            >
                                <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                        )}

                        {/* Tier Badge */}
                        <View style={styles.tierBadge}>
                            <Text style={styles.tierEmoji}>{tierConfig.emoji}</Text>
                        </View>

                        {/* Frame indicator se tiver moldura */}
                        {frameConfig && (
                            <View style={[styles.frameIndicator, { backgroundColor: frameConfig.border_color }]}>
                                <Text style={styles.frameIndicatorText}>🖼️</Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* Name & Username */}
                    <Text style={styles.displayName}>{displayName}</Text>
                    <Text style={styles.username}>@{username}</Text>

                    {/* Level Badge */}
                    <View style={styles.levelBadge}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.levelText}>Nível {level}</Text>
                    </View>
                </View>

                {/* ========== XP PROGRESS ========== */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.xpContainer}>
                    <View style={styles.xpHeader}>
                        <View style={styles.xpTierInfo}>
                            <Text style={styles.xpTierLabel}>{tier}</Text>
                            {tierConfig.next && (
                                <Text style={styles.xpNextTier}>→ {tierConfig.next}</Text>
                            )}
                        </View>
                        <Text style={styles.xpText}>{xp} XP</Text>
                    </View>
                    <View style={styles.xpBarContainer}>
                        <LinearGradient
                            colors={tierConfig.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.xpBarFill, { width: `${Math.min(progress, 100)}%` }]}
                        />
                    </View>
                    <Text style={styles.xpSubtext}>{nextLevelXP - xp} XP para o próximo nível</Text>
                </Animated.View>

                {/* ========== STATS GRID ========== */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="flame"
                        value={streak}
                        label="Streak"
                        color="#F59E0B"
                        index={0}
                        onPress={() => router.push('/badges')}
                    />
                    <StatCard
                        icon="time"
                        value={`${Math.floor(focusMinutes / 60)}h`}
                        label="Foco"
                        color="#10B981"
                        index={1}
                        onPress={() => router.push('/pomodoro')}
                    />
                    <StatCard
                        icon="trophy"
                        value={level}
                        label="Nível"
                        color="#6366F1"
                        index={2}
                        onPress={() => router.push('/leaderboard')}
                    />
                </View>

                {/* ========== POWER-UPS ATIVOS ========== */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
                    <View style={styles.powerupsHeader}>
                        <Text style={styles.sectionTitle}>Power-ups</Text>
                        <Pressable onPress={() => router.push('/consumables')}>
                            <Text style={styles.seeAllButton}>Ver todos →</Text>
                        </Pressable>
                    </View>
                    <View style={styles.powerupsRow}>
                        {/* Streak Freezes */}
                        <Pressable style={styles.powerupCard} onPress={() => router.push('/consumables')}>
                            <LinearGradient
                                colors={['rgba(96, 165, 250, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                                style={styles.powerupGradient}
                            >
                                <Text style={styles.powerupEmoji}>❄️</Text>
                                <Text style={styles.powerupValue}>{profile?.streak_freezes || 0}</Text>
                                <Text style={styles.powerupLabel}>Freezes</Text>
                            </LinearGradient>
                        </Pressable>

                        {/* XP Multiplier */}
                        <Pressable style={styles.powerupCard} onPress={() => router.push('/consumables')}>
                            <LinearGradient
                                colors={
                                    (profile?.xp_multiplier || 1) > 1 && profile?.xp_multiplier_expires && new Date(profile.xp_multiplier_expires) > new Date()
                                        ? ['rgba(251, 191, 36, 0.3)', 'rgba(245, 158, 11, 0.2)']
                                        : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
                                }
                                style={styles.powerupGradient}
                            >
                                <Text style={styles.powerupEmoji}>⚡</Text>
                                <Text style={[
                                    styles.powerupValue,
                                    (profile?.xp_multiplier || 1) > 1 && { color: '#FBBF24' }
                                ]}>
                                    {profile?.xp_multiplier || 1}x
                                </Text>
                                <Text style={styles.powerupLabel}>XP Boost</Text>
                            </LinearGradient>
                        </Pressable>

                        {/* Shop Button */}
                        <Pressable style={styles.powerupCard} onPress={() => router.push('/shop')}>
                            <LinearGradient
                                colors={['rgba(99, 102, 241, 0.2)', 'rgba(79, 70, 229, 0.1)']}
                                style={styles.powerupGradient}
                            >
                                <Text style={styles.powerupEmoji}>🛒</Text>
                                <Ionicons name="add-circle" size={24} color="#6366F1" />
                                <Text style={styles.powerupLabel}>Comprar</Text>
                            </LinearGradient>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* ========== QUICK ACTIONS ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Acesso Rápido</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="notifications-outline"
                            label="Atividade"
                            subtitle="Notificações e atualizações"
                            color="#F59E0B"
                            onPress={() => router.push('/(tabs)/activity')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="trophy-outline"
                            label="Conquistas"
                            subtitle="Ver badges desbloqueados"
                            color="#EF4444"
                            onPress={() => router.push('/badges')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="podium-outline"
                            label="Leaderboard"
                            subtitle="Ranking global de XP"
                            color="#6366F1"
                            onPress={() => router.push('/leaderboard')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="storefront-outline"
                            label="Loja"
                            subtitle="Molduras e power-ups"
                            color="#EC4899"
                            onPress={() => router.push('/shop')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="image-outline"
                            label="Molduras"
                            subtitle="Personalizar avatar"
                            color="#A855F7"
                            onPress={() => router.push('/frames')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="flash-outline"
                            label="Consumíveis"
                            subtitle="Power-ups e bónus"
                            color="#22C55E"
                            onPress={() => router.push('/consumables')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="people-outline"
                            label="Equipas"
                            subtitle="Gerir os teus squads"
                            color="#10B981"
                            onPress={() => router.push('/(tabs)/teams')}
                        />
                    </View>
                </View>

                {/* ========== SETTINGS ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Definições</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="person-outline"
                            label="Editar Perfil"
                            onPress={() => router.push('/settings')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="notifications-outline"
                            label="Notificações"
                            onPress={() => router.push('/settings')}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="color-palette-outline"
                            label="Aparência"
                            onPress={() => router.push('/settings')}
                        />
                    </View>
                </View>

                {/* ========== ACCOUNT ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Conta</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="log-out-outline"
                            label="Terminar Sessão"
                            onPress={handleSignOut}
                            showArrow={false}
                        />
                        <View style={styles.menuDivider} />
                        <MenuItem
                            icon="trash-outline"
                            label="Eliminar Conta"
                            onPress={handleDeleteAccount}
                            danger
                            showArrow={false}
                        />
                    </View>
                </View>

                {/* App Version */}
                <Text style={styles.version}>Escola+ v2.0.0</Text>

                <View style={{ height: 150 }} />
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Hero
    heroContainer: {
        height: 320,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: SPACING['2xl'],
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.8,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    settingsButton: {
        position: 'absolute',
        top: 50,
        right: LAYOUT.screenPadding,
        zIndex: 10,
    },
    settingsBlur: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    avatarGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 60,
        opacity: 0.6,
    },
    frameIndicator: {
        position: 'absolute',
        top: -4,
        left: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    frameIndicatorText: {
        fontSize: 12,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarFallback: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    tierBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    tierEmoji: {
        fontSize: 18,
    },
    displayName: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
        marginBottom: 4,
    },
    username: {
        fontSize: TYPOGRAPHY.size.base,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: SPACING.md,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    levelText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // XP
    xpContainer: {
        marginHorizontal: LAYOUT.screenPadding,
        marginTop: -SPACING.xl,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        ...SHADOWS.md,
    },
    xpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    xpTierInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    xpTierLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    xpNextTier: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    xpText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
    xpBarContainer: {
        height: 8,
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: 4,
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    xpSubtext: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: SPACING.sm,
        textAlign: 'center',
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: LAYOUT.screenPadding,
        gap: SPACING.md,
        marginTop: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
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

    // Sections
    section: {
        paddingHorizontal: LAYOUT.screenPadding,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },

    // Menu
    menuCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuContent: {
        flex: 1,
    },
    menuLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    menuSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    menuDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 68,
    },

    // Version
    version: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginTop: SPACING.lg,
    },

    // Power-ups
    powerupsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    seeAllButton: {
        fontSize: TYPOGRAPHY.size.sm,
        color: '#6366F1',
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    powerupsRow: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    powerupCard: {
        flex: 1,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
    },
    powerupGradient: {
        padding: SPACING.lg,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    powerupEmoji: {
        fontSize: 24,
    },
    powerupValue: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    powerupLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
    },
});
