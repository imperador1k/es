/**
 * Premium Settings Screen - REDESIGNED
 * Layout: Grouped Inset Cards (Diferente do Profile)
 * Mantém TODA a lógica original, apenas muda o design
 */

import { SupportModal } from '@/components/SupportModal';
import { Toast, ToastType } from '@/components/ui/Toast';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@/constants/legal';
import { supabase } from '@/lib/supabase';
import { COLORS, LAYOUT, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { usePresenceContext } from '@/providers/PresenceProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as Application from 'expo-application';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';
import LegalMarkdown from 'react-native-markdown-display';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// CONSTANTS
// ============================================

const STATUS_OPTIONS = [
    { value: 'online', label: 'Online', color: '#10B981', description: 'Visível para todos' },
    { value: 'away', label: 'Ausente', color: '#F59E0B', description: 'Mostrar que estás ocupado' },
    { value: 'dnd', label: 'Não Perturbar', color: '#EF4444', description: 'Sem notificações' },
] as const;

const FAQ_DATA = [
    { id: 'xp', question: 'Como ganho XP?', answer: 'Ganhas XP ao completar tarefas, assistir a aulas, participar em salas de estudo e usar o Pomodoro.', icon: 'star', color: '#FFD700' },
    { id: 'streak', question: 'O que são as Streaks?', answer: 'As Streaks representam os dias consecutivos em que estiveste ativo na app.', icon: 'flame', color: '#F59E0B' },
    { id: 'powerups', question: 'Como funcionam os Power-ups?', answer: 'Os Power-ups podem ser comprados na Loja usando Moedas Escola+.', icon: 'flash', color: '#6366F1' },
    { id: 'privacy', question: 'Os meus dados estão seguros?', answer: 'Sim! Utilizamos encriptação de ponta a ponta e o Supabase para segurança.', icon: 'shield-checkmark', color: '#10B981' }
];

// ============================================
// GROUPED CARD COMPONENTS
// ============================================

interface SettingsRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    label: string;
    subtitle?: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    isLast?: boolean;
    danger?: boolean;
}

function SettingsRow({ icon, iconColor, label, subtitle, value, onPress, rightElement, isLast, danger }: SettingsRowProps) {
    const displayColor = danger ? '#EF4444' : iconColor;
    return (
        <Pressable
            style={({ pressed }) => [styles.settingsRow, !isLast && styles.settingsRowBorder, pressed && onPress && styles.settingsRowPressed]}
            onPress={onPress}
            disabled={!onPress && !rightElement}
        >
            <View style={[styles.rowIcon, { backgroundColor: `${displayColor}15` }]}>
                <Ionicons name={icon} size={18} color={displayColor} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
                {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
            </View>
            {value && <Text style={styles.rowValue}>{value}</Text>}
            {rightElement || (onPress && <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />)}
        </Pressable>
    );
}

function SettingsGroup({ title, children, delay = 0 }: { title?: string; children: React.ReactNode; delay?: number }) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.groupContainer}>
            {title && <Text style={styles.groupTitle}>{title}</Text>}
            <View style={styles.groupCard}>{children}</View>
        </Animated.View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SettingsScreen() {
    const { user, signOut } = useAuthContext();
    const { profile, refetchProfile } = useProfile();
    const { showAlert } = useAlert();
    const { setStatus, preferredStatus } = usePresenceContext();

    // Edit states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editField, setEditField] = useState<'name' | 'username' | 'email'>('name');
    const [editValue, setEditValue] = useState('');
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [soundEffects, setSoundEffects] = useState(true);
    const [faqModalVisible, setFaqModalVisible] = useState(false);
    const [supportModalVisible, setSupportModalVisible] = useState(false);
    const [legalModalVisible, setLegalModalVisible] = useState(false);
    const [legalType, setLegalType] = useState<'terms' | 'privacy'>('terms');
    const [supportSubject, setSupportSubject] = useState('Bug');
    const [supportMessage, setSupportMessage] = useState('');
    const [sendingSupport, setSendingSupport] = useState(false);

    // Toast State
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<ToastType>('info');

    const showToast = (type: ToastType, message: string) => {
        setToastType(type);
        setToastMessage(message);
        setToastVisible(true);
    };

    // ========== HANDLERS (Mantidos do original) ==========

    const handlePickImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                showAlert({ title: 'Permissão Necessária', message: 'Precisamos de acesso às fotos.' });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });
            if (!result.canceled && result.assets[0]?.base64) {
                await saveAvatarAsDataUri(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
            }
        } catch (error: any) {
            console.error('Erro ao selecionar imagem:', error);
            showToast('error', 'Não foi possível selecionar a imagem.');
        }
    };

    const saveAvatarAsDataUri = async (base64: string, mimeType: string) => {
        if (!user?.id) return;
        try {
            setUploadingAvatar(true);

            // 1. Converter base64 para ArrayBuffer
            const fileData = decode(base64);

            // 2. Gerar nome único (timestamp) para garantir que o URL muda e invalida cache antigo
            // MAS mantemos a consistência de ser um URL público
            const fileName = `${user.id}/${Date.now()}.png`;

            // 3. Upload para o bucket 'avatars'
            const { error: uploadError } = await supabase
                .storage
                .from('avatars')
                .upload(fileName, fileData, {
                    contentType: mimeType,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 4. Obter URL Público
            const { data: { publicUrl } } = supabase
                .storage
                .from('avatars')
                .getPublicUrl(fileName);

            // 5. Atualizar perfil com o novo URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            await refetchProfile();
            showToast('success', 'Foto atualizada!');
        } catch (error: any) {
            console.error('Erro ao guardar avatar:', error);
            showToast('error', error.message || 'Não foi possível atualizar a foto.');
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
                    showToast('error', 'Username já em uso.');
                    return;
                }
            }
            await refetchProfile();
            setEditModalVisible(false);
            showToast('success', `${getFieldLabel()} atualizado!`);
        } catch (error) {
            showToast('error', 'Não foi possível guardar.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (status: 'online' | 'away' | 'dnd') => {
        try {
            await setStatus(status);
            await refetchProfile();
            setStatusModalVisible(false);
            showToast('success', 'Status atualizado!');
        } catch (error) {
            showToast('error', 'Erro ao atualizar status.');
        }
    };

    const handleSendSupportTicket = async () => {
        if (!supportMessage.trim()) {
            showToast('error', 'Por favor escreve uma mensagem.');
            return;
        }
        try {
            setSendingSupport(true);
            const { error } = await supabase.functions.invoke('send-support-ticket', {
                body: { user_email: user?.email, user_id: user?.id, subject: supportSubject, message: supportMessage.trim() },
            });
            if (error) throw error;
            showToast('success', 'Ticket enviado!');
            setSupportModalVisible(false);
            setSupportMessage('');
        } catch (error: any) {
            console.error('Erro ao enviar ticket:', error);
            showToast('error', 'Erro ao enviar ticket.');
        } finally {
            setSendingSupport(false);
        }
    };

    const handleShareProfile = async () => {
        await Share.share({ message: `Junta-te a mim no Escola+! 🎓\n@${profile?.username}\nhttps://escola.plus` });
    };

    const handleSignOut = useCallback(async () => {
        showAlert({
            title: 'Terminar Sessão',
            message: 'Tens a certeza?',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)/login'); } },
            ]
        });
    }, [signOut, showAlert]);

    const handleDeleteAccount = () => {
        showAlert({
            title: '⚠️ Eliminar Conta',
            message: 'Esta ação é PERMANENTE e irá apagar todos os teus dados.',
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive', onPress: async () => {
                        try {
                            await supabase.rpc('delete_user_account');
                            await signOut();
                            router.replace('/(auth)/login');
                        } catch (e) {
                            console.error('Erro ao eliminar conta:', e);
                            showAlert({ title: 'Erro', message: 'Não foi possível eliminar a conta.' });
                        }
                    }
                },
            ]
        });
    };

    const currentStatus = STATUS_OPTIONS.find(s => s.value === preferredStatus) || STATUS_OPTIONS[0];
    const appVersion = Application.nativeApplicationVersion || '2.0.0';
    const getFieldLabel = () => {
        switch (editField) {
            case 'name': return 'Nome Completo';
            case 'username': return 'Username';
            case 'email': return 'Email';
        }
    };

    // ========== RENDER ==========

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ========== HEADER ========== */}
                <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Definições</Text>
                        <Text style={styles.headerSubtitle}>Gere a tua conta e preferências</Text>
                    </View>
                </Animated.View>

                {/* ========== PERFIL QUICK EDIT ========== */}
                <SettingsGroup title="PERFIL" delay={50}>
                    <Pressable style={styles.profileRow} onPress={handlePickImage}>
                        <View style={styles.profileAvatarWrap}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
                            ) : (
                                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.profileAvatarFallback}>
                                    <Text style={styles.profileInitial}>{profile?.username?.[0]?.toUpperCase() || '?'}</Text>
                                </LinearGradient>
                            )}
                            {uploadingAvatar ? (
                                <View style={styles.avatarBadge}><ActivityIndicator size="small" color="#FFF" /></View>
                            ) : (
                                <View style={styles.avatarBadge}><Ionicons name="camera" size={12} color="#FFF" /></View>
                            )}
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{profile?.full_name || profile?.username || 'Utilizador'}</Text>
                            <Text style={styles.profileEmail}>{user?.email}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
                    </Pressable>
                </SettingsGroup>

                {/* ========== INFORMAÇÕES PESSOAIS ========== */}
                <SettingsGroup title="INFORMAÇÕES PESSOAIS" delay={100}>
                    <SettingsRow icon="person" iconColor="#6366F1" label="Nome Completo" value={profile?.full_name || 'Não definido'} onPress={() => openEditModal('name')} />
                    <SettingsRow icon="at" iconColor="#8B5CF6" label="Username" value={profile?.username ? `@${profile.username}` : 'Não definido'} onPress={() => openEditModal('username')} />
                    <SettingsRow icon="mail" iconColor="#10B981" label="Email" value={user?.email || ''} rightElement={<View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={16} color="#10B981" /></View>} isLast />
                </SettingsGroup>

                {/* ========== ESTADO ONLINE ========== */}
                <SettingsGroup title="PRESENÇA" delay={150}>
                    <Pressable style={[styles.settingsRow, styles.statusRow]} onPress={() => setStatusModalVisible(true)}>
                        <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Estado Online</Text>
                            <Text style={styles.rowSubtitle}>{currentStatus.label} · {currentStatus.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                    </Pressable>
                </SettingsGroup>

                {/* ========== PREFERÊNCIAS ========== */}
                <SettingsGroup title="PREFERÊNCIAS" delay={200}>
                    <SettingsRow icon="notifications" iconColor="#EC4899" label="Notificações Push" subtitle="Tarefas, mensagens, lembretes" onPress={() => router.push('/notifications')} />
                    <View style={styles.switchRow}>
                        <View style={[styles.rowIcon, { backgroundColor: '#10B98115' }]}>
                            <Ionicons name="volume-high" size={18} color="#10B981" />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.rowLabel}>Efeitos Sonoros</Text>
                            <Text style={styles.rowSubtitle}>Sons ao completar ações</Text>
                        </View>
                        <Switch value={soundEffects} onValueChange={setSoundEffects} trackColor={{ false: '#3A3A4A', true: '#10B981' }} thumbColor="#FFF" />
                    </View>
                </SettingsGroup>

                {/* ========== ATALHOS ========== */}
                <SettingsGroup title="ATALHOS" delay={250}>
                    <SettingsRow icon="trophy" iconColor="#F59E0B" label="Conquistas" subtitle="Badges desbloqueados" onPress={() => router.push('/badges')} />
                    <SettingsRow icon="storefront" iconColor="#EC4899" label="Loja" subtitle="Temas e personalização" onPress={() => router.push('/shop')} />
                    <SettingsRow icon="podium" iconColor="#6366F1" label="Leaderboard" subtitle="Ranking global" onPress={() => router.push('/leaderboard')} />
                    <SettingsRow icon="share-social" iconColor="#3B82F6" label="Partilhar Perfil" onPress={handleShareProfile} isLast />
                </SettingsGroup>

                {/* ========== SUPORTE ========== */}
                <SettingsGroup title="SUPORTE" delay={300}>
                    <SettingsRow icon="heart" iconColor="#EC4899" label="Apoiar o Projeto" subtitle="Oferece um café ❤️" onPress={() => setSupportModalVisible(true)} />
                    <SettingsRow icon="help-circle" iconColor="#F59E0B" label="FAQ" subtitle="Perguntas frequentes" onPress={() => setFaqModalVisible(true)} />
                    <SettingsRow icon="document-text" iconColor="#8B5CF6" label="Termos de Serviço" onPress={() => { setLegalType('terms'); setLegalModalVisible(true); }} />
                    <SettingsRow icon="shield-checkmark" iconColor="#10B981" label="Política de Privacidade" onPress={() => { setLegalType('privacy'); setLegalModalVisible(true); }} isLast />
                </SettingsGroup>

                {/* ========== CONTA & SEGURANÇA ========== */}
                <SettingsGroup title="CONTA" delay={350}>
                    <SettingsRow icon="shield-half" iconColor="#6366F1" label="Utilizadores Bloqueados" onPress={() => router.push('/settings/user-blocks' as any)} />
                    <SettingsRow icon="log-out" iconColor="#EF4444" label="Terminar Sessão" onPress={handleSignOut} danger />
                    <SettingsRow icon="trash" iconColor="#EF4444" label="Eliminar Conta" subtitle="Ação permanente" onPress={handleDeleteAccount} danger isLast />
                </SettingsGroup>

                {/* ========== VERSION ========== */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
                    <Text style={styles.versionText}>Escola+ v{appVersion}</Text>
                    <Text style={styles.userIdText}>ID: {user?.id?.slice(0, 8)}...</Text>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ========== MODALS (Mantidos) ========== */}

            {/* Edit Field Modal */}
            <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setEditModalVisible(false)}><Text style={styles.modalCancel}>Cancelar</Text></Pressable>
                        <Text style={styles.modalTitle}>Editar {getFieldLabel()}</Text>
                        <Pressable onPress={handleSaveField} disabled={saving || editField === 'email'}>
                            {saving ? <ActivityIndicator size="small" color="#6366F1" /> : <Text style={[styles.modalSave, editField === 'email' && { opacity: 0.3 }]}>Guardar</Text>}
                        </Pressable>
                    </View>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalLabel}>{getFieldLabel()}</Text>
                        <TextInput style={styles.modalInput} value={editValue} onChangeText={setEditValue} placeholder={`Insere o teu ${getFieldLabel().toLowerCase()}`} placeholderTextColor={COLORS.text.tertiary} autoCapitalize={editField === 'username' ? 'none' : 'words'} editable={editField !== 'email'} autoFocus />
                        {editField === 'username' && <Text style={styles.modalHint}>O username deve ser único e sem espaços</Text>}
                        {editField === 'email' && <Text style={styles.modalHint}>O email não pode ser alterado por motivos de segurança</Text>}
                    </View>
                </View>
            </Modal>

            {/* Status Modal */}
            <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
                <Pressable style={styles.statusModalOverlay} onPress={() => setStatusModalVisible(false)}>
                    <View style={styles.statusModalContent}>
                        <Text style={styles.statusModalTitle}>Escolhe o teu Estado</Text>
                        {STATUS_OPTIONS.map((option) => (
                            <Pressable key={option.value} style={[styles.statusOption, preferredStatus === option.value && styles.statusOptionActive]} onPress={() => handleUpdateStatus(option.value)}>
                                <View style={[styles.statusOptionDot, { backgroundColor: option.color }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statusOptionText}>{option.label}</Text>
                                    <Text style={styles.rowSubtitle}>{option.description}</Text>
                                </View>
                                {preferredStatus === option.value && <Ionicons name="checkmark-circle" size={20} color="#6366F1" />}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {/* FAQ Modal */}
            <Modal visible={faqModalVisible} transparent animationType="slide" onRequestClose={() => setFaqModalVisible(false)}>
                <View style={styles.faqModalOverlay}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.faqModalContent}>
                        <View style={styles.faqHandle} />
                        <View style={styles.faqHeader}>
                            <Text style={styles.faqTitle}>Perguntas Frequentes</Text>
                            <Pressable onPress={() => setFaqModalVisible(false)} style={styles.faqCloseButton}><Ionicons name="close" size={24} color="#FFF" /></Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.faqList}>
                            {FAQ_DATA.map((item) => (
                                <View key={item.id} style={styles.faqItem}>
                                    <View style={[styles.faqIconContainer, { backgroundColor: `${item.color}20` }]}><Ionicons name={item.icon as any} size={22} color={item.color} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.faqQuestion}>{item.question}</Text>
                                        <Text style={styles.faqAnswer}>{item.answer}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Legal Modal */}
            <Modal visible={legalModalVisible} transparent animationType="slide" onRequestClose={() => setLegalModalVisible(false)}>
                <View style={styles.faqModalOverlay}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.faqModalContent}>
                        <View style={styles.faqHandle} />
                        <View style={styles.faqHeader}>
                            <Text style={styles.faqTitle}>{legalType === 'terms' ? 'Termos' : 'Privacidade'}</Text>
                            <Pressable onPress={() => setLegalModalVisible(false)} style={styles.faqCloseButton}><Ionicons name="close" size={24} color="#FFF" /></Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.faqList}>
                            <LegalMarkdown style={markdownStyles}>{legalType === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY}</LegalMarkdown>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Support Modal */}
            <SupportModal visible={supportModalVisible} onClose={() => setSupportModalVisible(false)} />
        </SafeAreaView>
    );
}

// ============================================
// STYLES - NOVO DESIGN
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0f' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: LAYOUT.screenPadding },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.lg },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    headerTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginTop: 2 },

    // Group
    groupContainer: { marginBottom: SPACING.lg },
    groupTitle: { fontSize: 11, fontWeight: '600', color: COLORS.text.tertiary, letterSpacing: 1.2, marginBottom: SPACING.sm, marginLeft: 4 },
    groupCard: { backgroundColor: '#15151a', borderRadius: RADIUS['2xl'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },

    // Profile Row
    profileRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
    profileAvatarWrap: { position: 'relative' },
    profileAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#6366F1' },
    profileAvatarFallback: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    profileInitial: { fontSize: 22, fontWeight: '700', color: '#FFF' },
    avatarBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#15151a' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: TYPOGRAPHY.size.base, fontWeight: '600', color: '#FFF' },
    profileEmail: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginTop: 2 },

    // Settings Row
    settingsRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingHorizontal: SPACING.lg, gap: SPACING.md },
    settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    settingsRowPressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
    rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: TYPOGRAPHY.size.base, fontWeight: '500', color: '#FFF' },
    rowSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginTop: 1 },
    rowValue: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginRight: 4 },
    verifiedBadge: { padding: 4 },

    // Status
    statusRow: { gap: SPACING.md },
    statusDot: { width: 10, height: 10, borderRadius: 5 },

    // Switch Row
    switchRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingHorizontal: SPACING.lg, gap: SPACING.md },

    // Footer
    footer: { alignItems: 'center', paddingVertical: SPACING.xl },
    versionText: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    userIdText: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.25)', marginTop: 4 },

    // Edit Modal
    modalContainer: { flex: 1, backgroundColor: '#0a0a0f' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalCancel: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },
    modalTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: '600', color: '#FFF' },
    modalSave: { fontSize: TYPOGRAPHY.size.base, fontWeight: '600', color: '#6366F1' },
    modalContent: { padding: SPACING.xl },
    modalLabel: { fontSize: TYPOGRAPHY.size.sm, fontWeight: '500', color: COLORS.text.secondary, marginBottom: SPACING.sm },
    modalInput: { backgroundColor: '#15151a', borderRadius: RADIUS.xl, padding: SPACING.lg, fontSize: TYPOGRAPHY.size.lg, color: '#FFF', borderWidth: 2, borderColor: '#6366F1' },
    modalHint: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginTop: SPACING.md },

    // Status Modal
    statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: LAYOUT.screenPadding },
    statusModalContent: { backgroundColor: '#15151a', borderRadius: RADIUS['2xl'], width: '100%', padding: SPACING.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    statusModalTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: '700', color: '#FFF', marginBottom: SPACING.xl, textAlign: 'center' },
    statusOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, borderRadius: RADIUS.xl, marginBottom: SPACING.sm },
    statusOptionActive: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    statusOptionDot: { width: 12, height: 12, borderRadius: 6 },
    statusOptionText: { fontSize: TYPOGRAPHY.size.base, fontWeight: '500', color: '#FFF' },

    // FAQ Modal
    faqModalOverlay: { flex: 1, justifyContent: 'flex-end' },
    faqModalContent: { backgroundColor: '#0C0C0E', borderTopLeftRadius: RADIUS['3xl'], borderTopRightRadius: RADIUS['3xl'], height: '80%', paddingTop: SPACING.md },
    faqHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
    faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl },
    faqTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: '700', color: '#FFF' },
    faqCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    faqList: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
    faqItem: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.xl, backgroundColor: 'rgba(255,255,255,0.02)', padding: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    faqIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    faqQuestion: { fontSize: TYPOGRAPHY.size.base, fontWeight: '700', color: '#FFF', marginBottom: 4 },
    faqAnswer: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, lineHeight: 20 },
});

const markdownStyles = {
    body: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.size.base, lineHeight: 24 },
    heading1: { color: '#FFF', fontSize: TYPOGRAPHY.size['2xl'], fontWeight: 'bold' as const, marginTop: SPACING.xl, marginBottom: SPACING.lg },
    heading2: { color: '#E0E7FF', fontSize: TYPOGRAPHY.size.lg, fontWeight: '600' as const, marginTop: SPACING.lg, marginBottom: SPACING.sm },
    paragraph: { color: COLORS.text.secondary, lineHeight: 24, marginBottom: SPACING.md },
    strong: { color: '#6366F1', fontWeight: 'bold' as const },
};
