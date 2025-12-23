/**
 * Join Team Screen
 * Ecrã para entrar em equipas via código ou explorar equipas públicas
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';

// ============================================
// TYPES
// ============================================

type TabType = 'code' | 'explore';

interface PublicTeam {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    color: string;
    member_count: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function JoinTeamScreen() {
    const router = useRouter();
    const { user } = useAuthContext();

    // Estado geral
    const [activeTab, setActiveTab] = useState<TabType>('code');

    // Tab: Via Código
    const [inviteCode, setInviteCode] = useState('');
    const [joining, setJoining] = useState(false);

    // Tab: Explorar
    const [publicTeams, setPublicTeams] = useState<PublicTeam[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);

    // ============================================
    // LOAD PUBLIC TEAMS
    // ============================================

    const loadPublicTeams = useCallback(async () => {
        try {
            setLoadingTeams(true);

            // Buscar equipas públicas com contagem de membros
            const { data, error } = await supabase
                .from('teams')
                .select(`
                    id,
                    name,
                    description,
                    icon_url,
                    color,
                    team_members(count)
                `)
                .eq('is_public', true)
                .order('name');

            if (error) throw error;

            // Transformar dados
            const teamsWithCount: PublicTeam[] = (data || []).map(team => ({
                id: team.id,
                name: team.name,
                description: team.description,
                icon_url: team.icon_url,
                color: team.color || colors.accent.primary,
                member_count: (team.team_members as any)?.[0]?.count || 0,
            }));

            setPublicTeams(teamsWithCount);
        } catch (err) {
            console.error('Erro ao carregar equipas:', err);
            Alert.alert('Erro', 'Não foi possível carregar as equipas públicas.');
        } finally {
            setLoadingTeams(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'explore') {
            loadPublicTeams();
        }
    }, [activeTab, loadPublicTeams]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadPublicTeams();
    };

    // ============================================
    // JOIN VIA CODE
    // ============================================

    const handleJoinViaCode = async () => {
        const code = inviteCode.trim().toUpperCase();
        if (!code) {
            Alert.alert('Erro', 'Introduz um código de convite.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Erro', 'Tens que estar autenticado.');
            return;
        }

        setJoining(true);

        try {
            const { data, error } = await supabase.rpc('join_team_via_code', {
                code_input: code,
                user_id_input: user.id,
            });

            if (error) throw error;

            if (data) {
                Alert.alert('✅ Sucesso!', 'Entraste na equipa!', [
                    {
                        text: 'Ver Equipa',
                        onPress: () => router.replace(`/team/${data}` as any),
                    },
                ]);
                setInviteCode('');
            } else {
                Alert.alert('Erro', 'Código inválido ou já és membro desta equipa.');
            }
        } catch (err: any) {
            console.error('Erro ao entrar via código:', err);
            Alert.alert('Erro', err.message || 'Não foi possível entrar na equipa.');
        } finally {
            setJoining(false);
        }
    };

    // ============================================
    // JOIN PUBLIC TEAM
    // ============================================

    const handleJoinPublicTeam = async (team: PublicTeam) => {
        if (!user?.id) {
            Alert.alert('Erro', 'Tens que estar autenticado.');
            return;
        }

        setJoiningTeamId(team.id);

        try {
            // Verificar se já é membro
            const { data: existingMember } = await supabase
                .from('team_members')
                .select('id')
                .eq('team_id', team.id)
                .eq('user_id', user.id)
                .single();

            if (existingMember) {
                Alert.alert('Info', 'Já és membro desta equipa!', [
                    {
                        text: 'Ver Equipa',
                        onPress: () => router.push(`/team/${team.id}` as any),
                    },
                ]);
                return;
            }

            // Inserir como membro
            const { error } = await supabase.from('team_members').insert({
                team_id: team.id,
                user_id: user.id,
                role: 'member',
            });

            if (error) throw error;

            Alert.alert('✅ Sucesso!', `Entraste em "${team.name}"!`, [
                {
                    text: 'Ver Equipa',
                    onPress: () => router.replace(`/team/${team.id}` as any),
                },
            ]);
        } catch (err: any) {
            console.error('Erro ao entrar na equipa:', err);
            Alert.alert('Erro', err.message || 'Não foi possível entrar na equipa.');
        } finally {
            setJoiningTeamId(null);
        }
    };

    // ============================================
    // RENDER PUBLIC TEAM ITEM
    // ============================================

    const renderTeamItem = ({ item }: { item: PublicTeam }) => {
        const isJoiningThis = joiningTeamId === item.id;

        return (
            <View style={styles.teamCard}>
                {/* Avatar */}
                {item.icon_url ? (
                    <Image source={{ uri: item.icon_url }} style={styles.teamAvatar} />
                ) : (
                    <View style={[styles.teamAvatarPlaceholder, { backgroundColor: item.color }]}>
                        <Text style={styles.teamAvatarText}>
                            {item.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Info */}
                <View style={styles.teamInfo}>
                    <Text style={styles.teamName} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.description && (
                        <Text style={styles.teamDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                    <View style={styles.teamMeta}>
                        <Ionicons name="people" size={14} color={colors.text.tertiary} />
                        <Text style={styles.teamMemberCount}>
                            {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'}
                        </Text>
                    </View>
                </View>

                {/* Join Button */}
                <Pressable
                    style={[styles.joinButton, isJoiningThis && styles.joinButtonDisabled]}
                    onPress={() => handleJoinPublicTeam(item)}
                    disabled={isJoiningThis}
                >
                    {isJoiningThis ? (
                        <ActivityIndicator size="small" color={colors.text.inverse} />
                    ) : (
                        <Text style={styles.joinButtonText}>Juntar</Text>
                    )}
                </Pressable>
            </View>
        );
    };

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Entrar numa Equipa</Text>
                    <Text style={styles.headerSubtitle}>Via código ou explorar públicas</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <Pressable
                    style={[styles.tab, activeTab === 'code' && styles.tabActive]}
                    onPress={() => setActiveTab('code')}
                >
                    <Ionicons
                        name="key-outline"
                        size={18}
                        color={activeTab === 'code' ? colors.accent.primary : colors.text.tertiary}
                    />
                    <Text style={[styles.tabText, activeTab === 'code' && styles.tabTextActive]}>
                        Via Código
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, activeTab === 'explore' && styles.tabActive]}
                    onPress={() => setActiveTab('explore')}
                >
                    <Ionicons
                        name="compass-outline"
                        size={18}
                        color={activeTab === 'explore' ? colors.accent.primary : colors.text.tertiary}
                    />
                    <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
                        Explorar
                    </Text>
                </Pressable>
            </View>

            {/* Content */}
            {activeTab === 'code' ? (
                <View style={styles.codeContainer}>
                    {/* Ilustração/Ícone */}
                    <View style={styles.codeIconContainer}>
                        <Ionicons name="ticket-outline" size={64} color={colors.accent.primary} />
                    </View>

                    <Text style={styles.codeTitle}>Tens um código de convite?</Text>
                    <Text style={styles.codeSubtitle}>
                        Introduz o código de 6 caracteres que recebeste
                    </Text>

                    {/* Input de Código */}
                    <View style={styles.codeInputContainer}>
                        <TextInput
                            style={styles.codeInput}
                            placeholder="EX: X7K9P2"
                            placeholderTextColor={colors.text.tertiary}
                            value={inviteCode}
                            onChangeText={(text) => setInviteCode(text.toUpperCase())}
                            maxLength={8}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Botão Entrar */}
                    <Pressable
                        style={[styles.enterButton, joining && styles.enterButtonDisabled]}
                        onPress={handleJoinViaCode}
                        disabled={joining}
                    >
                        {joining ? (
                            <ActivityIndicator size="small" color={colors.text.inverse} />
                        ) : (
                            <>
                                <Ionicons name="log-in-outline" size={20} color={colors.text.inverse} />
                                <Text style={styles.enterButtonText}>Entrar na Equipa</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={publicTeams}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTeamItem}
                    contentContainerStyle={[
                        styles.listContent,
                        publicTeams.length === 0 && styles.listContentEmpty,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.accent.primary}
                        />
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    ListEmptyComponent={
                        loadingTeams ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.accent.primary} />
                                <Text style={styles.loadingText}>A carregar equipas...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="planet-outline" size={64} color={colors.text.tertiary} />
                                </View>
                                <Text style={styles.emptyTitle}>Sem equipas públicas</Text>
                                <Text style={styles.emptyText}>
                                    Não há equipas públicas disponíveis de momento.
                                </Text>
                            </View>
                        )
                    }
                />
            )}

            {/* Footer - Criar Equipa */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Queres criar a tua própria equipa?</Text>
                <Pressable onPress={() => router.push('/team/create' as any)}>
                    <Text style={styles.footerLink}>Criar Equipa →</Text>
                </Pressable>
            </View>
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

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: colors.surface,
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

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.accent.primary,
    },
    tabText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
    },
    tabTextActive: {
        color: colors.accent.primary,
    },

    // Code Tab
    codeContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    codeIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.accent.subtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    codeTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    codeSubtitle: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    codeInputContainer: {
        width: '100%',
        marginBottom: spacing.lg,
    },
    codeInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        letterSpacing: 4,
        borderWidth: 2,
        borderColor: colors.divider,
        ...shadows.sm,
    },
    enterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        width: '100%',
        ...shadows.md,
    },
    enterButtonDisabled: {
        opacity: 0.7,
    },
    enterButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // List (Explore)
    listContent: {
        padding: spacing.md,
    },
    listContentEmpty: {
        flex: 1,
    },
    separator: {
        height: spacing.sm,
    },

    // Team Card
    teamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    teamAvatar: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    teamAvatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    teamAvatarText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.inverse,
    },
    teamInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    teamName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    teamDescription: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    teamMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    teamMemberCount: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    joinButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        minWidth: 70,
        alignItems: 'center',
    },
    joinButtonDisabled: {
        opacity: 0.7,
    },
    joinButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    loadingText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.md,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.surface,
    },
    footerText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    footerLink: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },
});
