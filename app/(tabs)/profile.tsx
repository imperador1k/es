import { supabase } from '@/lib/supabase';
import { borderRadius, colors, getTierStyle, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Tier } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tier emoji mapping
const TIER_EMOJI: Record<Tier, string> = {
    Bronze: '🥉',
    Prata: '🥈',
    Ouro: '🥇',
    Platina: '💎',
    Diamante: '👑',
    Elite: '🔥',
};

// Level calculation
function getLevelInfo(xp: number) {
    const xpPerLevel = 200;
    const level = Math.floor(xp / xpPerLevel) + 1;
    const currentLevelXP = (level - 1) * xpPerLevel;
    const progress = ((xp - currentLevelXP) / xpPerLevel) * 100;
    const remaining = xpPerLevel - (xp - currentLevelXP);
    return { level, progress, remaining };
}

export default function ProfileScreen() {
    const { user, signOut, isLoading: authLoading } = useAuthContext();
    const { profile, loading, refetchProfile } = useProfile();

    const [deleting, setDeleting] = useState(false);

    const handleSignOut = () => {
        Alert.alert(
            'Terminar Sessão',
            'Tens a certeza que queres sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: signOut },
            ]
        );
    };

    // Eliminar conta (DANGER)
    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Eliminar Conta',
            'Esta ação é PERMANENTE e irá apagar todos os teus dados, incluindo:\n\n• Perfil e avatar\n• Mensagens\n• Tarefas\n• Amizades\n• XP e badges\n\nTens a certeza ABSOLUTA?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sim, Eliminar',
                    style: 'destructive',
                    onPress: () => confirmDeleteAccount(),
                },
            ]
        );
    };

    const confirmDeleteAccount = () => {
        Alert.prompt(
            'Confirmação Final',
            'Escreve "CONFIRMAR" para confirmar:',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    style: 'destructive',
                    onPress: async (text: string | undefined) => {
                        if (text?.toUpperCase() === 'CONFIRMAR') {
                            await executeDelete();
                        } else {
                            Alert.alert('Erro', 'Texto incorreto. A conta não foi eliminada.');
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    const executeDelete = async () => {
        if (!user?.id) return;

        setDeleting(true);
        try {
            // Usar a função RPC que já existe no Supabase
            // Esta função apaga o auth.users e o CASCADE apaga o resto
            const { error } = await supabase.rpc('delete_user');

            if (error) throw error;

            // Fazer signOut para limpar a sessão local
            await signOut();

            Alert.alert('Conta Eliminada', 'A tua conta foi eliminada com sucesso.');
        } catch (err: any) {
            console.error('Erro ao eliminar conta:', err);
            Alert.alert('Erro', 'Não foi possível eliminar a conta. Tenta novamente.');
        } finally {
            setDeleting(false);
        }
    };

    if (loading || authLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // Profile data
    const displayName = profile?.full_name || profile?.username || 'Estudante';
    const email = user?.email || '';
    const tier = profile?.current_tier || 'Bronze';
    const xp = profile?.current_xp || 0;
    const { level, progress, remaining } = getLevelInfo(xp);
    const tierStyle = getTierStyle(tier.toLowerCase());
    const tierEmoji = TIER_EMOJI[tier];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Text style={styles.pageTitle}>Perfil</Text>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarWrapper}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: tierStyle.bg }]}>
                                    <Text style={[styles.avatarInitial, { color: tierStyle.text }]}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.tierIndicator, { backgroundColor: tierStyle.accent }]} />
                        </View>

                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{displayName}</Text>
                            <Text style={styles.profileEmail}>{email}</Text>
                            <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                                <Text style={styles.tierEmoji}>{tierEmoji}</Text>
                                <Text style={[styles.tierText, { color: tierStyle.text }]}>{tier}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Level Progress Card */}
                <View style={styles.levelCard}>
                    <View style={styles.levelHeader}>
                        <View>
                            <Text style={styles.levelTitle}>Nível {level}</Text>
                            <Text style={styles.levelSubtitle}>{remaining} XP para o próximo</Text>
                        </View>
                        <View style={styles.xpBadge}>
                            <Ionicons name="flash" size={14} color={colors.accent.primary} />
                            <Text style={styles.xpValue}>{xp.toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Pressable
                        style={styles.shopButton}
                        onPress={() => router.push('/shop' as any)}
                    >
                        <Ionicons name="bag" size={18} color={colors.accent.primary} />
                        <Text style={styles.shopButtonText}>Loja de Recompensas</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                    </Pressable>
                </View>

                {/* Stats Grid */}
                <Text style={styles.sectionTitle}>Estatísticas</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBg, { backgroundColor: `${colors.accent.primary}15` }]}>
                            <Ionicons name="flash" size={22} color={colors.accent.primary} />
                        </View>
                        <Text style={styles.statValue}>{xp.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>XP Total</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBg, { backgroundColor: `${colors.success.primary}15` }]}>
                            <Ionicons name="trophy" size={22} color={colors.success.primary} />
                        </View>
                        <Text style={styles.statValue}>{level}</Text>
                        <Text style={styles.statLabel}>Nível</Text>
                    </View>
                    <Pressable style={styles.statBox} onPress={() => router.push('/badges' as any)}>
                        <View style={[styles.statIconBg, { backgroundColor: `${colors.warning.primary}15` }]}>
                            <Ionicons name="medal" size={22} color={colors.warning.primary} />
                        </View>
                        <Text style={styles.statValue}>🏅</Text>
                        <Text style={styles.statLabel}>Conquistas</Text>
                    </Pressable>
                </View>

                {/* Settings Menu */}
                <Text style={styles.sectionTitle}>Definições</Text>
                <View style={styles.menuCard}>
                    <MenuItem icon="analytics-outline" label="Perfil e Analíticas" onPress={() => router.push('/settings')} />
                    <MenuItem icon="notifications-outline" label="Notificações" onPress={() => { }} />
                    <MenuItem icon="shield-outline" label="Privacidade" onPress={() => { }} />
                    <MenuItem icon="help-circle-outline" label="Ajuda" onPress={() => { }} last />
                </View>

                {/* Logout */}
                <Pressable style={styles.logoutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={18} color={colors.danger.primary} />
                    <Text style={styles.logoutText}>Terminar Sessão</Text>
                </Pressable>

                {/* Delete Account - DANGER ZONE */}
                <View style={styles.dangerZone}>
                    <Text style={styles.dangerTitle}>Zona Perigosa</Text>
                    <Text style={styles.dangerSubtitle}>
                        Esta ação é irreversível e apagará todos os teus dados.
                    </Text>
                    <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={18} color={colors.text.inverse} />
                        <Text style={styles.deleteButtonText}>Eliminar Conta</Text>
                    </Pressable>
                </View>

                {/* Version */}
                <Text style={styles.version}>Escola+ v0.1.0</Text>

                <View style={{ height: 120 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function MenuItem({
    icon,
    label,
    onPress,
    last = false
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    last?: boolean;
}) {
    return (
        <Pressable style={[styles.menuItem, !last && styles.menuItemBorder]} onPress={onPress}>
            <View style={styles.menuIconBg}>
                <Ionicons name={icon} size={18} color={colors.text.secondary} />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </Pressable>
    );
}

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

    // Page Title
    pageTitle: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginTop: spacing.lg,
        marginBottom: spacing['2xl'],
    },

    // Profile Card
    profileCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        ...shadows.md,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: spacing.lg,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    avatarFallback: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    tierIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.surface,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    profileEmail: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    tierEmoji: {
        fontSize: 12,
    },
    tierText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },

    // Level Card
    levelCard: {
        backgroundColor: colors.text.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing['2xl'],
        ...shadows.lg,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    levelTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.bold,
        color: colors.text.inverse,
    },
    levelSubtitle: {
        fontSize: typography.size.xs,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    xpValue: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.text.inverse,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: 3,
    },

    // Section
    sectionTitle: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing['2xl'],
    },
    statBox: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.sm,
    },
    statIconBg: {
        width: 44,
        height: 44,
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

    // Menu
    menuCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        marginBottom: spacing['2xl'],
        ...shadows.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    menuIconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    menuLabel: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.danger.light,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    logoutText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.danger.primary,
    },

    // Danger Zone
    dangerZone: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.danger.primary,
    },
    dangerTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.danger.primary,
        marginBottom: spacing.xs,
    },
    dangerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginBottom: spacing.lg,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.danger.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    deleteButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Version
    version: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        textAlign: 'center',
    },

    // Shop Button
    shopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent.subtle,
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
    },
    shopButtonText: {
        flex: 1,
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
    },
});
