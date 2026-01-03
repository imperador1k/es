/**
 * Teams Screen - Premium Dark Design
 * With search filter and organized layout
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { TeamWithRole, useTeams } from '@/providers/TeamsProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Squad colors
const SQUAD_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#14B8A6'];

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamsScreen() {
    const { user } = useAuthContext();
    const { teams, loading, refreshTeams } = useTeams();
    const { showAlert } = useAlert();
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState(SQUAD_COLORS[0]);
    const [isPublic, setIsPublic] = useState(false);
    const [customCode, setCustomCode] = useState('');

    // Filter teams
    const filteredTeams = teams.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshTeams();
        setRefreshing(false);
    };

    const handleCreateTeam = async () => {
        if (!user?.id || !newName.trim()) {
            showAlert({ title: 'Erro', message: 'Nome é obrigatório' });
            return;
        }

        if (customCode.trim() && customCode.trim().length < 4) {
            showAlert({ title: 'Erro', message: 'Código deve ter pelo menos 4 caracteres' });
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
                    showAlert({ title: 'Erro', message: 'Este código já existe. Escolhe outro.' });
                    return;
                }
                throw teamError;
            }

            await supabase.from('team_members').insert({
                team_id: teamData.id,
                user_id: user.id,
                role: 'owner',
            });

            await supabase.from('channels').insert({
                team_id: teamData.id,
                name: 'geral',
                type: 'text',
            });

            await refreshTeams();
            setModalVisible(false);
            resetForm();
            showAlert({ title: '🎉 Squad Criada!', message: `"${teamData.name}" está pronta!\n\nCódigo: ${teamData.invite_code}` });
        } catch (err) {
            console.error('Erro ao criar squad:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível criar' });
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
                    <View>
                        <Text style={styles.headerTitle}>Equipas</Text>
                        <Text style={styles.headerSubtitle}>
                            {teams.length > 0 ? `${teams.length} squad${teams.length > 1 ? 's' : ''}` : 'Sem squads'}
                        </Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
                        <TextInput
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Procurar squads..."
                            placeholderTextColor={COLORS.text.tertiary}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={COLORS.text.tertiary} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Quick Actions - 2 buttons */}
                <View style={styles.quickActions}>
                    <Pressable style={styles.quickActionCard} onPress={() => router.push('/team/join' as any)}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.quickActionIcon}>
                            <Ionicons name="enter-outline" size={22} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.quickActionLabel}>Entrar</Text>
                        <Text style={styles.quickActionHint}>Via código</Text>
                    </Pressable>

                    <Pressable style={styles.quickActionCard} onPress={() => setModalVisible(true)}>
                        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.quickActionIcon}>
                            <Ionicons name="add" size={22} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.quickActionLabel}>Criar</Text>
                        <Text style={styles.quickActionHint}>Nova squad</Text>
                    </Pressable>
                </View>

                {/* Section Title */}
                {filteredTeams.length > 0 && (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Minhas Squads</Text>
                        <Text style={styles.sectionCount}>{filteredTeams.length}</Text>
                    </View>
                )}

                {/* Teams List */}
                <FlatList
                    data={filteredTeams}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <SquadCard team={item} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        searchQuery.length > 0 ? (
                            <View style={styles.noResultsContainer}>
                                <Ionicons name="search-outline" size={40} color={COLORS.text.tertiary} />
                                <Text style={styles.noResultsText}>Nenhuma squad encontrada</Text>
                            </View>
                        ) : (
                            <EmptyState onPress={() => setModalVisible(true)} />
                        )
                    }
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor="#6366F1"
                            colors={['#6366F1']}
                        />
                    }
                />

                {/* Create Modal */}
                <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrapper}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHandle} />

                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Nova Squad</Text>
                                <Pressable onPress={() => setModalVisible(false)} style={styles.modalClose}>
                                    <Ionicons name="close" size={22} color={COLORS.text.secondary} />
                                </Pressable>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Nome *</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Ex: Estudo de Cálculo"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    autoFocus
                                />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Descrição</Text>
                                <TextInput
                                    style={[styles.formInput, { height: 80 }]}
                                    value={newDescription}
                                    onChangeText={setNewDescription}
                                    placeholder="Breve descrição..."
                                    placeholderTextColor={COLORS.text.tertiary}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Cor</Text>
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
                                            {selectedColor === color && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Código (opcional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={customCode}
                                    onChangeText={(t) => setCustomCode(t.toUpperCase())}
                                    placeholder="Ex: CALC2024"
                                    placeholderTextColor={COLORS.text.tertiary}
                                    autoCapitalize="characters"
                                />
                            </View>

                            <Pressable style={styles.toggleRow} onPress={() => setIsPublic(!isPublic)}>
                                <View>
                                    <Text style={styles.toggleLabel}>Squad Pública</Text>
                                    <Text style={styles.toggleHint}>Visível na exploração</Text>
                                </View>
                                <View style={[styles.toggle, isPublic && styles.toggleActive]}>
                                    <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
                                </View>
                            </Pressable>

                            <Pressable
                                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                                onPress={handleCreateTeam}
                                disabled={creating}
                            >
                                {creating ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="rocket-outline" size={20} color="#FFF" />
                                        <Text style={styles.submitText}>Criar Squad</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// SQUAD CARD
// ============================================

function SquadCard({ team }: { team: TeamWithRole }) {
    const scale = useRef(new Animated.Value(1)).current;
    const color = team.color || SQUAD_COLORS[0];
    const initial = team.name.charAt(0).toUpperCase();

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    const roleLabel = team.role === 'owner' ? '👑 Owner' : team.role === 'admin' ? '⭐ Admin' : '👤 Membro';

    return (
        <Pressable onPress={() => router.push(`/team/${team.id}` as any)} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.squadCard, { transform: [{ scale }] }]}>
                <View style={[styles.squadAccent, { backgroundColor: color }]} />

                {team.icon_url ? (
                    <Image source={{ uri: team.icon_url }} style={styles.squadAvatar} />
                ) : (
                    <LinearGradient colors={[color, `${color}99`]} style={styles.squadAvatarPlaceholder}>
                        <Text style={styles.squadInitial}>{initial}</Text>
                    </LinearGradient>
                )}

                <View style={styles.squadContent}>
                    <Text style={styles.squadName} numberOfLines={1}>{team.name}</Text>
                    <Text style={styles.squadDescription} numberOfLines={1}>
                        {team.description || 'Sem descrição'}
                    </Text>
                    <Text style={styles.squadRole}>{roleLabel}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ onPress }: { onPress: () => void }) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={56} color={COLORS.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>Sem Squads</Text>
            <Text style={styles.emptySubtitle}>Cria ou entra numa squad para colaborar!</Text>
            <Pressable style={styles.emptyButton} onPress={onPress}>
                <Ionicons name="add" size={18} color="#FFF" />
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
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size['3xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Search
    searchContainer: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.lg,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
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

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    quickActionCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    quickActionLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    quickActionHint: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
    },
    sectionCount: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        backgroundColor: COLORS.surfaceMuted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },

    // List
    listContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: 100,
    },

    // No Results
    noResultsContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    noResultsText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.tertiary,
        marginTop: SPACING.md,
    },

    // Squad Card
    squadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    squadAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: RADIUS.xl,
        borderBottomLeftRadius: RADIUS.xl,
    },
    squadAvatar: {
        width: 52,
        height: 52,
        borderRadius: 16,
        marginRight: SPACING.lg,
    },
    squadAvatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
    },
    squadInitial: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    squadContent: {
        flex: 1,
    },
    squadName: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    squadDescription: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginBottom: 4,
    },
    squadRole: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.secondary,
    },

    // Empty
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: '#6366F1',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.xl,
    },
    emptyButtonText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // Modal
    modalWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        padding: SPACING.xl,
        paddingBottom: 50,
    },
    modalHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center',
        marginBottom: SPACING.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    modalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Form
    formSection: {
        marginBottom: SPACING.lg,
    },
    formLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    formInput: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },

    // Color Picker
    colorPicker: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
    },

    // Toggle
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.xl,
    },
    toggleLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    toggleHint: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceElevated,
        justifyContent: 'center',
        padding: 3,
    },
    toggleActive: {
        backgroundColor: '#6366F1',
    },
    toggleThumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FFF',
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },

    // Submit
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: '#6366F1',
        paddingVertical: SPACING.lg,
        borderRadius: RADIUS.xl,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
});
