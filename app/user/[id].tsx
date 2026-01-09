
/**
 * User Profile Detail Screen - Premium Dark Design
 * Ecrã para ver detalhes de perfil de outro utilizador
 * Inclui badges reais, stats e ações sociais
 */

import { BadgeDetail, DisplayBadge } from '@/components/BadgeDetail';
import { CachedAvatar } from '@/components/CachedImage';

import { useStartConversation } from '@/hooks/useDMs';
import { getUserEducation } from '@/hooks/useEducation';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { getUserBadges, UserBadge } from '@/services/badgeService';
import { blockUser, reportUser } from '@/services/userService';
import { Profile, Tier } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// CONSTANTS
// ============================================

const TIER_CONFIG: Record<Tier, { emoji: string; gradient: [string, string]; text: string }> = {
    Bronze: { emoji: '🥉', gradient: ['#CD7F32', '#8B4513'], text: '#CD7F32' },
    Prata: { emoji: '🥈', gradient: ['#C0C0C0', '#808080'], text: '#C0C0C0' },
    Ouro: { emoji: '🥇', gradient: ['#FFD700', '#FFA500'], text: '#F59E0B' },
    Platina: { emoji: '💎', gradient: ['#E5E4E2', '#A8A9AD'], text: '#94A3B8' },
    Diamante: { emoji: '👑', gradient: ['#60A5FA', '#3B82F6'], text: '#3B82F6' },
    Elite: { emoji: '🔥', gradient: ['#A855F7', '#7C3AED'], text: '#7C3AED' },
};

// ============================================
// COMPONENT
// ============================================

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user: currentUser } = useAuthContext();

    const { friends, sendFriendRequest, pendingRequests } = useFriends();
    const { startOrGetConversation } = useStartConversation();
    const { showAlert } = useAlert();

    // State
    const [profile, setProfile] = useState<Profile | null>(null);
    const [badges, setBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [equippedBadges, setEquippedBadges] = useState<UserBadge[]>([]);
    const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null);
    const modalScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (selectedBadge) {
            Animated.spring(modalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
        } else {
            modalScale.setValue(0);
        }
    }, [selectedBadge]);
    const [educationData, setEducationData] = useState<{
        level: string;
        year?: number;
        school?: { name: string; district?: string } | null;
        university?: { name: string; type?: string } | null;
        degree?: { name: string; level?: string } | null;
    } | null>(null);

    // Block/Report State
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const [blocking, setBlocking] = useState(false);

    // Verificar relação
    const isFriend = friends.some(f => f.friend_id === id);
    const hasPending = pendingRequests.some(p => p.friend_id === id);
    const isMe = id === currentUser?.id;

    // Carregar dados
    useEffect(() => {
        async function loadData() {
            if (!id) return;
            try {
                setLoading(true);

                // Carregar perfil
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setProfile(data as Profile);

                // Carregar education
                try {
                    const edu = await getUserEducation(id);
                    if (edu) {
                        setEducationData({
                            level: edu.level,
                            year: edu.year || edu.uni_year,
                            school: edu.school,
                            university: edu.university,
                            degree: edu.degree,
                        });
                    }
                } catch (e) {
                    console.log('User has no education data');
                }

                // Carregar badges e filtrar equipados
                const userBadges = await getUserBadges(id);
                setBadges(userBadges);
                setEquippedBadges(userBadges.filter(b => b.is_equipped));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    // Handlers
    const handleAddFriend = async () => {
        if (!id) return;
        setSending(true);
        const success = await sendFriendRequest(id);
        setSending(false);
        if (success) {
            showAlert({ title: '✅ Pedido Enviado!', message: 'O teu pedido de amizade foi enviado.' });
        }
    };

    const handleMessage = async () => {
        if (!id) return;
        const convId = await startOrGetConversation(id);
        if (convId) {
            router.push(`/ dm / ${convId} ` as any);
        }
    };

    const handleBlock = () => {
        setOptionsVisible(false);
        // Small timeout to allow sheet to close smoothly before opening alert/modal
        setTimeout(() => setBlockModalVisible(true), 100);
    };

    const confirmBlock = async () => {
        try {
            setBlocking(true);
            if (!id) return;
            await blockUser(id);
            setBlockModalVisible(false);
            showAlert({ title: 'Bloqueado', message: 'Utilizador bloqueado.' });
            router.replace('/' as any);
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Erro', message: 'Não foi possível bloquear.' });
        } finally {
            setBlocking(false);
        }
    };

    const handleReport = async () => {
        if (!reportReason.trim()) {
            showAlert({ title: 'Erro', message: 'Por favor indica um motivo.' });
            return;
        }
        try {
            setReporting(true);
            if (!id) return;

            // 1. Record in DB
            await reportUser(id, reportReason);

            // 2. Alert Admin (Edge Function)
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.functions.invoke('send-report-alert', {
                body: {
                    reporter_email: user?.email || 'unknown',
                    reported_id: id,
                    reported_name: profile?.full_name || profile?.username || 'Unknown',
                    reason: reportReason
                }
            });

            setReportModalVisible(false);
            setReportReason('');
            showAlert({ title: 'Obrigado', message: 'Reportado com sucesso. Vamos analisar.' });
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Erro', message: 'Não foi possível reportar.' });
        } finally {
            setReporting(false);
        }
    };

    // Loading
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // Error
    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="person-outline" size={64} color={COLORS.text.tertiary} />
                    <Text style={styles.errorText}>Utilizador não encontrado</Text>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Voltar</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // Computed
    const tier = (profile.current_tier || 'Bronze') as Tier;
    const tierConfig = TIER_CONFIG[tier];
    const level = Math.floor((profile.current_xp || 0) / 200) + 1;
    const xpProgress = ((profile.current_xp || 0) % 200) / 200;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with Gradient */}
            <LinearGradient
                colors={tierConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Perfil</Text>
                {!isMe && (
                    <Pressable style={styles.backButton} onPress={() => setOptionsVisible(true)}>
                        <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
                    </Pressable>
                )}
                {isMe && <View style={{ width: 40 }} />}
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Hero Card */}
                <View style={styles.heroCard}>
                    {/* Avatar with Tier Ring */}
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={tierConfig.gradient}
                            style={styles.avatarRing}
                        >
                            {profile.avatar_url ? (
                                <CachedAvatar uri={profile.avatar_url} size={102} style={{ borderWidth: 3, borderColor: COLORS.background }} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarInitial}>
                                        {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                        {/* Level Badge */}
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelText}>{level}</Text>
                        </View>
                    </View>

                    {/* Education Badges - COPIED FROM PROFILE.TSX */}
                    {educationData && (
                        <View style={styles.educationBadges}>
                            {/* School/University Badge */}
                            {(educationData.school || educationData.university) && (
                                <View style={styles.educationBadge}>
                                    <LinearGradient
                                        colors={educationData.university ? ['#6366F1', '#8B5CF6'] : ['#10B981', '#059669']}
                                        style={styles.educationBadgeGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Ionicons
                                            name={educationData.university ? "school" : "business"}
                                            size={12}
                                            color="#FFF"
                                        />
                                        <Text style={styles.educationBadgeText} numberOfLines={1}>
                                            {educationData.university?.name || educationData.school?.name}
                                        </Text>
                                    </LinearGradient>
                                </View>
                            )}

                            {/* Degree/Year Badge */}
                            {(educationData.degree || educationData.year) && (
                                <View style={styles.educationBadge}>
                                    <LinearGradient
                                        colors={['#F59E0B', '#D97706']}
                                        style={styles.educationBadgeGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Ionicons name="ribbon" size={12} color="#FFF" />
                                        <Text style={styles.educationBadgeText} numberOfLines={1}>
                                            {educationData.degree?.name || `${educationData.year}º Ano`}
                                        </Text>
                                    </LinearGradient>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Name & Username */}
                    <Text style={styles.name}>{profile.full_name || profile.username}</Text>
                    <Text style={styles.username}>@{profile.username || 'utilizador'}</Text>

                    {/* Tier Badge */}
                    <LinearGradient
                        colors={tierConfig.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.tierBadge}
                    >
                        <Text style={styles.tierEmoji}>{tierConfig.emoji}</Text>
                        <Text style={styles.tierText}>{tier}</Text>
                    </LinearGradient>

                    {/* XP Progress */}
                    <View style={styles.xpContainer}>
                        <View style={styles.xpBar}>
                            <LinearGradient
                                colors={tierConfig.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.xpFill, { width: `${xpProgress * 100}%` }]}
                            />
                        </View>
                        <Text style={styles.xpText}>
                            {(profile.current_xp || 0) % 200} / 200 XP
                        </Text>
                    </View>

                    {/* Actions */}
                    {!isMe && (
                        <View style={styles.actions}>
                            {isFriend ? (
                                <Pressable style={styles.messageBtn} onPress={handleMessage}>
                                    <LinearGradient
                                        colors={[COLORS.accent.primary, COLORS.accent.dark]}
                                        style={styles.actionGradient}
                                    >
                                        <Ionicons name="chatbubble" size={18} color="#FFF" />
                                        <Text style={styles.actionBtnText}>Mensagem</Text>
                                    </LinearGradient>
                                </Pressable>
                            ) : hasPending ? (
                                <View style={styles.pendingBtn}>
                                    <Ionicons name="time-outline" size={18} color={COLORS.text.secondary} />
                                    <Text style={styles.pendingBtnText}>Pedido Pendente</Text>
                                </View>
                            ) : (
                                <Pressable
                                    style={[styles.addBtn, sending && styles.addBtnDisabled]}
                                    onPress={handleAddFriend}
                                    disabled={sending}
                                >
                                    <LinearGradient
                                        colors={['#10B981', '#059669']}
                                        style={styles.actionGradient}
                                    >
                                        {sending ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="person-add" size={18} color="#FFF" />
                                                <Text style={styles.actionBtnText}>Adicionar</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>



                {/* ========== SHOWCASE (DESTAQUES) ========== */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Destaques</Text>
                    <View style={styles.showcaseContainer}>
                        {[0, 1, 2].map((index) => {
                            const badge = equippedBadges[index];
                            return (
                                <View key={index} style={styles.showcaseSlot}>
                                    {badge ? (
                                        <LinearGradient
                                            colors={['#1F2937', '#111827']}
                                            style={styles.showcaseBadge}
                                        >
                                            <View style={styles.showcaseIconWrap}>
                                                <Text style={styles.showcaseEmoji}>{badge.badge.icon}</Text>
                                            </View>
                                            <View style={styles.showcaseGlow} />
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.showcaseEmpty}>
                                            <Ionicons name="ribbon-outline" size={24} color={COLORS.text.tertiary} />
                                            <Text style={styles.showcaseEmptyText}>Vazio</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={['#8B5CF6', '#6D28D9']}
                            style={styles.statIcon}
                        >
                            <Ionicons name="flash" size={20} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.statValue}>{(profile.current_xp || 0).toLocaleString()}</Text>
                        <Text style={styles.statLabel}>XP Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            style={styles.statIcon}
                        >
                            <Ionicons name="flame" size={20} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.statValue}>{profile.current_streak || 0}</Text>
                        <Text style={styles.statLabel}>Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.statIcon}
                        >
                            <Ionicons name="trophy" size={20} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.statValue}>{badges.length}</Text>
                        <Text style={styles.statLabel}>Badges</Text>
                    </View>
                </View>

                {/* Badges Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏆 Conquistas</Text>
                        <Text style={styles.sectionCount}>{badges.length}</Text>
                    </View>

                    {badges.length > 0 ? (
                        <View style={styles.badgesGrid}>
                            {badges.map((ub) => (
                                <Pressable
                                    key={ub.id}
                                    style={styles.badgeCard}
                                    onPress={() => {
                                        // Convert UserBadge to DisplayBadge
                                        setSelectedBadge({
                                            ...ub.badge,
                                            unlocked: true,
                                            unlocked_at: ub.unlocked_at,
                                            is_equipped: ub.is_equipped
                                        });
                                    }}
                                >
                                    <Text style={styles.badgeEmoji}>
                                        {ub.badge?.icon || '🏅'}
                                    </Text>
                                    <Text style={styles.badgeName} numberOfLines={1}>
                                        {ub.badge?.name || 'Badge'}
                                    </Text>
                                    <Text style={styles.badgeDate}>
                                        {new Date(ub.unlocked_at).toLocaleDateString('pt-PT', {
                                            day: '2-digit',
                                            month: 'short',
                                        })}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyBadges}>
                            <Ionicons name="ribbon-outline" size={48} color={COLORS.text.tertiary} />
                            <Text style={styles.emptyText}>
                                {isMe ? 'Ainda não tens badges' : 'Este utilizador ainda não tem badges'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Bottom Spacer */}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* OPTIONS MODAL */}
            <Modal transparent visible={optionsVisible} animationType="fade" onRequestClose={() => setOptionsVisible(false)}>
                <Pressable style={styles.bottomModalOverlay} onPress={() => setOptionsVisible(false)}>

                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.optionsSheet}>
                        <Text style={styles.optionsTitle}>Opções</Text>

                        <Pressable style={styles.optionItem} onPress={() => { setOptionsVisible(false); setReportModalVisible(true); }}>
                            <Ionicons name="flag-outline" size={20} color={COLORS.text.primary} />
                            <Text style={styles.optionText}>Reportar Utilizador</Text>
                        </Pressable>

                        <View style={styles.optionDivider} />

                        <Pressable style={styles.optionItem} onPress={handleBlock}>
                            <Ionicons name="ban-outline" size={20} color="#EF4444" />
                            <Text style={[styles.optionText, { color: '#EF4444' }]}>Bloquear Utilizador</Text>
                        </Pressable>

                        <View style={styles.optionDivider} />

                        <Pressable style={styles.optionItem} onPress={() => setOptionsVisible(false)}>
                            <Text style={styles.optionCancel}>Cancelar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* REPORT MODAL */}
            <Modal transparent visible={reportModalVisible} animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
                <Pressable style={styles.centerModalOverlay} onPress={() => setReportModalVisible(false)}>

                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <Pressable style={styles.reportModal} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.reportTitle}>Reportar {profile?.username}</Text>
                        <Text style={styles.reportSubtitle}>Por favor descreve o motivo.</Text>

                        <TextInput
                            style={styles.reasonInput}
                            placeholder="Motivo..."
                            placeholderTextColor={COLORS.text.tertiary}
                            multiline
                            numberOfLines={4}
                            value={reportReason}
                            onChangeText={setReportReason}
                        />

                        <View style={styles.reportActions}>
                            <Pressable style={styles.reportCancelBtn} onPress={() => setReportModalVisible(false)}>
                                <Text style={styles.reportCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.reportSubmitBtn, (!reportReason.trim() || reporting) && { opacity: 0.5 }]}
                                onPress={handleReport}
                                disabled={!reportReason.trim() || reporting}
                            >
                                {reporting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.reportSubmitText}>Enviar</Text>}
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* BLOCK MODAL */}
            <Modal transparent visible={blockModalVisible} animationType="slide" onRequestClose={() => setBlockModalVisible(false)}>
                <Pressable style={styles.centerModalOverlay} onPress={() => setBlockModalVisible(false)}>

                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <Pressable style={styles.reportModal} onPress={(e) => e.stopPropagation()}>
                        <Text style={[styles.reportTitle, { color: '#EF4444' }]}>Bloquear Utilizador?</Text>
                        <Text style={styles.reportSubtitle}>
                            Deixarás de ver publicações e mensagens de {profile?.full_name || 'este utilizador'}.
                            Esta ação é reversível nas definições.
                        </Text>

                        <View style={styles.reportActions}>
                            <Pressable style={styles.reportCancelBtn} onPress={() => setBlockModalVisible(false)}>
                                <Text style={styles.reportCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.reportSubmitBtn, { backgroundColor: '#EF4444', minWidth: 100 }]}
                                onPress={confirmBlock}
                                disabled={blocking}
                            >
                                {blocking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.reportSubmitText}>Bloquear</Text>}
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* BADGE DETAIL MODAL */}
            <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
                <Pressable style={styles.centerModalOverlay} onPress={() => setSelectedBadge(null)}>

                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <Animated.View style={[styles.modalContent, { transform: [{ scale: modalScale }] }]}>
                        {selectedBadge && (
                            <BadgeDetail
                                badge={selectedBadge}
                                onClose={() => setSelectedBadge(null)}
                                showEquipAction={false} // Disable equipping on other users' profiles
                            />
                        )}
                    </Animated.View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

// ============================================
// STYLES
// ============================================

// Modal
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Modal
    // Modal
    centerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    modalContent: { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['3xl'], width: '100%', maxWidth: 340, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    // Options sheet moved to bottomModalOverlay context

    loadingContainer: {

        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.lg,
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.lg,
        color: COLORS.text.primary,
    },
    backBtn: {
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    backBtnText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },

    // Header
    headerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
    },

    // Hero Card
    heroCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING['2xl'],
        alignItems: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.lg,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    avatarRing: {
        width: 110,
        height: 110,
        borderRadius: 55,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 102,
        height: 102,
        borderRadius: 51,
        borderWidth: 3,
        borderColor: COLORS.background,
    },
    avatarFallback: {
        width: 102,
        height: 102,
        borderRadius: 51,
        backgroundColor: COLORS.surfaceElevated,
        borderWidth: 3,
        borderColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    levelBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.surface,
    },
    levelText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    educationBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
        marginBottom: SPACING.xs,
        paddingHorizontal: SPACING.md,
    },
    educationBadge: {
        borderRadius: RADIUS.full,
        overflow: 'hidden',
    },
    educationBadgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        gap: 6,
    },
    educationBadgeText: {
        fontSize: 11,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    name: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    username: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        marginTop: SPACING.md,
        gap: SPACING.xs,
    },
    tierEmoji: {
        fontSize: 16,
    },
    tierText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    xpContainer: {
        width: '100%',
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    xpBar: {
        width: '100%',
        height: 6,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: 3,
        overflow: 'hidden',
    },
    xpFill: {
        height: '100%',
        borderRadius: 3,
    },
    xpText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        marginTop: SPACING.xl,
        gap: SPACING.md,
    },
    messageBtn: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    addBtn: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.md,
    },
    addBtnDisabled: {
        opacity: 0.7,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
    },
    actionBtnText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    pendingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceMuted,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        gap: SPACING.sm,
    },
    pendingBtnText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
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

    // Section
    section: {
        marginBottom: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    sectionCount: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.accent.primary,
        backgroundColor: COLORS.accent.subtle,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },

    // Badges Grid
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    badgeCard: {
        width: '30%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    badgeEmoji: {
        fontSize: 32,
        marginBottom: SPACING.xs,
    },
    badgeName: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    badgeDate: {
        fontSize: 10,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    emptyBadges: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING['2xl'],
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.sm,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        textAlign: 'center',
    },

    // Showcase
    showcaseContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.lg,
        marginTop: SPACING.md,
    },
    showcaseSlot: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    showcaseBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFD700', // Gold border for featured
        backgroundColor: COLORS.surfaceElevated,
        ...SHADOWS.glow,
    },
    showcaseIconWrap: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    showcaseEmoji: {
        fontSize: 32,
    },
    showcaseGlow: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        zIndex: -1,
    },
    showcaseEmpty: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: COLORS.surfaceMuted,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    showcaseEmptyText: {
        fontSize: 10,
        color: COLORS.text.tertiary,
        marginTop: 4,
        fontFamily: TYPOGRAPHY.family.medium,
    },


    // Modals
    // Modals
    bottomModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    optionsSheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.xl,
        paddingBottom: SPACING['3xl'],
    },
    optionsTitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        gap: SPACING.md,
    },
    optionText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.weight.medium,
    },
    optionDivider: {
        height: 1,
        backgroundColor: COLORS.surfaceElevated,
        marginVertical: SPACING.xs,
    },
    optionCancel: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        textAlign: 'center',
        fontWeight: TYPOGRAPHY.weight.medium,
        marginTop: SPACING.xs,
    },

    // Report Modal
    reportModal: {
        backgroundColor: COLORS.surface,
        margin: SPACING.lg,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        marginTop: 'auto',
        marginBottom: 'auto',
    },
    reportTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        color: COLORS.text.primary,
        fontWeight: TYPOGRAPHY.weight.bold,
        marginBottom: SPACING.xs,
    },
    reportSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.secondary,
        marginBottom: SPACING.lg,
    },
    reasonInput: {
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        color: COLORS.text.primary,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: SPACING.lg,
    },
    reportActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: SPACING.md,
    },
    reportCancelBtn: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
    },
    reportCancelText: {
        color: COLORS.text.secondary,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },
    reportSubmitBtn: {
        backgroundColor: '#EF4444',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: RADIUS.lg,
        minWidth: 80,
        alignItems: 'center',
    },
    reportSubmitText: {
        color: '#FFF',
        fontWeight: TYPOGRAPHY.weight.bold,
    },
});


