import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { TeamWithRole, useTeams } from '@/providers/TeamsProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Squad colors
const SQUAD_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6'];

export default function TeamsScreen() {
    const { user } = useAuthContext();
    const { teams, loading, refreshTeams } = useTeams();
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState(SQUAD_COLORS[0]);
    const [isPublic, setIsPublic] = useState(false);
    const [customCode, setCustomCode] = useState('');

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshTeams();
        setRefreshing(false);
    };

    // Create team
    const handleCreateTeam = async () => {
        if (!user?.id || !newName.trim()) {
            Alert.alert('Erro', 'Nome é obrigatório');
            return;
        }

        // Validar código personalizado se fornecido
        if (customCode.trim() && customCode.trim().length < 4) {
            Alert.alert('Erro', 'Código personalizado deve ter pelo menos 4 caracteres.');
            return;
        }

        try {
            setCreating(true);

            const teamInsert: any = {
                name: newName.trim(),
                description: newDescription.trim() || null,
                owner_id: user.id,
                color: selectedColor,
                is_public: isPublic,
            };

            // Se código personalizado fornecido, usá-lo
            if (customCode.trim()) {
                teamInsert.invite_code = customCode.trim().toUpperCase();
            }

            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .insert(teamInsert)
                .select()
                .single();

            if (teamError) {
                if (teamError.code === '23505') {
                    Alert.alert('Erro', 'Este código de convite já existe. Escolhe outro.');
                    return;
                }
                throw teamError;
            }

            await supabase.from('team_members').insert({
                team_id: teamData.id,
                user_id: user.id,
                role: 'owner',
            });

            // Criar canal #geral por defeito
            await supabase.from('channels').insert({
                team_id: teamData.id,
                name: 'geral',
                type: 'text',
            });

            // Realtime vai atualizar a lista automaticamente, mas fazemos refresh explícito
            await refreshTeams();
            setModalVisible(false);
            resetForm();
            Alert.alert('🎉 Squad Criada!', `"${teamData.name}" está pronta!\n\nCódigo: ${teamData.invite_code}`);
        } catch (err) {
            console.error('Erro ao criar squad:', err);
            Alert.alert('Erro', 'Não foi possível criar');
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setNewName('');
        setNewDescription('');
        setSelectedColor(SQUAD_COLORS[0]);
        setIsPublic(false);
        setCustomCode('');
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
                <View>
                    <Text style={styles.title}>Minhas Squads</Text>
                    <Text style={styles.subtitle}>{teams.length} squads</Text>
                </View>
            </View>

            {/* Action Cards */}
            <View style={styles.actionCards}>
                <Pressable
                    style={styles.actionCard}
                    onPress={() => router.push('/team/join' as any)}
                >
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.success.subtle }]}>
                        <Ionicons name="log-in-outline" size={22} color={colors.success.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Entrar numa Squad</Text>
                        <Text style={styles.actionSubtitle}>Via código ou explorar</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                </Pressable>

                <Pressable
                    style={styles.actionCard}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.accent.subtle }]}>
                        <Ionicons name="add-circle-outline" size={22} color={colors.accent.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Criar Nova Squad</Text>
                        <Text style={styles.actionSubtitle}>Torna-te o líder</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                </Pressable>
            </View>

            {/* List */}
            <FlatList
                data={teams}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <SquadCard team={item} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<EmptyState onPress={() => setModalVisible(true)} />}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                showsVerticalScrollIndicator={false}
            />

            {/* Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nova Squad</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text.tertiary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Nome */}
                            <Text style={styles.inputLabel}>Nome da Squad *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Turma 12ºA"
                                placeholderTextColor={colors.text.tertiary}
                                value={newName}
                                onChangeText={setNewName}
                            />

                            {/* Descrição */}
                            <Text style={styles.inputLabel}>Descrição (opcional)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Descreve a squad..."
                                placeholderTextColor={colors.text.tertiary}
                                value={newDescription}
                                onChangeText={setNewDescription}
                                multiline
                            />

                            {/* Cor */}
                            <Text style={styles.inputLabel}>Cor da Squad</Text>
                            <View style={styles.colorPicker}>
                                {SQUAD_COLORS.map((color) => (
                                    <Pressable
                                        key={color}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color },
                                            selectedColor === color && styles.colorOptionSelected,
                                        ]}
                                        onPress={() => setSelectedColor(color)}
                                    >
                                        {selectedColor === color && (
                                            <Ionicons name="checkmark" size={16} color={colors.text.inverse} />
                                        )}
                                    </Pressable>
                                ))}
                            </View>

                            {/* Toggle Privacidade */}
                            <View style={styles.toggleRow}>
                                <View style={styles.toggleInfo}>
                                    <Ionicons
                                        name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                                        size={20}
                                        color={isPublic ? colors.success.primary : colors.text.secondary}
                                    />
                                    <View style={styles.toggleTextContainer}>
                                        <Text style={styles.toggleTitle}>
                                            {isPublic ? 'Squad Pública' : 'Squad Privada'}
                                        </Text>
                                        <Text style={styles.toggleSubtitle}>
                                            {isPublic
                                                ? 'Qualquer pessoa pode ver e juntar-se'
                                                : 'Só com código de convite'}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    style={[styles.toggleSwitch, isPublic && styles.toggleSwitchActive]}
                                    onPress={() => setIsPublic(!isPublic)}
                                >
                                    <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
                                </Pressable>
                            </View>

                            {/* Código Personalizado */}
                            <Text style={styles.inputLabel}>Código de Convite (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: TURMA12A (gerado se vazio)"
                                placeholderTextColor={colors.text.tertiary}
                                value={customCode}
                                onChangeText={(text) => setCustomCode(text.toUpperCase())}
                                autoCapitalize="characters"
                                maxLength={10}
                            />
                            <Text style={styles.inputHint}>
                                Deixa vazio para gerar automaticamente
                            </Text>

                            {/* Botão Criar */}
                            <Pressable style={styles.submitButton} onPress={handleCreateTeam} disabled={creating}>
                                {creating ? (
                                    <ActivityIndicator color={colors.text.inverse} />
                                ) : (
                                    <Text style={styles.submitText}>Criar Squad</Text>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

// ============================================
// SUB COMPONENTS
// ============================================
function SquadCard({ team }: { team: TeamWithRole }) {
    const color = team.color || SQUAD_COLORS[0];
    const initial = team.name.charAt(0).toUpperCase();

    return (
        <Pressable style={styles.squadCard} onPress={() => router.push(`/team/${team.id}` as any)}>
            {/* Avatar - Mostra icon_url se existir */}
            {team.icon_url ? (
                <Image source={{ uri: team.icon_url }} style={styles.squadAvatar} />
            ) : (
                <View style={[styles.squadAvatarPlaceholder, { backgroundColor: `${color}20` }]}>
                    <Text style={[styles.squadInitial, { color }]}>{initial}</Text>
                </View>
            )}

            {/* Content */}
            <View style={styles.squadContent}>
                <Text style={styles.squadName}>{team.name}</Text>
                {team.description && (
                    <Text style={styles.squadDescription} numberOfLines={1}>{team.description}</Text>
                )}
                <View style={styles.squadMeta}>
                    <View style={[styles.roleBadge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.roleText, { color }]}>{team.role}</Text>
                    </View>
                </View>
            </View>

            {/* Arrow */}
            <View style={styles.squadArrow}>
                <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </View>
        </Pressable>
    );
}

function EmptyState({ onPress }: { onPress: () => void }) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={48} color={colors.accent.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem squads</Text>
            <Text style={styles.emptySubtitle}>Cria uma squad para colaborar com colegas!</Text>
            <Pressable style={styles.emptyButton} onPress={onPress}>
                <Text style={styles.emptyButtonText}>Criar Squad</Text>
            </Pressable>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
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
        paddingHorizontal: spacing.xl,
        paddingBottom: 120,
        flexGrow: 1,
    },

    // Squad Card
    squadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },
    squadAvatar: {
        width: 52,
        height: 52,
        borderRadius: 14,
        marginRight: spacing.lg,
    },
    squadAvatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.lg,
    },
    squadInitial: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    squadContent: {
        flex: 1,
    },
    squadName: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    squadDescription: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    squadMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    roleBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    roleText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        textTransform: 'capitalize',
    },
    squadArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Empty
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing['3xl'],
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    emptyButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    emptyButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Modal
    modalWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: borderRadius['2xl'],
        borderTopRightRadius: borderRadius['2xl'],
        padding: spacing.xl,
        paddingBottom: spacing['4xl'],
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },

    // Inputs
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    input: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Submit
    submitButton: {
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
        ...shadows.md,
    },
    submitText: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Action Cards
    actionCards: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        gap: spacing.sm,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },
    actionIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTextContainer: {
        flex: 1,
        marginLeft: spacing.md,
    },
    actionTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    actionSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Color Picker
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: colors.text.inverse,
        ...shadows.sm,
    },

    // Toggle / Switch
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.sm,
    },
    toggleTextContainer: {
        flex: 1,
    },
    toggleTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },
    toggleSubtitle: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    toggleSwitch: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.divider,
        padding: 2,
        justifyContent: 'center',
    },
    toggleSwitchActive: {
        backgroundColor: colors.success.primary,
    },
    toggleThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.text.inverse,
        ...shadows.sm,
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },

    // Input Hint
    inputHint: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
});
