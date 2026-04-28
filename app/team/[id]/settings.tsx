/**
 * Team Settings Screen
 * Ecrã de definições da equipa com gestão de privacidade, código e perigo
 */

import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS as borderRadius, SHADOWS as shadows, SPACING as spacing, TYPOGRAPHY as typography } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { notifyTeamUpdated } from '@/services/teamNotifications';
import { TeamRole } from '@/types/database.types';

// Compatibility layer
const colors = {
    ...COLORS,
    divider: COLORS.surfaceElevated,
    surfaceSubtle: COLORS.surfaceMuted,
    success: { primary: '#10B981' },
    warning: { primary: '#F59E0B' },
    danger: { primary: '#EF4444' },
};

// ============================================
// TYPES
// ============================================

interface TeamData {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    color: string;
    invite_code: string;
    is_public: boolean;
    owner_id: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TeamSettingsScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthContext();
    const { profile } = useProfile();
    const { showAlert } = useAlert();

    // Estados
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [team, setTeam] = useState<TeamData | null>(null);
    const [userRole, setUserRole] = useState<TeamRole | null>(null);

    // Estados editáveis
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Derivados
    const isOwner = userRole === 'owner';
    const isAdmin = userRole === 'admin';
    const canEdit = isOwner || isAdmin;

    // ============================================
    // LOAD DATA
    // ============================================

    const loadTeamData = useCallback(async () => {
        if (!teamId || !user?.id) return;

        try {
            // Buscar dados da equipa
            const { data: teamData, error: teamError } = await supabase
                .from('teams')
                .select('*')
                .eq('id', teamId)
                .single();

            if (teamError) throw teamError;
            setTeam(teamData);
            setEditName(teamData.name);
            setEditDescription(teamData.description || '');
            setEditIsPublic(teamData.is_public);

            // Buscar role do utilizador
            const { data: memberData } = await supabase
                .from('team_members')
                .select('role')
                .eq('team_id', teamId)
                .eq('user_id', user.id)
                .single();

            if (memberData) {
                setUserRole(memberData.role as TeamRole);
            }
        } catch (err) {
            console.error('Erro ao carregar equipa:', err);
            showAlert({ title: 'Erro', message: 'Não foi possível carregar as definições.' });
        } finally {
            setLoading(false);
        }
    }, [teamId, user?.id]);

    useEffect(() => {
        loadTeamData();
    }, [loadTeamData]);

    // Verificar mudanças
    useEffect(() => {
        if (!team) return;
        const changed =
            editName !== team.name ||
            editDescription !== (team.description || '') ||
            editIsPublic !== team.is_public;
        setHasChanges(changed);
    }, [editName, editDescription, editIsPublic, team]);

    // ============================================
    // SAVE CHANGES
    // ============================================

    const handleSaveChanges = async () => {
        console.log('📝 handleSaveChanges chamado');
        console.log('team:', team?.id);
        console.log('canEdit:', canEdit);
        console.log('editName:', editName);
        console.log('editDescription:', editDescription);
        console.log('editIsPublic:', editIsPublic);

        if (!team || !canEdit) {
            console.log('❌ Bloqueado: team ou canEdit falso');
            return;
        }

        if (!editName.trim()) {
            showAlert({ title: 'Erro', message: 'O nome da equipa é obrigatório.' });
            return;
        }

        setSaving(true);
        try {
            console.log('📤 A fazer update...');
            const { data, error } = await supabase
                .from('teams')
                .update({
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                    is_public: editIsPublic,
                })
                .eq('id', team.id)
                .select();

            console.log('📥 Resultado:', { data, error });

            if (error) throw error;

            setTeam({
                ...team,
                name: editName.trim(),
                description: editDescription.trim() || null,
                is_public: editIsPublic,
            });
            setHasChanges(false);

            // Notificar outros membros das alterações
            notifyTeamUpdated({
                teamId: team.id,
                teamName: editName.trim(),
                changerName: profile?.full_name || profile?.username || 'Alguém',
                changerId: user?.id || '',
                changeDescription: 'atualizou as definições da equipa',
            });

            showAlert({ title: '✅ Guardado', message: 'As alterações foram guardadas.' });
        } catch (err: any) {
            console.error('❌ Erro ao guardar:', err);
            showAlert({ title: 'Erro', message: err.message || 'Não foi possível guardar as alterações.' });
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // COPY INVITE CODE
    // ============================================

    const handleCopyCode = async () => {
        if (!team?.invite_code) return;
        await Clipboard.setStringAsync(team.invite_code);
        showAlert({ title: '✅ Copiado!', message: `Código "${team.invite_code}" copiado para a área de transferência.` });
    };

    // ============================================
    // GENERATE NEW CODE
    // ============================================

    const handleGenerateNewCode = () => {
        showAlert({
            title: 'Gerar Novo Código?',
            message: 'O código atual deixará de funcionar. Continuar?',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Gerar',
                    onPress: async () => {
                        try {
                            // Gerar novo código aleatório
                            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

                            const { data, error } = await supabase
                                .from('teams')
                                .update({ invite_code: newCode })
                                .eq('id', team!.id)
                                .select('invite_code')
                                .single();

                            if (error) throw error;

                            setTeam({ ...team!, invite_code: data.invite_code });
                            showAlert({ title: '✅ Novo Código', message: `Código atualizado para: ${data.invite_code}` });
                        } catch (err: any) {
                            console.error('Erro ao gerar código:', err);
                            if (err.code === '23505') {
                                // Colisão de código, tentar novamente
                                handleGenerateNewCode();
                            } else {
                                showAlert({ title: 'Erro', message: 'Não foi possível gerar novo código.' });
                            }
                        }
                    },
                },
            ]
        });
    };

    // ============================================
    // CHANGE AVATAR
    // ============================================

    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handleChangeAvatar = async () => {
        if (!canEdit || !team) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3, // Qualidade mais baixa para garantir que o ficheiro é pequeno
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setUploadingAvatar(true);

            try {
                // Preparar o ficheiro para upload
                const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `${team.id}/avatar.${fileExt}`;
                const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

                // Método ultra-robusto: Fetch Blob direto da URI (evita erros de Content-Type)
                const response = await fetch(asset.uri);
                const blob = await response.blob();

                // Fazer upload para Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('team-avatars')
                    .upload(fileName, blob, {
                        contentType,
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                // Obter URL pública
                const { data: urlData } = supabase.storage
                    .from('team-avatars')
                    .getPublicUrl(fileName);

                const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

                // Atualizar na base de dados
                const { error: updateError } = await supabase
                    .from('teams')
                    .update({ icon_url: publicUrl })
                    .eq('id', team.id);

                if (updateError) throw updateError;

                // Atualizar estado local
                setTeam({ ...team, icon_url: publicUrl });
                showAlert({ title: '✅ Sucesso', message: 'Avatar da equipa atualizado!' });
            } catch (err: any) {
                console.error('Erro ao fazer upload:', err);
                showAlert({ title: 'Erro', message: err.message || 'Não foi possível atualizar o avatar.' });
            } finally {
                setUploadingAvatar(false);
            }
        }
    };

    // ============================================
    // LEAVE TEAM
    // ============================================

    const handleLeaveTeam = () => {
        if (isOwner) {
            showAlert({
                title: 'Não podes sair',
                message: 'Como owner, tens que transferir a posse ou apagar a equipa.'
            });
            return;
        }

        showAlert({
            title: 'Sair da Equipa?',
            message: `Tens a certeza que queres sair de "${team?.name}"?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('team_members')
                                .delete()
                                .eq('team_id', teamId)
                                .eq('user_id', user!.id);

                            if (error) throw error;

                            showAlert({
                                title: '👋 Saíste',
                                message: 'Deixaste a equipa.',
                                buttons: [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                            });
                        } catch (err) {
                            console.error('Erro ao sair:', err);
                            showAlert({ title: 'Erro', message: 'Não foi possível sair da equipa.' });
                        }
                    },
                },
            ]
        });
    };

    // ============================================
    // DELETE TEAM
    // ============================================

    const handleDeleteTeam = () => {
        if (!isOwner) return;

        showAlert({
            title: '⚠️ Apagar Equipa',
            message: `Esta ação é IRREVERSÍVEL. Todos os dados serão perdidos.`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Apagar Permanentemente',
                    style: 'destructive',
                    onPress: () => {
                        showAlert({
                            title: '🔴 Confirmação Final',
                            message: `Escreve o nome da equipa para confirmar:\n\n"${team?.name}"`,
                            buttons: [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                    text: 'Apagar',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            // Apagar membros primeiro
                                            await supabase
                                                .from('team_members')
                                                .delete()
                                                .eq('team_id', teamId);

                                            // Apagar canais
                                            await supabase
                                                .from('channels')
                                                .delete()
                                                .eq('team_id', teamId);

                                            // Apagar equipa
                                            const { error } = await supabase
                                                .from('teams')
                                                .delete()
                                                .eq('id', teamId);

                                            if (error) throw error;

                                            showAlert({
                                                title: '🗑️ Apagado',
                                                message: 'A equipa foi eliminada.',
                                                buttons: [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
                                            });
                                        } catch (err) {
                                            console.error('Erro ao apagar:', err);
                                            showAlert({ title: 'Erro', message: 'Não foi possível apagar a equipa.' });
                                        }
                                    },
                                },
                            ]
                        });
                    },
                },
            ]
        });
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

    if (!team) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Equipa não encontrada</Text>
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
                <Text style={styles.headerTitle}>Definições</Text>
                {hasChanges && canEdit && (
                    <Pressable
                        style={styles.saveButton}
                        onPress={handleSaveChanges}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={colors.text.inverse} />
                        ) : (
                            <Text style={styles.saveButtonText}>Guardar</Text>
                        )}
                    </Pressable>
                )}
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Avatar & Info */}
                <View style={styles.avatarSection}>
                    <Pressable onPress={handleChangeAvatar} disabled={!canEdit}>
                        {team.icon_url ? (
                            <Image source={{ uri: team.icon_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: team.color }]}>
                                <Text style={styles.avatarText}>
                                    {team.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {canEdit && (
                            <View style={styles.avatarEditBadge}>
                                {uploadingAvatar ? (
                                    <ActivityIndicator size="small" color={colors.text.inverse} />
                                ) : (
                                    <Ionicons name="camera" size={14} color={colors.text.inverse} />
                                )}
                            </View>
                        )}
                    </Pressable>
                </View>

                {/* Nome e Descrição */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Informações</Text>

                    <Text style={styles.inputLabel}>Nome da Equipa</Text>
                    <TextInput
                        style={[styles.input, !canEdit && styles.inputDisabled]}
                        value={editName}
                        onChangeText={setEditName}
                        editable={canEdit}
                        placeholder="Nome"
                        placeholderTextColor={colors.text.tertiary}
                    />

                    <Text style={styles.inputLabel}>Descrição</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, !canEdit && styles.inputDisabled]}
                        value={editDescription}
                        onChangeText={setEditDescription}
                        editable={canEdit}
                        placeholder="Descrição (opcional)"
                        placeholderTextColor={colors.text.tertiary}
                        multiline
                    />
                </View>

                {/* Acesso e Privacidade - Apenas Admin/Owner */}
                {canEdit && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Acesso e Privacidade</Text>

                        {/* Código de Convite */}
                        <Text style={styles.inputLabel}>Código de Convite</Text>
                        <View style={styles.codeRow}>
                            <View style={styles.codeContainer}>
                                <Text style={styles.codeText}>{team.invite_code}</Text>
                            </View>
                            <Pressable style={styles.codeButton} onPress={handleCopyCode}>
                                <Ionicons name="copy-outline" size={20} color={colors.accent.primary} />
                            </Pressable>
                            <Pressable style={styles.codeButton} onPress={handleGenerateNewCode}>
                                <Ionicons name="refresh-outline" size={20} color={colors.text.secondary} />
                            </Pressable>
                        </View>

                        {/* QR Code da Equipa */}
                        <View style={styles.qrSection}>
                            <View style={styles.qrCodeWrapper}>
                                <QRCode
                                    value={`escolaa://team/${team.invite_code}`}
                                    size={160}
                                    color="#000"
                                    backgroundColor="#FFF"
                                />
                            </View>
                            <Text style={styles.qrHint}>
                                Partilha este QR Code para outros entrarem na equipa
                            </Text>

                            {/* Botão de Partilha Viral */}
                            <Pressable
                                style={styles.shareInviteButton}
                                onPress={async () => {
                                    try {
                                        await Share.share({
                                            message: `🎉 Junta-te à minha Squad "${team.name}" na Escola+!\n\n👉 Abre este link: escolaa://team/${team.invite_code}\n\nOu usa o código: ${team.invite_code}`,
                                        });
                                    } catch (err) {
                                        console.error('Erro ao partilhar:', err);
                                    }
                                }}
                            >
                                <Ionicons name="share-social" size={20} color={colors.text.inverse} />
                                <Text style={styles.shareInviteButtonText}>Convidar Amigos</Text>
                            </Pressable>
                        </View>

                        {/* Toggle Visibilidade */}
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                                <Ionicons
                                    name={editIsPublic ? 'globe-outline' : 'lock-closed-outline'}
                                    size={20}
                                    color={editIsPublic ? colors.success.primary : colors.text.secondary}
                                />
                                <View style={styles.toggleTextContainer}>
                                    <Text style={styles.toggleTitle}>
                                        {editIsPublic ? 'Equipa Pública' : 'Equipa Privada'}
                                    </Text>
                                    <Text style={styles.toggleSubtitle}>
                                        {editIsPublic
                                            ? 'Visível na lista de "Explorar"'
                                            : 'Só entra quem tiver o código'}
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                style={[styles.toggleSwitch, editIsPublic && styles.toggleSwitchActive]}
                                onPress={() => setEditIsPublic(!editIsPublic)}
                            >
                                <View style={[styles.toggleThumb, editIsPublic && styles.toggleThumbActive]} />
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Gestão */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Gestão</Text>

                    <Pressable
                        style={styles.menuItem}
                        onPress={() => router.push(`/team/${teamId}/members` as any)}
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: colors.accent.subtle }]}>
                                <Ionicons name="people-outline" size={20} color={colors.accent.primary} />
                            </View>
                            <Text style={styles.menuItemText}>Gerir Membros</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                    </Pressable>

                    <Pressable
                        style={styles.menuItem}
                        onPress={() => router.push(`/team/${teamId}/channels` as any)}
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: `${colors.warning.primary}20` }]}>
                                <Ionicons name="chatbubbles-outline" size={20} color={colors.warning.primary} />
                            </View>
                            <Text style={styles.menuItemText}>Canais</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                    </Pressable>
                </View>

                {/* Zona de Perigo */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.danger.primary }]}>
                        Zona de Perigo
                    </Text>

                    {!isOwner && (
                        <Pressable style={styles.dangerButton} onPress={handleLeaveTeam}>
                            <Ionicons name="exit-outline" size={20} color={colors.danger.primary} />
                            <Text style={styles.dangerButtonText}>Sair da Equipa</Text>
                        </Pressable>
                    )}

                    {isOwner && (
                        <Pressable
                            style={[styles.dangerButton, styles.dangerButtonDestructive]}
                            onPress={handleDeleteTeam}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.text.inverse} />
                            <Text style={[styles.dangerButtonText, { color: colors.text.inverse }]}>
                                Apagar Equipa
                            </Text>
                        </Pressable>
                    )}
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
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
    errorText: {
        fontSize: typography.size.base,
        color: colors.text.tertiary,
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
    headerTitle: {
        flex: 1,
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    saveButton: {
        backgroundColor: colors.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    saveButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },

    // Avatar Section
    avatarSection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.surface,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: typography.weight.bold,
        color: colors.text.inverse,
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },

    // Section
    section: {
        backgroundColor: colors.surface,
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.text.tertiary,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    // Inputs
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    inputDisabled: {
        opacity: 0.6,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },

    // Code Row
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    codeContainer: {
        flex: 1,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    codeText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        letterSpacing: 2,
        textAlign: 'center',
    },
    codeButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Toggle
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

    // Menu Items
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuItemText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.medium,
        color: colors.text.primary,
    },

    // Danger Zone
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.danger.primary,
        marginTop: spacing.sm,
    },
    dangerButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.danger.primary,
    },
    dangerButtonDestructive: {
        backgroundColor: colors.danger.primary,
        borderColor: colors.danger.primary,
    },

    // QR Code
    qrSection: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        marginTop: spacing.md,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.lg,
    },
    qrCodeWrapper: {
        padding: spacing.md,
        backgroundColor: '#FFF',
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    qrHint: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Share Invite Button
    shareInviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    shareInviteButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },

    bottomSpacer: {
        height: spacing.xl,
    },
});
