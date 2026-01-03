/**
 * Team Members Screen - Premium Dark Design
 * Gestão de membros: promover, demover, remover
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Profile, TeamRole } from '@/types/database.types';
import {
    canModifyRole,
    canUser,
    getRoleLevel,
    isAdmin,
    ROLE_COLORS,
    ROLE_LABELS,
} from '@/utils/permissions';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface TeamMemberWithProfile {
    id: string;
    user_id: string;
    team_id: string;
    role: TeamRole;
    joined_at: string;
    profile: Profile;
}

const ROLE_ICONS: Record<TeamRole, string> = {
    owner: '👑',
    admin: '⭐',
    moderator: '🛡️',
    delegate: '📋',
    member: '👤',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamMembersScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthContext();
    const { showAlert } = useAlert();

    const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);
    const [teamName, setTeamName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Load members
    const loadMembers = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            const { data: membersData, error } = await supabase
                .from('team_members')
                .select(`
          id,
          user_id,
          team_id,
          role,
          joined_at,
          profile:profiles!user_id (
            id,
            username,
            full_name,
            avatar_url,
            current_tier,
            current_xp
          )
        `)
                .eq('team_id', teamId)
                .order('role', { ascending: true });

            if (error) throw error;

            const processedMembers = (membersData || []).map((m: any) => ({
                ...m,
                profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
            })) as TeamMemberWithProfile[];

            setMembers(processedMembers);

            const myMembership = membersData?.find((m) => m.user_id === user.id);
            if (myMembership) setUserRole(myMembership.role as TeamRole);

            const { data: teamData } = await supabase
                .from('teams')
                .select('name')
                .eq('id', teamId)
                .single();
            if (teamData) setTeamName(teamData.name);
        } catch (err) {
            console.error('Error loading members:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível carregar os membros.' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teamId, user?.id]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadMembers();
    };

    // Change role
    const handleChangeRole = async (member: TeamMemberWithProfile, newRole: TeamRole) => {
        if (!canModifyRole(userRole, member.role)) {
            showAlert({ title: 'Sem Permissão', message: 'Não podes modificar este membro.' });
            return;
        }

        try {
            const { error } = await supabase
                .from('team_members')
                .update({ role: newRole })
                .eq('id', member.id);

            if (error) throw error;

            setMembers((prev) =>
                prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
            );

            showAlert({ title: '✅ Sucesso', message: `${member.profile.full_name || member.profile.username} é agora ${ROLE_LABELS[newRole]}.` });
        } catch (err) {
            console.error('Error changing role:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível alterar o cargo.' });
        }
    };

    // Remove member
    const handleRemoveMember = async (member: TeamMemberWithProfile) => {
        if (!canUser(userRole, 'KICK_MEMBERS') || !canModifyRole(userRole, member.role)) {
            showAlert({ title: 'Sem Permissão', message: 'Não podes remover este membro.' });
            return;
        }

        showAlert({
            title: 'Remover Membro',
            message: `Remover ${member.profile.full_name || member.profile.username}?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('team_members').delete().eq('id', member.id);
                            if (error) throw error;
                            setMembers((prev) => prev.filter((m) => m.id !== member.id));
                            showAlert({ title: '✅ Removido', message: 'Membro removido da equipa.' });
                        } catch (err) {
                            console.error('Error removing member:', err);
                            showAlert({ title: 'Erro', message: 'Não foi possível remover o membro.' });
                        }
                    },
                },
            ]
        });
    };

    // Show member actions
    const showMemberActions = (member: TeamMemberWithProfile) => {
        if (member.user_id === user?.id || !isAdmin(userRole)) return;

        const options: string[] = [];
        const actions: (() => void)[] = [];

        if (canUser(userRole, 'PROMOTE_TO_ADMIN') && member.role !== 'admin') {
            options.push('⭐ Promover a Admin');
            actions.push(() => handleChangeRole(member, 'admin'));
        }
        if (canUser(userRole, 'PROMOTE_TO_MODERATOR') && member.role !== 'moderator') {
            options.push('🛡️ Promover a Moderador');
            actions.push(() => handleChangeRole(member, 'moderator'));
        }
        if (member.role !== 'member' && canModifyRole(userRole, member.role)) {
            options.push('👤 Demover a Membro');
            actions.push(() => handleChangeRole(member, 'member'));
        }
        if (canUser(userRole, 'KICK_MEMBERS') && canModifyRole(userRole, member.role)) {
            options.push('🚫 Remover da Equipa');
            actions.push(() => handleRemoveMember(member));
        }

        if (options.length === 0) return;
        options.push('Cancelar');

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: options.length - 1,
                    destructiveButtonIndex: options.findIndex((o) => o.includes('Remover')),
                    title: member.profile.full_name || member.profile.username || 'Membro',
                },
                (buttonIndex) => {
                    if (buttonIndex < actions.length) actions[buttonIndex]();
                }
            );
        } else {
            showAlert({
                title: member.profile.full_name || member.profile.username || 'Membro',
                message: 'Escolhe uma ação:',
                buttons: options.map((opt, i) => ({
                    text: opt,
                    style: opt.includes('Remover') ? 'destructive' : opt === 'Cancelar' ? 'cancel' : 'default',
                    onPress: () => {
                        if (i < actions.length) actions[i]();
                    },
                }))
            });
        }
    };

    // Filter members
    const filteredMembers = members
        .filter((m) => {
            const name = m.profile.full_name || m.profile.username || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => getRoleLevel(b.role) - getRoleLevel(a.role));

    // Group by role
    const groupedMembers = {
        admins: filteredMembers.filter((m) => ['owner', 'admin'].includes(m.role)),
        mods: filteredMembers.filter((m) => ['moderator', 'delegate'].includes(m.role)),
        members: filteredMembers.filter((m) => m.role === 'member'),
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>👥 Membros</Text>
                        <Text style={styles.headerSubtitle}>{teamName} • {members.length}</Text>
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Procurar membro..."
                        placeholderTextColor={COLORS.text.tertiary}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.text.tertiary} />
                        </Pressable>
                    )}
                </View>

                {/* Members */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />
                    }
                >
                    {/* Admins */}
                    {groupedMembers.admins.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Administração</Text>
                            {groupedMembers.admins.map((member) => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    isCurrentUser={member.user_id === user?.id}
                                    canEdit={isAdmin(userRole) && member.user_id !== user?.id && canModifyRole(userRole, member.role)}
                                    onPress={() => router.push(`/user/${member.user_id}` as any)}
                                    onLongPress={() => showMemberActions(member)}
                                />
                            ))}
                        </>
                    )}

                    {/* Moderators */}
                    {groupedMembers.mods.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Moderadores</Text>
                            {groupedMembers.mods.map((member) => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    isCurrentUser={member.user_id === user?.id}
                                    canEdit={isAdmin(userRole) && member.user_id !== user?.id && canModifyRole(userRole, member.role)}
                                    onPress={() => router.push(`/user/${member.user_id}` as any)}
                                    onLongPress={() => showMemberActions(member)}
                                />
                            ))}
                        </>
                    )}

                    {/* Members */}
                    {groupedMembers.members.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Membros ({groupedMembers.members.length})</Text>
                            {groupedMembers.members.map((member) => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    isCurrentUser={member.user_id === user?.id}
                                    canEdit={isAdmin(userRole) && member.user_id !== user?.id && canModifyRole(userRole, member.role)}
                                    onPress={() => router.push(`/user/${member.user_id}` as any)}
                                    onLongPress={() => showMemberActions(member)}
                                />
                            ))}
                        </>
                    )}

                    {filteredMembers.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={48} color={COLORS.text.tertiary} />
                            <Text style={styles.emptyText}>Nenhum membro encontrado</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// MEMBER CARD
// ============================================

function MemberCard({
    member,
    isCurrentUser,
    canEdit,
    onPress,
    onLongPress,
}: {
    member: TeamMemberWithProfile;
    isCurrentUser: boolean;
    canEdit: boolean;
    onPress: () => void;
    onLongPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const roleColor = ROLE_COLORS[member.role] || '#6366F1';

    return (
        <Animated.View style={[styles.memberCard, isCurrentUser && styles.memberCardHighlight, { transform: [{ scale }] }]}>
            {/* Área principal clicável - abre perfil */}
            <Pressable
                onPress={onPress}
                onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
                style={styles.memberMainArea}
            >
                {/* Avatar */}
                {member.profile.avatar_url ? (
                    <Image source={{ uri: member.profile.avatar_url }} style={styles.avatar} />
                ) : (
                    <LinearGradient colors={[roleColor, `${roleColor}80`]} style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {(member.profile.full_name || member.profile.username || '?').charAt(0).toUpperCase()}
                        </Text>
                    </LinearGradient>
                )}

                {/* Info */}
                <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.memberName}>
                            {member.profile.full_name || member.profile.username || 'Utilizador'}
                        </Text>
                        {isCurrentUser && <Text style={styles.youBadge}>Tu</Text>}
                    </View>
                    <Text style={styles.memberUsername}>@{member.profile.username || 'anónimo'}</Text>
                </View>

                {/* Role Badge */}
                <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
                    <Text style={styles.roleIcon}>{ROLE_ICONS[member.role]}</Text>
                    <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABELS[member.role]}</Text>
                </View>
            </Pressable>

            {/* Botão de edição separado - abre menu de ações */}
            {canEdit && (
                <Pressable
                    onPress={onLongPress}
                    style={styles.editButton}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text.secondary} />
                </Pressable>
            )}
        </Animated.View>
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
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    searchInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
    },

    // Section
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: SPACING.lg,
        marginBottom: SPACING.md,
    },

    // Member Card
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.md,
        paddingLeft: SPACING.md,
        paddingRight: SPACING.xs,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    memberMainArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberCardHighlight: {
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    memberInfo: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    memberName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    youBadge: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    memberUsername: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
        gap: 4,
    },
    roleIcon: {
        fontSize: 12,
    },
    roleText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.semibold,
    },
    editButton: {
        marginLeft: SPACING.sm,
        padding: SPACING.xs,
        borderRadius: RADIUS.md,
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        marginTop: SPACING.md,
    },
});
