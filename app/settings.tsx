/**
 * Settings Screen - PRO LEVEL
 * Perfil detalhado com analíticas, gráficos, badges e definições
 * Premium design com dashboard de XP
 */

import { ActivityChart } from '@/components/analytics/ActivityChart';
import { supabase } from '@/lib/supabase';
import { borderRadius, colors, getTierStyle, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Tier } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as Application from 'expo-application';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// CONSTANTS
// ============================================

const TIER_EMOJI: Record<Tier, string> = {
    Bronze: '🥉',
    Prata: '🥈',
    Ouro: '🥇',
    Platina: '💎',
    Diamante: '👑',
    Elite: '🔥',
};

const STATUS_OPTIONS = [
    { value: 'online', label: 'Online', color: colors.success.primary, icon: 'ellipse' },
    { value: 'away', label: 'Ausente', color: colors.warning.primary, icon: 'ellipse' },
    { value: 'dnd', label: 'Não Perturbar', color: colors.danger.primary, icon: 'remove-circle' },
    { value: 'offline', label: 'Invisível', color: colors.text.tertiary, icon: 'ellipse-outline' },
] as const;

// ============================================
// HELPERS
// ============================================

function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

function getLevelFromXP(xp: number): number {
    return Math.floor(xp / 100) + 1;
}

function getXPProgress(xp: number): { current: number; needed: number; progress: number } {
    const level = getLevelFromXP(xp);
    const xpForCurrentLevel = (level - 1) * 100;
    const current = xp - xpForCurrentLevel;
    const needed = 100;
    return { current, needed, progress: (current / needed) * 100 };
}

// ============================================
// COMPONENT
// ============================================

export default function SettingsScreen() {
    const { user, signOut } = useAuthContext();
    const { profile, refetchProfile } = useProfile();

    // Edit states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Stats
    const [badgeCount, setBadgeCount] = useState(0);
    const [friendCount, setFriendCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);

    // Preferences
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [soundEffects, setSoundEffects] = useState(true);

    // Fetch additional stats
    useEffect(() => {
        if (user?.id) {
            fetchStats();
        }
    }, [user?.id]);

    const fetchStats = async () => {
        if (!user?.id) return;

        try {
            // Badge count
            const { count: badges } = await supabase
                .from('user_badges')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // Friend count
            const { count: friends } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
                .eq('status', 'accepted');

            // Completed tasks
            const { count: tasks } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_completed', true);

            setBadgeCount(badges || 0);
            setFriendCount(friends || 0);
            setTaskCount(tasks || 0);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    // ============================================
    // HANDLERS
    // ============================================

    const handlePickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permissão Necessária', 'Precisamos de acesso às fotos.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]?.base64) {
                await uploadAvatar(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        }
    };

    const uploadAvatar = async (base64: string, mimeType: string) => {
        if (!user?.id) return;

        try {
            setUploadingAvatar(true);

            const fileExt = mimeType.split('/')[1] || 'jpg';
            const fileName = `${user.id}/avatar.${fileExt}`;

            // Convert base64 to ArrayBuffer using base64-arraybuffer
            const arrayBuffer = decode(base64);

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, arrayBuffer, {
                    contentType: mimeType,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update profile with cache-busting timestamp
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: urlData.publicUrl + `?t=${Date.now()}` })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await refetchProfile();
            Alert.alert('✅', 'Foto atualizada com sucesso!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            Alert.alert('Erro', 'Não foi possível atualizar a foto. Tenta novamente.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleOpenEditModal = () => {
        setEditName(profile?.full_name || '');
        setEditUsername(profile?.username || '');
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        if (!user?.id) return;

        try {
            setSaving(true);

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editName.trim(),
                    username: editUsername.trim().toLowerCase(),
                })
                .eq('id', user.id);

            if (error) {
                if (error.code === '23505') {
                    Alert.alert('Erro', 'Este username já está em uso.');
                    return;
                }
                throw error;
            }

            await refetchProfile();
            setEditModalVisible(false);
            Alert.alert('✅', 'Perfil atualizado!');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!user?.id) return;

        try {
            await supabase
                .from('profiles')
                .update({ status })
                .eq('id', user.id);

            await refetchProfile();
            setStatusModalVisible(false);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleShareProfile = async () => {
        try {
            await Share.share({
                message: `Junta-te a mim no Escola+! 🎓\nO meu username é @${profile?.username}\n\n📱 Descarrega a app: https://escola.plus`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleSignOut = useCallback(async () => {
        Alert.alert(
            'Terminar Sessão',
            'Tens a certeza que queres sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    }, [signOut]);

    const handleDeleteAccount = () => {
        Alert.alert(
            '⚠️ Eliminar Conta',
            'Esta ação é PERMANENTE e irá apagar todos os teus dados. Tens a certeza?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sim, Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Conta', 'Contacta o suporte para eliminar a conta.');
                    },
                },
            ]
        );
    };

    // ============================================
    // RENDER
    // ============================================

    const tierStyle = getTierStyle(profile?.current_tier || 'Bronze');
    const level = getLevelFromXP(profile?.current_xp || 0);
    const xpProgress = getXPProgress(profile?.current_xp || 0);
    const currentStatus = STATUS_OPTIONS.find(s => s.value === profile?.status) || STATUS_OPTIONS[0];
    const appVersion = Application.nativeApplicationVersion || '1.0.0';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.headerTitle}>Perfil & Definições</Text>
                <Pressable onPress={handleShareProfile} style={styles.shareButton}>
                    <Ionicons name="share-outline" size={22} color={colors.text.primary} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ====== HERO SECTION ====== */}
                <LinearGradient
                    colors={[tierStyle.bg, colors.background]}
                    style={styles.heroSection}
                >
                    {/* Avatar */}
                    <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarInitial}>
                                    {profile?.username?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.avatarEditBadge}>
                            {uploadingAvatar ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons name="camera" size={16} color="#FFF" />
                            )}
                        </View>
                    </Pressable>

                    {/* Name & Username */}
                    <Pressable onPress={handleOpenEditModal} style={styles.nameContainer}>
                        <Text style={styles.fullName}>
                            {profile?.full_name || 'Sem nome'}
                        </Text>
                        <View style={styles.usernameRow}>
                            <Text style={styles.username}>@{profile?.username || 'username'}</Text>
                            <Ionicons name="pencil" size={14} color={colors.text.tertiary} />
                        </View>
                    </Pressable>

                    {/* Status */}
                    <Pressable
                        onPress={() => setStatusModalVisible(true)}
                        style={styles.statusBadge}
                    >
                        <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
                        <Text style={styles.statusText}>{currentStatus.label}</Text>
                        <Ionicons name="chevron-down" size={14} color={colors.text.secondary} />
                    </Pressable>

                    {/* Tier & Level */}
                    <View style={styles.tierLevelRow}>
                        <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
                            <Text style={styles.tierEmoji}>{TIER_EMOJI[profile?.current_tier || 'Bronze']}</Text>
                            <Text style={[styles.tierText, { color: tierStyle.text }]}>
                                {profile?.current_tier || 'Bronze'}
                            </Text>
                        </View>
                        <View style={styles.levelBadge}>
                            <Ionicons name="star" size={14} color={colors.accent.primary} />
                            <Text style={styles.levelText}>Nível {level}</Text>
                        </View>
                    </View>

                    {/* XP Progress */}
                    <View style={styles.xpProgressContainer}>
                        <View style={styles.xpProgressHeader}>
                            <Text style={styles.xpLabel}>{xpProgress.current} / {xpProgress.needed} XP</Text>
                            <Text style={styles.xpTotal}>{profile?.current_xp || 0} total</Text>
                        </View>
                        <View style={styles.xpProgressBar}>
                            <View style={[styles.xpProgressFill, { width: `${xpProgress.progress}%` }]} />
                        </View>
                    </View>
                </LinearGradient>

                {/* ====== QUICK STATS ====== */}
                <View style={styles.quickStatsRow}>
                    <Pressable style={styles.quickStat} onPress={() => router.push('/badges' as any)}>
                        <Text style={styles.quickStatValue}>{badgeCount}</Text>
                        <Text style={styles.quickStatLabel}>Badges</Text>
                    </Pressable>
                    <View style={styles.quickStatDivider} />
                    <Pressable style={styles.quickStat} onPress={() => router.push('/friends' as any)}>
                        <Text style={styles.quickStatValue}>{friendCount}</Text>
                        <Text style={styles.quickStatLabel}>Amigos</Text>
                    </Pressable>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>{taskCount}</Text>
                        <Text style={styles.quickStatLabel}>Tarefas</Text>
                    </View>
                </View>

                {/* ====== ANALYTICS DASHBOARD ====== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Analíticas</Text>
                    <ActivityChart height={160} />

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.accent.light }]}>
                            <Ionicons name="time-outline" size={24} color={colors.accent.primary} />
                            <Text style={[styles.statCardValue, { color: colors.accent.primary }]}>
                                {formatMinutes(profile?.focus_minutes_total || 0)}
                            </Text>
                            <Text style={styles.statCardLabel}>Tempo de Foco</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.warning.light }]}>
                            <Ionicons name="flame-outline" size={24} color={colors.warning.primary} />
                            <Text style={[styles.statCardValue, { color: colors.warning.primary }]}>
                                {profile?.current_streak || 0}
                            </Text>
                            <Text style={styles.statCardLabel}>Streak Atual</Text>
                        </View>
                    </View>
                </View>

                {/* ====== QUICK ACTIONS ====== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚡ Ações Rápidas</Text>
                    <View style={styles.actionsGrid}>
                        <Pressable
                            style={styles.actionCard}
                            onPress={() => router.push('/pomodoro' as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: colors.danger.light }]}>
                                <Ionicons name="timer-outline" size={22} color={colors.danger.primary} />
                            </View>
                            <Text style={styles.actionLabel}>Pomodoro</Text>
                        </Pressable>
                        <Pressable
                            style={styles.actionCard}
                            onPress={() => router.push('/badges' as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: colors.warning.light }]}>
                                <Ionicons name="medal-outline" size={22} color={colors.warning.primary} />
                            </View>
                            <Text style={styles.actionLabel}>Badges</Text>
                        </Pressable>
                        <Pressable
                            style={styles.actionCard}
                            onPress={() => router.push('/shop' as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: colors.success.light }]}>
                                <Ionicons name="bag-outline" size={22} color={colors.success.primary} />
                            </View>
                            <Text style={styles.actionLabel}>Loja</Text>
                        </Pressable>
                        <Pressable
                            style={styles.actionCard}
                            onPress={() => router.push('/friends' as any)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: colors.accent.light }]}>
                                <Ionicons name="people-outline" size={22} color={colors.accent.primary} />
                            </View>
                            <Text style={styles.actionLabel}>Amigos</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ====== PREFERENCES ====== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚙️ Preferências</Text>

                    <View style={styles.preferencesCard}>
                        <View style={styles.preferenceItem}>
                            <View style={styles.preferenceLeft}>
                                <Ionicons name="moon-outline" size={22} color={colors.text.secondary} />
                                <Text style={styles.preferenceLabel}>Modo Escuro</Text>
                            </View>
                            <Switch
                                value={darkMode}
                                onValueChange={setDarkMode}
                                trackColor={{ false: colors.divider, true: colors.accent.primary }}
                                thumbColor="#FFF"
                            />
                        </View>

                        <View style={styles.preferenceDivider} />

                        <View style={styles.preferenceItem}>
                            <View style={styles.preferenceLeft}>
                                <Ionicons name="notifications-outline" size={22} color={colors.text.secondary} />
                                <Text style={styles.preferenceLabel}>Notificações</Text>
                            </View>
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: colors.divider, true: colors.accent.primary }}
                                thumbColor="#FFF"
                            />
                        </View>

                        <View style={styles.preferenceDivider} />

                        <View style={styles.preferenceItem}>
                            <View style={styles.preferenceLeft}>
                                <Ionicons name="volume-high-outline" size={22} color={colors.text.secondary} />
                                <Text style={styles.preferenceLabel}>Efeitos Sonoros</Text>
                            </View>
                            <Switch
                                value={soundEffects}
                                onValueChange={setSoundEffects}
                                trackColor={{ false: colors.divider, true: colors.accent.primary }}
                                thumbColor="#FFF"
                            />
                        </View>
                    </View>
                </View>

                {/* ====== SUPPORT ====== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💬 Suporte</Text>

                    <View style={styles.menuCard}>
                        <Pressable
                            style={styles.menuItem}
                            onPress={() => Linking.openURL('mailto:suporte@escola.plus')}
                        >
                            <Ionicons name="mail-outline" size={22} color={colors.text.secondary} />
                            <Text style={styles.menuLabel}>Contactar Suporte</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                        </Pressable>
                        <View style={styles.menuDivider} />
                        <Pressable
                            style={styles.menuItem}
                            onPress={() => Linking.openURL('https://escola.plus/faq')}
                        >
                            <Ionicons name="help-circle-outline" size={22} color={colors.text.secondary} />
                            <Text style={styles.menuLabel}>FAQ</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                        </Pressable>
                        <View style={styles.menuDivider} />
                        <Pressable
                            style={styles.menuItem}
                            onPress={() => Linking.openURL('https://escola.plus/privacidade')}
                        >
                            <Ionicons name="shield-checkmark-outline" size={22} color={colors.text.secondary} />
                            <Text style={styles.menuLabel}>Política de Privacidade</Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                        </Pressable>
                    </View>
                </View>

                {/* ====== ACCOUNT ====== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔐 Conta</Text>

                    <Pressable style={styles.signOutButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={22} color={colors.danger.primary} />
                        <Text style={styles.signOutText}>Terminar Sessão</Text>
                    </Pressable>

                    <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
                        <Text style={styles.deleteText}>Eliminar Conta</Text>
                    </Pressable>
                </View>

                {/* Version & User ID */}
                <View style={styles.footer}>
                    <Text style={styles.versionText}>Escola+ v{appVersion}</Text>
                    <Text style={styles.userIdText}>ID: {user?.id?.slice(0, 8)}...</Text>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>

            {/* ====== EDIT PROFILE MODAL ====== */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setEditModalVisible(false)}>
                            <Text style={styles.modalCancel}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>Editar Perfil</Text>
                        <Pressable onPress={handleSaveProfile} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.accent.primary} />
                            ) : (
                                <Text style={styles.modalSave}>Guardar</Text>
                            )}
                        </Pressable>
                    </View>

                    <View style={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nome Completo</Text>
                            <TextInput
                                style={styles.input}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="O teu nome"
                                placeholderTextColor={colors.text.tertiary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <TextInput
                                style={styles.input}
                                value={editUsername}
                                onChangeText={setEditUsername}
                                placeholder="username"
                                placeholderTextColor={colors.text.tertiary}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* ====== STATUS MODAL ====== */}
            <Modal
                visible={statusModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setStatusModalVisible(false)}
            >
                <Pressable
                    style={styles.statusModalOverlay}
                    onPress={() => setStatusModalVisible(false)}
                >
                    <View style={styles.statusModalContent}>
                        <Text style={styles.statusModalTitle}>Estado</Text>
                        {STATUS_OPTIONS.map((option) => (
                            <Pressable
                                key={option.value}
                                style={[
                                    styles.statusOption,
                                    profile?.status === option.value && styles.statusOptionActive,
                                ]}
                                onPress={() => handleUpdateStatus(option.value)}
                            >
                                <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                                <Text style={styles.statusOptionText}>{option.label}</Text>
                                {profile?.status === option.value && (
                                    <Ionicons name="checkmark" size={20} color={colors.accent.primary} />
                                )}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    shareButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },

    // Hero Section
    heroSection: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: colors.surface,
    },
    avatarPlaceholder: {
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 44,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: colors.surface,
    },
    nameContainer: {
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    fullName: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: 2,
    },
    username: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surface,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        marginTop: spacing.sm,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    tierLevelRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
    },
    tierEmoji: {
        fontSize: 16,
    },
    tierText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.accent.light,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
    },
    levelText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    xpProgressContainer: {
        width: '100%',
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    xpProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    xpLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    xpTotal: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    xpProgressBar: {
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    xpProgressFill: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: 3,
    },

    // Quick Stats
    quickStatsRow: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        marginTop: -spacing.lg,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.lg,
        ...shadows.md,
    },
    quickStat: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    quickStatLabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    quickStatDivider: {
        width: 1,
        backgroundColor: colors.divider,
    },

    // Sections
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    statCard: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
    },
    statCardValue: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    statCardLabel: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },

    // Actions Grid
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    actionCard: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.sm,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },

    // Preferences
    preferencesCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    preferenceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    preferenceLabel: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    preferenceDivider: {
        height: 1,
        backgroundColor: colors.divider,
        marginLeft: spacing.md + 22 + spacing.md,
    },

    // Menu Card
    menuCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
    },
    menuLabel: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    menuDivider: {
        height: 1,
        backgroundColor: colors.divider,
        marginLeft: spacing.md + 22 + spacing.md,
    },

    // Buttons
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.danger.light,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    signOutText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.danger.primary,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
    },
    deleteText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Footer
    footer: {
        alignItems: 'center',
        marginTop: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    versionText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    userIdText: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },

    // Edit Modal
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    modalCancel: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    modalSave: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
    modalContent: {
        padding: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },

    // Status Modal
    statusModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusModalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        width: '80%',
        maxWidth: 300,
    },
    statusModalTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
    },
    statusOptionActive: {
        backgroundColor: colors.accent.light,
    },
    statusOptionText: {
        flex: 1,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
});
