/**
 * Team Channels Management Screen
 * Ecrã para gerir canais da equipa (CRUD)
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
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
import { Channel, TeamRole } from '@/types/database.types';
import { canUser } from '@/utils/permissions';

// ============================================
// TYPES
// ============================================

import { ChannelType } from '@/types/database.types';

interface ChannelTypeOption {
    value: ChannelType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
}

const CHANNEL_TYPES: ChannelTypeOption[] = [
    { value: 'text', label: 'Chat', icon: 'chatbubble-outline', description: 'Conversa geral' },
    { value: 'announcements', label: 'Anúncios', icon: 'megaphone-outline', description: 'Apenas staff pode enviar' },
    { value: 'resources', label: 'Recursos', icon: 'folder-outline', description: 'Partilha de materiais' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamChannelsScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthContext();

    // Estados
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);
    const [teamName, setTeamName] = useState('');

    // Modal criar/editar
    const [modalVisible, setModalVisible] = useState(false);
    const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
    const [channelName, setChannelName] = useState('');
    const [channelType, setChannelType] = useState<ChannelType>('text');
    const [saving, setSaving] = useState(false);

    // Permissões
    const canManageChannels = canUser(userRole, 'CREATE_CHANNEL');

    // ============================================
    // LOAD DATA
    // ============================================

    const loadChannels = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            // Buscar canais
            const { data: channelsData, error } = await supabase
                .from('channels')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setChannels(channelsData || []);

            // Buscar role (só 1x)
            if (!userRole) {
                const { data: memberData } = await supabase
                    .from('team_members')
                    .select('role')
                    .eq('team_id', teamId)
                    .eq('user_id', user.id)
                    .single();

                if (memberData) {
                    setUserRole(memberData.role as TeamRole);
                }
            }

            // Buscar nome da equipa (só 1x)
            if (!teamName) {
                const { data: teamData } = await supabase
                    .from('teams')
                    .select('name')
                    .eq('id', teamId)
                    .single();
                if (teamData) setTeamName(teamData.name);
            }
        } catch (err) {
            console.error('Erro ao carregar canais:', err);
            Alert.alert('Erro', 'Não foi possível carregar os canais.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [teamId, user?.id, userRole, teamName]);

    useEffect(() => {
        loadChannels();
    }, [loadChannels]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadChannels();
    };

    // ============================================
    // CREATE / EDIT CHANNEL
    // ============================================

    const openCreateModal = () => {
        setEditingChannel(null);
        setChannelName('');
        setChannelType('text');
        setModalVisible(true);
    };

    const openEditModal = (channel: Channel) => {
        setEditingChannel(channel);
        setChannelName(channel.name);
        setChannelType((channel.type as ChannelType) || 'chat');
        setModalVisible(true);
    };

    const handleSaveChannel = async () => {
        const name = channelName.trim().toLowerCase().replace(/\s+/g, '-');
        if (!name) {
            Alert.alert('Erro', 'O nome do canal é obrigatório.');
            return;
        }

        setSaving(true);

        try {
            if (editingChannel) {
                // Atualizar
                const { error } = await supabase
                    .from('channels')
                    .update({ name, type: channelType })
                    .eq('id', editingChannel.id);

                if (error) throw error;

                setChannels(prev =>
                    prev.map(c => (c.id === editingChannel.id ? { ...c, name, type: channelType } : c))
                );
                Alert.alert('✅ Atualizado', `Canal #${name} foi atualizado.`);
            } else {
                // Criar
                const { data, error } = await supabase
                    .from('channels')
                    .insert({
                        team_id: teamId,
                        name,
                        type: channelType,
                    })
                    .select()
                    .single();

                if (error) throw error;

                setChannels(prev => [...prev, data]);
                Alert.alert('✅ Criado', `Canal #${name} foi criado.`);
            }

            setModalVisible(false);
        } catch (err: any) {
            console.error('Erro ao guardar canal:', err);
            Alert.alert('Erro', err.message || 'Não foi possível guardar o canal.');
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // DELETE CHANNEL
    // ============================================

    const handleDeleteChannel = (channel: Channel) => {
        if (channels.length <= 1) {
            Alert.alert('Erro', 'A equipa precisa de ter pelo menos um canal.');
            return;
        }

        Alert.alert(
            'Apagar Canal?',
            `Tens a certeza que queres apagar #${channel.name}? Todas as mensagens serão perdidas.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('channels')
                                .delete()
                                .eq('id', channel.id);

                            if (error) throw error;

                            setChannels(prev => prev.filter(c => c.id !== channel.id));
                            Alert.alert('🗑️ Apagado', `Canal #${channel.name} foi removido.`);
                        } catch (err) {
                            console.error('Erro ao apagar:', err);
                            Alert.alert('Erro', 'Não foi possível apagar o canal.');
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // RENDER CHANNEL ITEM
    // ============================================

    const getChannelIcon = (type: string): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'announcements':
                return 'megaphone-outline';
            case 'resources':
                return 'folder-outline';
            default:
                return 'chatbubble-outline';
        }
    };

    const renderChannelItem = ({ item }: { item: Channel }) => {
        const icon = getChannelIcon(item.type || 'chat');

        const showOptions = () => {
            if (!canManageChannels) return;

            Alert.alert(`#${item.name}`, '', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Editar', onPress: () => openEditModal(item) },
                { text: 'Apagar', style: 'destructive', onPress: () => handleDeleteChannel(item) },
            ]);
        };

        return (
            <Pressable
                style={({ pressed }) => [styles.channelCard, pressed && styles.channelCardPressed]}
                onPress={() => router.push(`/team/${teamId}/channel/${item.id}` as any)}
                onLongPress={showOptions}
                android_ripple={{ color: colors.accent.subtle }}
            >
                <View style={[styles.channelIcon, { backgroundColor: `${colors.accent.primary}15` }]}>
                    <Ionicons name={icon} size={22} color={colors.accent.primary} />
                </View>
                <View style={styles.channelInfo}>
                    <Text style={styles.channelName}>#{item.name}</Text>
                    <Text style={styles.channelType}>
                        {CHANNEL_TYPES.find(t => t.value === item.type)?.label || 'Chat'}
                    </Text>
                </View>
                {canManageChannels && (
                    <Pressable style={styles.moreButton} onPress={showOptions}>
                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.tertiary} />
                    </Pressable>
                )}
            </Pressable>
        );
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent.primary} />
                </View>
            </SafeAreaView>
        );
    }

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
                    <Text style={styles.headerTitle}>Canais</Text>
                    <Text style={styles.headerSubtitle}>
                        {teamName} • {channels.length} canais
                    </Text>
                </View>
                {canManageChannels && (
                    <Pressable style={styles.addButton} onPress={openCreateModal}>
                        <Ionicons name="add" size={22} color={colors.text.inverse} />
                    </Pressable>
                )}
            </View>

            {/* Channel List */}
            <FlatList
                data={channels}
                keyExtractor={(item) => item.id}
                renderItem={renderChannelItem}
                contentContainerStyle={[
                    styles.listContent,
                    channels.length === 0 && styles.listContentEmpty,
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
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.text.tertiary} />
                        </View>
                        <Text style={styles.emptyTitle}>Sem canais</Text>
                        <Text style={styles.emptyText}>
                            Cria o primeiro canal para a equipa comunicar.
                        </Text>
                        {canManageChannels && (
                            <Pressable style={styles.emptyButton} onPress={openCreateModal}>
                                <Ionicons name="add" size={20} color={colors.text.inverse} />
                                <Text style={styles.emptyButtonText}>Criar Canal</Text>
                            </Pressable>
                        )}
                    </View>
                }
            />

            {/* Modal Criar/Editar */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingChannel ? 'Editar Canal' : 'Novo Canal'}
                        </Text>

                        {/* Nome */}
                        <Text style={styles.inputLabel}>Nome do Canal</Text>
                        <View style={styles.nameInputContainer}>
                            <Text style={styles.namePrefix}>#</Text>
                            <TextInput
                                style={styles.nameInput}
                                placeholder="geral"
                                placeholderTextColor={colors.text.tertiary}
                                value={channelName}
                                onChangeText={(text) =>
                                    setChannelName(text.toLowerCase().replace(/\s+/g, '-'))
                                }
                                autoFocus
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Tipo */}
                        <Text style={styles.inputLabel}>Tipo de Canal</Text>
                        <View style={styles.typeSelector}>
                            {CHANNEL_TYPES.map((type) => (
                                <Pressable
                                    key={type.value}
                                    style={[
                                        styles.typeOption,
                                        channelType === type.value && styles.typeOptionSelected,
                                    ]}
                                    onPress={() => setChannelType(type.value)}
                                >
                                    <Ionicons
                                        name={type.icon}
                                        size={24}
                                        color={
                                            channelType === type.value
                                                ? colors.accent.primary
                                                : colors.text.tertiary
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.typeLabel,
                                            channelType === type.value && styles.typeLabelSelected,
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                    <Text style={styles.typeDescription}>{type.description}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.modalButtonCancel}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={styles.modalButtonConfirm}
                                onPress={handleSaveChannel}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={colors.text.inverse} />
                                ) : (
                                    <Text style={styles.modalButtonConfirmText}>
                                        {editingChannel ? 'Guardar' : 'Criar'}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
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
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.md,
    },

    // List
    listContent: {
        padding: spacing.md,
    },
    listContentEmpty: {
        flex: 1,
    },
    separator: {
        height: spacing.sm,
    },

    // Channel Card
    channelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    channelCardPressed: {
        opacity: 0.9,
    },
    channelIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    channelName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    channelType: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    moreButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    emptyText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    emptyButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.xl,
        paddingBottom: spacing.xl + 20,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    nameInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    namePrefix: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.tertiary,
        paddingHorizontal: spacing.md,
    },
    nameInput: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingRight: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    typeSelector: {
        gap: spacing.sm,
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    typeOptionSelected: {
        borderColor: colors.accent.primary,
        backgroundColor: colors.accent.subtle,
    },
    typeLabel: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    typeLabelSelected: {
        color: colors.accent.primary,
    },
    typeDescription: {
        flex: 1,
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        textAlign: 'right',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    modalButtonCancel: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    modalButtonCancelText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    modalButtonConfirm: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        minWidth: 80,
        alignItems: 'center',
    },
    modalButtonConfirmText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
});
