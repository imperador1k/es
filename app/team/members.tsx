/**
 * Ecrã de Gestão de Membros de Equipa
 * Escola+ App
 * 
 * Permite ao Owner/Admin gerir membros: promover, demover, remover.
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamMembersScreen() {
    const { teamId } = useLocalSearchParams<{ teamId: string }>();
    const { user } = useAuthContext();

    const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);
    const [teamName, setTeamName] = useState('');

    // Carregar membros
    const loadMembers = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            // Buscar membros com perfil
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

            // Supabase retorna profile como array, extrair primeiro elemento
            const processedMembers = (membersData || []).map((m: any) => ({
                ...m,
                profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
            })) as TeamMemberWithProfile[];

            setMembers(processedMembers);

            // Encontrar role do utilizador atual
            const myMembership = membersData?.find(m => m.user_id === user.id);
            if (myMembership) {
                setUserRole(myMembership.role as TeamRole);
            }

            // Buscar nome da equipa
            const { data: teamData } = await supabase
                .from('teams')
                .select('name')
                .eq('id', teamId)
                .single();
            if (teamData) setTeamName(teamData.name);

        } catch (err) {
            console.error('Erro ao carregar membros:', err);
            Alert.alert('Erro', 'Não foi possível carregar os membros.');
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

    // Promover/Demover membro
    const handleChangeRole = async (member: TeamMemberWithProfile, newRole: TeamRole) => {
        if (!canModifyRole(userRole, member.role)) {
            Alert.alert('Sem Permissão', 'Não podes modificar este membro.');
            return;
        }

        try {
            const { error } = await supabase
                .from('team_members')
                .update({ role: newRole })
                .eq('id', member.id);

            if (error) throw error;

            // Atualizar lista local
            setMembers(prev =>
                prev.map(m => (m.id === member.id ? { ...m, role: newRole } : m))
            );

            Alert.alert('✅ Sucesso', `${member.profile.full_name || member.profile.username} é agora ${ROLE_LABELS[newRole]}.`);
        } catch (err) {
            console.error('Erro ao alterar role:', err);
            Alert.alert('Erro', 'Não foi possível alterar o cargo.');
        }
    };

    // Remover membro
    const handleRemoveMember = async (member: TeamMemberWithProfile) => {
        if (!canUser(userRole, 'KICK_MEMBERS')) {
            Alert.alert('Sem Permissão', 'Não podes remover membros.');
            return;
        }

        if (!canModifyRole(userRole, member.role)) {
            Alert.alert('Sem Permissão', 'Não podes remover este membro.');
            return;
        }

        Alert.alert(
            'Remover Membro',
            `Tens a certeza que queres remover ${member.profile.full_name || member.profile.username} da equipa?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('team_members')
                                .delete()
                                .eq('id', member.id);

                            if (error) throw error;

                            setMembers(prev => prev.filter(m => m.id !== member.id));
                            Alert.alert('✅ Removido', 'Membro removido da equipa.');
                        } catch (err) {
                            console.error('Erro ao remover membro:', err);
                            Alert.alert('Erro', 'Não foi possível remover o membro.');
                        }
                    },
                },
            ]
        );
    };

    // Mostrar opções de ação para um membro
    const showMemberActions = (member: TeamMemberWithProfile) => {
        if (member.user_id === user?.id) return; // Não pode editar a si mesmo
        if (!isAdmin(userRole)) return; // Só admins podem editar

        const options: string[] = [];
        const actions: (() => void)[] = [];

        // Opções de promoção/demoção baseadas no role atual
        if (canUser(userRole, 'PROMOTE_TO_ADMIN') && member.role !== 'admin') {
            options.push('Promover a Admin');
            actions.push(() => handleChangeRole(member, 'admin'));
        }
        if (canUser(userRole, 'PROMOTE_TO_MODERATOR') && member.role !== 'moderator') {
            options.push('Promover a Moderador');
            actions.push(() => handleChangeRole(member, 'moderator'));
        }
        if (canUser(userRole, 'PROMOTE_TO_DELEGATE') && member.role !== 'delegate') {
            options.push('Promover a Delegado');
            actions.push(() => handleChangeRole(member, 'delegate'));
        }
        if (member.role !== 'member' && canModifyRole(userRole, member.role)) {
            options.push('Demover a Membro');
            actions.push(() => handleChangeRole(member, 'member'));
        }
        if (canUser(userRole, 'KICK_MEMBERS') && canModifyRole(userRole, member.role)) {
            options.push('Remover da Equipa');
            actions.push(() => handleRemoveMember(member));
        }

        if (options.length === 0) return;

        options.push('Cancelar');

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: options.length - 1,
                    destructiveButtonIndex: options.findIndex(o => o.includes('Remover')),
                    title: member.profile.full_name || member.profile.username || 'Membro',
                },
                (buttonIndex) => {
                    if (buttonIndex < actions.length) {
                        actions[buttonIndex]();
                    }
                }
            );
        } else {
            // Android: usar Alert com botões
            Alert.alert(
                member.profile.full_name || member.profile.username || 'Membro',
                'Escolhe uma ação:',
                options.map((opt, i) => ({
                    text: opt,
                    style: opt.includes('Remover') ? 'destructive' : opt === 'Cancelar' ? 'cancel' : 'default',
                    onPress: () => {
                        if (i < actions.length) actions[i]();
                    },
                }))
            );
        }
    };

    // Render Member Card
    const renderMember = ({ item }: { item: TeamMemberWithProfile }) => {
        const isCurrentUser = item.user_id === user?.id;
        const canEdit = isAdmin(userRole) && !isCurrentUser && canModifyRole(userRole, item.role);

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.memberCard,
                    pressed && canEdit && styles.memberCardPressed,
                ]}
                onPress={() => canEdit && showMemberActions(item)}
                disabled={!canEdit}
            >
                {/* Avatar */}
                {item.profile.avatar_url ? (
                    <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {(item.profile.full_name || item.profile.username || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Info */}
                <View style={styles.memberInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.memberName}>
                            {item.profile.full_name || item.profile.username || 'Utilizador'}
                        </Text>
                        {isCurrentUser && (
                            <Text style={styles.youBadge}>Tu</Text>
                        )}
                    </View>
                    <Text style={styles.memberUsername}>@{item.profile.username || 'sem-username'}</Text>
                </View>

                {/* Role Badge */}
                <View style={[styles.roleBadge, { backgroundColor: `${ROLE_COLORS[item.role]}20` }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] }]}>
                        {ROLE_LABELS[item.role]}
                    </Text>
                </View>

                {/* Edit Icon */}
                {canEdit && (
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.text.tertiary} />
                )}
            </Pressable>
        );
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
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Membros</Text>
                    <Text style={styles.headerSubtitle}>{teamName} • {members.length} membros</Text>
                </View>
            </View>

            {/* Members List */}
            <FlatList
                data={members.sort((a, b) => getRoleLevel(b.role) - getRoleLevel(a.role))}
                keyExtractor={(item) => item.id}
                renderItem={renderMember}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent.primary}
                    />
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
                        <Text style={styles.emptyText}>Nenhum membro encontrado</Text>
                    </View>
                }
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // List
    listContent: {
        padding: spacing.lg,
    },
    separator: {
        height: spacing.sm,
    },

    // Member Card
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    memberCardPressed: {
        opacity: 0.7,
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
        backgroundColor: colors.accent.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.accent.primary,
    },
    memberInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    memberName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    youBadge: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.accent.primary,
        backgroundColor: colors.accent.subtle,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    memberUsername: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        marginRight: spacing.sm,
    },
    roleText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['5xl'],
    },
    emptyText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
        marginTop: spacing.md,
    },
});
