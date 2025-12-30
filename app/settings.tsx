/**
 * Premium Settings Screen v2
 * Foco em Edição de Perfil + Preferências
 * Diferenciado do Profile - sem analytics duplicados
 */

import { supabase } from '@/lib/supabase';
import { COLORS, LAYOUT, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Tier } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';

// ============================================
// CONSTANTS
// ============================================

const TIER_CONFIG: Record<Tier, { emoji: string; gradient: [string, string] }> = {
    Bronze: { emoji: '🥉', gradient: ['#CD7F32', '#8B4513'] },
    Prata: { emoji: '🥈', gradient: ['#C0C0C0', '#808080'] },
    Ouro: { emoji: '🥇', gradient: ['#FFD700', '#FFA500'] },
    Platina: { emoji: '💎', gradient: ['#E5E4E2', '#A9A9A9'] },
    Diamante: { emoji: '👑', gradient: ['#B9F2FF', '#00CED1'] },
    Elite: { emoji: '🔥', gradient: ['#FF4500', '#8B0000'] },
};

const STATUS_OPTIONS = [
    { value: 'online', label: 'Online', color: '#10B981' },
    { value: 'away', label: 'Ausente', color: '#F59E0B' },
    { value: 'dnd', label: 'Não Perturbar', color: '#EF4444' },
    { value: 'offline', label: 'Invisível', color: '#6B7280' },
] as const;

// ============================================
// EDITABLE FIELD COMPONENT
// ============================================

function EditableField({
    icon,
    label,
    value,
    onPress,
    placeholder,
}: {
    icon: string;
    label: string;
    value: string;
    onPress: () => void;
    placeholder?: string;
}) {
    return (
        <Pressable style={styles.editableField} onPress={onPress}>
            <View style={styles.editableIcon}>
                <Ionicons name={icon as any} size={20} color="#6366F1" />
            </View>
            <View style={styles.editableContent}>
                <Text style={styles.editableLabel}>{label}</Text>
                <Text style={[styles.editableValue, !value && styles.editablePlaceholder]}>
                    {value || placeholder || 'Não definido'}
                </Text>
            </View>
            <Ionicons name="pencil" size={18} color={COLORS.text.tertiary} />
        </Pressable>
    );
}

// ============================================
// MENU ITEM COMPONENT
// ============================================

function MenuItem({
    icon,
    label,
    subtitle,
    onPress,
    color = '#6366F1',
    danger = false,
    rightElement,
}: {
    icon: string;
    label: string;
    subtitle?: string;
    onPress?: () => void;
    color?: string;
    danger?: boolean;
    rightElement?: React.ReactNode;
}) {
    return (
        <Pressable style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, { backgroundColor: danger ? '#EF444415' : `${color}15` }]}>
                <Ionicons name={icon as any} size={20} color={danger ? '#EF4444' : color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuLabel, danger && { color: '#EF4444' }]}>{label}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            {rightElement !== undefined ? rightElement : <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />}
        </Pressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SettingsScreen() {
    const { user, signOut } = useAuthContext();
    const { profile, refetchProfile } = useProfile();

    // Edit states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editField, setEditField] = useState<'name' | 'username' | 'email'>('name');
    const [editValue, setEditValue] = useState('');
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Preferences
    const [notifications, setNotifications] = useState(true);
    const [soundEffects, setSoundEffects] = useState(true);

    // Handlers
    const handlePickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permissão Necessária', 'Precisamos de acesso às fotos.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5, // Menor qualidade para ocupar menos espaço
                base64: true,
            });
            if (!result.canceled && result.assets[0]?.base64) {
                await saveAvatarAsDataUri(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
            }
        } catch (error: any) {
            console.error('Erro ao selecionar imagem:', error);
            Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        }
    };

    // Guarda avatar como Data URI directamente na BD (sem bucket)
    const saveAvatarAsDataUri = async (base64: string, mimeType: string) => {
        if (!user?.id) return;
        try {
            setUploadingAvatar(true);

            // Criar Data URI: data:image/jpeg;base64,/9j/4AAQ...
            const dataUri = `data:${mimeType};base64,${base64}`;

            // Guardar directamente no campo avatar_url
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: dataUri })
                .eq('id', user.id);

            if (error) throw error;

            await refetchProfile();
            Alert.alert('✅', 'Foto atualizada!');
        } catch (error: any) {
            console.error('Erro ao guardar avatar:', error);
            Alert.alert('Erro', error.message || 'Não foi possível atualizar a foto.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const openEditModal = (field: 'name' | 'username' | 'email') => {
        setEditField(field);
        if (field === 'name') setEditValue(profile?.full_name || '');
        else if (field === 'username') setEditValue(profile?.username || '');
        else setEditValue(user?.email || '');
        setEditModalVisible(true);
    };

    const handleSaveField = async () => {
        if (!user?.id) return;
        try {
            setSaving(true);
            if (editField === 'name') {
                await supabase.from('profiles').update({ full_name: editValue.trim() }).eq('id', user.id);
            } else if (editField === 'username') {
                const { error } = await supabase.from('profiles').update({ username: editValue.trim().toLowerCase() }).eq('id', user.id);
                if (error?.code === '23505') {
                    Alert.alert('Erro', 'Username já em uso.');
                    return;
                }
            }
            await refetchProfile();
            setEditModalVisible(false);
            Alert.alert('✅', 'Guardado!');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível guardar.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!user?.id) return;
        await supabase.from('profiles').update({ status }).eq('id', user.id);
        await refetchProfile();
        setStatusModalVisible(false);
    };

    const handleShareProfile = async () => {
        await Share.share({
            message: `Junta-te a mim no Escola+! 🎓\n@${profile?.username}\nhttps://escola.plus`,
        });
    };

    const handleSignOut = useCallback(async () => {
        Alert.alert('Terminar Sessão', 'Tens a certeza?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/login'); } },
        ]);
    }, [signOut]);

    const handleDeleteAccount = () => {
        Alert.alert('⚠️ Eliminar Conta', 'Esta ação é PERMANENTE e irá apagar todos os teus dados.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await supabase.rpc('delete_user');
                        await signOut();
                    } catch (e) {
                        Alert.alert('Erro', 'Contacta suporte@escola.plus');
                    }
                }
            },
        ]);
    };

    // Data
    const tier = (profile?.current_tier || 'Bronze') as Tier;
    const tierConfig = TIER_CONFIG[tier];
    const currentStatus = STATUS_OPTIONS.find(s => s.value === profile?.status) || STATUS_OPTIONS[0];
    const appVersion = Application.nativeApplicationVersion || '2.0.0';

    const getFieldLabel = () => {
        switch (editField) {
            case 'name': return 'Nome Completo';
            case 'username': return 'Username';
            case 'email': return 'Email';
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* ========== HEADER ========== */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Definições</Text>
                    <Pressable onPress={handleShareProfile} style={styles.shareButton}>
                        <Ionicons name="share-outline" size={22} color={COLORS.text.primary} />
                    </Pressable>
                </View>

                {/* ========== PROFILE PHOTO SECTION ========== */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>📷 Foto de Perfil</Text>
                    <View style={styles.photoCard}>
                        <Pressable onPress={handlePickImage} style={styles.photoContainer}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.photo} />
                            ) : (
                                <LinearGradient colors={tierConfig.gradient} style={styles.photoFallback}>
                                    <Text style={styles.photoInitial}>{profile?.username?.[0]?.toUpperCase() || '?'}</Text>
                                </LinearGradient>
                            )}
                            <View style={styles.photoEditBadge}>
                                {uploadingAvatar ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons name="camera" size={16} color="#FFF" />
                                )}
                            </View>
                        </Pressable>
                        <View style={styles.photoInfo}>
                            <Text style={styles.photoTitle}>Alterar Foto</Text>
                            <Text style={styles.photoSubtitle}>Toca na imagem para escolher uma nova foto de perfil</Text>
                            <Pressable style={styles.photoButton} onPress={handlePickImage}>
                                <Ionicons name="image-outline" size={16} color="#FFF" />
                                <Text style={styles.photoButtonText}>Escolher da Galeria</Text>
                            </Pressable>
                        </View>
                    </View>
                </Animated.View>

                {/* ========== PERSONAL INFO SECTION ========== */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>👤 Informações Pessoais</Text>
                    <View style={styles.editCard}>
                        <EditableField
                            icon="person-outline"
                            label="Nome Completo"
                            value={profile?.full_name || ''}
                            placeholder="Adiciona o teu nome"
                            onPress={() => openEditModal('name')}
                        />
                        <View style={styles.editDivider} />
                        <EditableField
                            icon="at"
                            label="Username"
                            value={profile?.username ? `@${profile.username}` : ''}
                            placeholder="Escolhe um username"
                            onPress={() => openEditModal('username')}
                        />
                        <View style={styles.editDivider} />
                        <Pressable style={styles.editableField} disabled>
                            <View style={styles.editableIcon}>
                                <Ionicons name="mail-outline" size={20} color="#6366F1" />
                            </View>
                            <View style={styles.editableContent}>
                                <Text style={styles.editableLabel}>Email</Text>
                                <Text style={styles.editableValue}>{user?.email || 'Não definido'}</Text>
                            </View>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            </View>
                        </Pressable>
                    </View>
                </Animated.View>

                {/* ========== STATUS SECTION ========== */}
                <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>🟢 Estado</Text>
                    <Pressable style={styles.statusCard} onPress={() => setStatusModalVisible(true)}>
                        <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
                        <View style={styles.statusContent}>
                            <Text style={styles.statusLabel}>{currentStatus.label}</Text>
                            <Text style={styles.statusSubtitle}>Toca para alterar o teu estado</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                    </Pressable>
                </Animated.View>

                {/* ========== PREFERENCES SECTION ========== */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>⚙️ Preferências</Text>
                    <View style={styles.menuCard}>
                        <View style={styles.switchItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.menuIconContainer, { backgroundColor: '#6366F115' }]}>
                                    <Ionicons name="notifications-outline" size={20} color="#6366F1" />
                                </View>
                                <View>
                                    <Text style={styles.menuLabel}>Notificações Push</Text>
                                    <Text style={styles.menuSubtitle}>Receber alertas de tarefas e mensagens</Text>
                                </View>
                            </View>
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: COLORS.surfaceMuted, true: '#6366F1' }}
                                thumbColor="#FFF"
                            />
                        </View>
                        <View style={styles.menuDivider} />
                        <View style={styles.switchItem}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.menuIconContainer, { backgroundColor: '#10B98115' }]}>
                                    <Ionicons name="volume-high-outline" size={20} color="#10B981" />
                                </View>
                                <View>
                                    <Text style={styles.menuLabel}>Efeitos Sonoros</Text>
                                    <Text style={styles.menuSubtitle}>Sons ao completar ações</Text>
                                </View>
                            </View>
                            <Switch
                                value={soundEffects}
                                onValueChange={setSoundEffects}
                                trackColor={{ false: COLORS.surfaceMuted, true: '#10B981' }}
                                thumbColor="#FFF"
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* ========== LINKS SECTION ========== */}
                <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>🔗 Atalhos</Text>
                    <View style={styles.menuCard}>
                        <MenuItem icon="trophy-outline" label="Conquistas" subtitle="Ver badges desbloqueados" color="#F59E0B" onPress={() => router.push('/badges')} />
                        <View style={styles.menuDivider} />
                        <MenuItem icon="storefront-outline" label="Loja" subtitle="Temas e personalização" color="#EC4899" onPress={() => router.push('/shop')} />
                        <View style={styles.menuDivider} />
                        <MenuItem icon="podium-outline" label="Leaderboard" subtitle="Ranking global" color="#6366F1" onPress={() => router.push('/leaderboard')} />
                    </View>
                </Animated.View>

                {/* ========== SUPPORT SECTION ========== */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>💬 Suporte</Text>
                    <View style={styles.menuCard}>
                        <MenuItem icon="mail-outline" label="Contactar Suporte" color="#6366F1" onPress={() => Linking.openURL('mailto:suporte@escola.plus')} />
                        <View style={styles.menuDivider} />
                        <MenuItem icon="help-circle-outline" label="FAQ" color="#F59E0B" onPress={() => Linking.openURL('https://escola.plus/faq')} />
                        <View style={styles.menuDivider} />
                        <MenuItem icon="shield-checkmark-outline" label="Privacidade" color="#10B981" onPress={() => Linking.openURL('https://escola.plus/privacidade')} />
                    </View>
                </Animated.View>

                {/* ========== ACCOUNT SECTION ========== */}
                <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>🔐 Conta</Text>
                    <View style={styles.menuCard}>
                        <MenuItem icon="log-out-outline" label="Terminar Sessão" danger onPress={handleSignOut} rightElement={null} />
                        <View style={styles.menuDivider} />
                        <MenuItem icon="trash-outline" label="Eliminar Conta" subtitle="Esta ação é permanente" danger onPress={handleDeleteAccount} rightElement={null} />
                    </View>
                </Animated.View>

                {/* Version */}
                <View style={styles.footer}>
                    <Text style={styles.versionText}>Escola+ v{appVersion}</Text>
                    <Text style={styles.userIdText}>ID: {user?.id?.slice(0, 8)}...</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ========== EDIT FIELD MODAL ========== */}
            <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setEditModalVisible(false)}>
                            <Text style={styles.modalCancel}>Cancelar</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>Editar {getFieldLabel()}</Text>
                        <Pressable onPress={handleSaveField} disabled={saving || editField === 'email'}>
                            {saving ? <ActivityIndicator size="small" color="#6366F1" /> : (
                                <Text style={[styles.modalSave, editField === 'email' && { opacity: 0.3 }]}>Guardar</Text>
                            )}
                        </Pressable>
                    </View>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalLabel}>{getFieldLabel()}</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            placeholder={`Insere o teu ${getFieldLabel().toLowerCase()}`}
                            placeholderTextColor={COLORS.text.tertiary}
                            autoCapitalize={editField === 'username' ? 'none' : 'words'}
                            editable={editField !== 'email'}
                            autoFocus
                        />
                        {editField === 'username' && (
                            <Text style={styles.modalHint}>O username deve ser único e sem espaços</Text>
                        )}
                        {editField === 'email' && (
                            <Text style={styles.modalHint}>O email não pode ser alterado por motivos de segurança</Text>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ========== STATUS MODAL ========== */}
            <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
                <Pressable style={styles.statusModalOverlay} onPress={() => setStatusModalVisible(false)}>
                    <View style={styles.statusModalContent}>
                        <Text style={styles.statusModalTitle}>Escolhe o teu Estado</Text>
                        {STATUS_OPTIONS.map((option) => (
                            <Pressable
                                key={option.value}
                                style={[styles.statusOption, profile?.status === option.value && styles.statusOptionActive]}
                                onPress={() => handleUpdateStatus(option.value)}
                            >
                                <View style={[styles.statusOptionDot, { backgroundColor: option.color }]} />
                                <Text style={styles.statusOptionText}>{option.label}</Text>
                                {profile?.status === option.value && <Ionicons name="checkmark-circle" size={20} color="#6366F1" />}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>
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
    scrollView: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: LAYOUT.screenPadding,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },
    shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Section
    section: {
        paddingHorizontal: LAYOUT.screenPadding,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.md,
    },

    // Photo Card
    photoCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xl,
        ...SHADOWS.sm,
    },
    photoContainer: {
        position: 'relative',
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#6366F1',
    },
    photoFallback: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    photoInitial: {
        fontSize: 32,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    photoEditBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    photoInfo: {
        flex: 1,
    },
    photoTitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    photoSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.md,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: '#6366F1',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        alignSelf: 'flex-start',
    },
    photoButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },

    // Edit Card
    editCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    editableField: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
    },
    editableIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6366F115',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editableContent: {
        flex: 1,
    },
    editableLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editableValue: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    editablePlaceholder: {
        color: COLORS.text.tertiary,
        fontStyle: 'italic',
    },
    editDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 68,
    },
    verifiedBadge: {
        backgroundColor: '#10B98120',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },

    // Status Card
    statusCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.sm,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusContent: {
        flex: 1,
    },
    statusLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    statusSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },

    // Menu Card
    menuCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
        ...SHADOWS.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuContent: {
        flex: 1,
    },
    menuLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
    },
    menuSubtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: 2,
    },
    menuDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 68,
    },
    switchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    versionText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
    },
    userIdText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
    },

    // Edit Modal
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    modalCancel: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
    },
    modalSave: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#6366F1',
    },
    modalContent: {
        padding: SPACING.xl,
    },
    modalLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
    },
    modalInput: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        fontSize: TYPOGRAPHY.size.lg,
        color: COLORS.text.primary,
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    modalHint: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        marginTop: SPACING.md,
    },

    // Status Modal
    statusModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: LAYOUT.screenPadding,
    },
    statusModalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        width: '100%',
        padding: SPACING.xl,
    },
    statusModalTitle: {
        fontSize: TYPOGRAPHY.size.xl,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xl,
        textAlign: 'center',
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        padding: SPACING.lg,
        borderRadius: RADIUS.xl,
        marginBottom: SPACING.sm,
    },
    statusOptionActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    statusOptionDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusOptionText: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.primary,
        flex: 1,
    },
});
