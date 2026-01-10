/**
 * Premium Settings Screen - REDESIGNED 2.0 (Mobile First)
 * Layout: Hero Profile Card + Clean Grouped Lists
 * Design: Premium Dark Mode (#0A0A0F) with High Contrast & Subtle Gradients
 */

import { SupportModal } from '@/components/SupportModal';
import { Toast, ToastType } from '@/components/ui/Toast';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@/constants/legal';
import { supabase } from '@/lib/supabase';
import { SPACING } from '@/lib/theme.premium';
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
    Platform,
    Pressable,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';
import LegalMarkdown from 'react-native-markdown-display';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
// COMPONENTS
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
            style={({ pressed }) => [
                styles.settingsRow,
                !isLast && styles.settingsRowBorder,
                pressed && onPress && styles.settingsRowPressed
            ]}
            onPress={onPress}
            disabled={!onPress && !rightElement}
        >
            <View style={[styles.rowIcon, { backgroundColor: `${displayColor}15` }]}>
                <Ionicons name={icon} size={20} color={displayColor} />
            </View>
            <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]} numberOfLines={1}>{label}</Text>
                {subtitle && <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {value && <Text style={styles.rowValue}>{value}</Text>}
                {rightElement}
                {onPress && !rightElement && <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />}
            </View>
        </Pressable>
    );
}

function SettingsGroup({ title, children, delay = 0, noBg = false }: { title?: string; children: React.ReactNode; delay?: number; noBg?: boolean }) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.groupContainer}>
            {title && <Text style={styles.groupTitle}>{title}</Text>}
            <View style={[styles.groupCard, noBg && styles.groupCardNoBg]}>{children}</View>
        </Animated.View>
    );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { user, signOut } = useAuthContext();
    const { profile, refetchProfile } = useProfile();
    const { showAlert } = useAlert();
    const { setStatus, preferredStatus } = usePresenceContext();

    // States
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

    // Toast
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<ToastType>('info');

    const showToast = (type: ToastType, message: string) => {
        setToastType(type);
        setToastMessage(message);
        setToastVisible(true);
    };

    // Handlers (Avatar, Edit, Status, Support... SAME AS BEFORE)
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
            const fileData = decode(base64);
            const fileName = `${user.id}/${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, fileData, { contentType: mimeType, upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
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
        setEditValue(field === 'name' ? profile?.full_name || '' : field === 'username' ? profile?.username || '' : user?.email || '');
        setEditModalVisible(true);
    };

    const handleSaveField = async () => {
        if (!user?.id) return;
        try {
            setSaving(true);
            if (editField === 'name') await supabase.from('profiles').update({ full_name: editValue.trim() }).eq('id', user.id);
            else if (editField === 'username') {
                const { error } = await supabase.from('profiles').update({ username: editValue.trim().toLowerCase() }).eq('id', user.id);
                if (error?.code === '23505') { showToast('error', 'Username já em uso.'); return; }
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

    const handleShareProfile = async () => {
        await Share.share({ message: `Junta-te a mim no Escola+! 🎓\n@${profile?.username}\nhttps://escola.plus` });
    };

    const currentStatus = STATUS_OPTIONS.find(s => s.value === preferredStatus) || STATUS_OPTIONS[0];
    const appVersion = Application.nativeApplicationVersion || '2.0.0';
    const getFieldLabel = () => editField === 'name' ? 'Nome Completo' : editField === 'username' ? 'Username' : 'Email';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
            <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />

            {/* HEADER */}
            <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </Pressable>
                <Animated.Text entering={FadeInDown.delay(100)} style={styles.headerTitle}>Definições</Animated.Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >

                {/* HERO PROFILE CARD */}
                <Animated.View entering={FadeInUp.delay(200).springify()}>
                    <Pressable style={styles.heroCard} onPress={() => openEditModal('name')}>
                        <LinearGradient
                            colors={['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.heroContent}>
                            <Pressable onPress={handlePickImage} style={styles.heroAvatarContainer}>
                                {profile?.avatar_url ? (
                                    <Image source={{ uri: profile.avatar_url }} style={styles.heroAvatar} />
                                ) : (
                                    <View style={styles.heroAvatarFallback}>
                                        <Text style={styles.heroInitial}>{profile?.username?.[0]?.toUpperCase() || 'U'}</Text>
                                    </View>
                                )}
                                <View style={styles.heroEditBadge}>
                                    {uploadingAvatar ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={12} color="#FFF" />}
                                </View>
                            </Pressable>

                            <View style={styles.heroInfo}>
                                <Text style={styles.heroName}>{profile?.full_name || 'Utilizador'}</Text>
                                <Text style={styles.heroUsername}>@{profile?.username || 'user'}</Text>
                                <View style={styles.heroStatusChip}>
                                    <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
                                    <Text style={styles.heroStatusText}>{currentStatus.label}</Text>
                                </View>
                            </View>

                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                        </View>
                    </Pressable>
                </Animated.View>

                {/* ACCOUNT SECTION */}
                <SettingsGroup title="CONTA" delay={300}>
                    <SettingsRow
                        icon="person"
                        iconColor="#6366F1"
                        label="Nome Completo"
                        value={profile?.full_name || 'Definir'}
                        onPress={() => openEditModal('name')}
                    />
                    <SettingsRow
                        icon="at"
                        iconColor="#8B5CF6"
                        label="Username"
                        value={`@${profile?.username}`}
                        onPress={() => openEditModal('username')}
                    />
                    <SettingsRow
                        icon="mail"
                        iconColor="#10B981"
                        label="Email"
                        value={user?.email || ''}
                        rightElement={<Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                        isLast
                    />
                </SettingsGroup>

                {/* PRESENCE SECTION */}
                <SettingsGroup title="ESTADO" delay={400}>
                    <SettingsRow
                        icon="radio-button-on"
                        iconColor={currentStatus.color}
                        label="Estado Online"
                        value={currentStatus.label}
                        onPress={() => setStatusModalVisible(true)}
                        isLast
                    />
                </SettingsGroup>

                {/* PREFERENCES SECTION */}
                <SettingsGroup title="APP" delay={500}>
                    <SettingsRow
                        icon="notifications"
                        iconColor="#EC4899"
                        label="Notificações"
                        onPress={() => router.push('/notifications')}
                    />
                    <SettingsRow
                        icon="volume-high"
                        iconColor="#10B981"
                        label="Efeitos Sonoros"
                        rightElement={
                            <Switch
                                value={soundEffects}
                                onValueChange={setSoundEffects}
                                trackColor={{ false: '#3A3A4A', true: '#10B981' }}
                                thumbColor="#FFF"
                                style={{ transform: [{ scale: 0.8 }] }}
                            />
                        }
                        isLast
                    />
                </SettingsGroup>

                {/* SHORTCUTS */}
                <SettingsGroup title="EXTRAS" delay={600}>
                    <SettingsRow icon="trophy" iconColor="#F59E0B" label="Conquistas" onPress={() => router.push('/badges')} />
                    <SettingsRow icon="storefront" iconColor="#EC4899" label="Loja" onPress={() => router.push('/shop')} />
                    <SettingsRow icon="podium" iconColor="#6366F1" label="Leaderboard" onPress={() => router.push('/leaderboard')} />
                    <SettingsRow icon="share-social" iconColor="#3B82F6" label="Partilhar Perfil" onPress={handleShareProfile} isLast />
                </SettingsGroup>

                {/* SUPPORT */}
                <SettingsGroup title="SUPORTE" delay={700}>
                    <SettingsRow icon="heart" iconColor="#EC4899" label="Apoiar o Projeto" onPress={() => setSupportModalVisible(true)} />
                    <SettingsRow icon="help-circle" iconColor="#F59E0B" label="FAQ" onPress={() => setFaqModalVisible(true)} />
                    <SettingsRow icon="document-text" iconColor="#8B5CF6" label="Legal" onPress={() => { setLegalType('terms'); setLegalModalVisible(true); }} isLast />
                </SettingsGroup>

                {/* DANGER ZONE */}
                <SettingsGroup title="ZONA DE PERIGO" delay={800}>
                    <SettingsRow icon="shield-half" iconColor="#6366F1" label="Bloqueados" onPress={() => router.push('/settings/user-blocks' as any)} />
                    <SettingsRow icon="log-out" iconColor="#EF4444" label="Terminar Sessão" onPress={handleSignOut} danger />
                    <SettingsRow icon="trash" iconColor="#EF4444" label="Eliminar Conta" onPress={handleDeleteAccount} danger isLast />
                </SettingsGroup>

                {/* FOOTER */}
                <View style={styles.footer}>
                    <Image source={require('@/assets/images/icon.png')} style={{ width: 24, height: 24, opacity: 0.5, marginBottom: 8 }} />
                    <Text style={styles.versionText}>Escola+ v{appVersion}</Text>
                    <Text style={styles.userIdText}>{user?.id}</Text>
                </View>

            </ScrollView>

            {/* MODALS */}
            <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalBg}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setEditModalVisible(false)}><Text style={styles.modalCancel}>Cancelar</Text></Pressable>
                        <Text style={styles.modalTitle}>Editar {getFieldLabel()}</Text>
                        <Pressable onPress={handleSaveField} disabled={saving || editField === 'email'}>
                            {saving ? <ActivityIndicator color="#6366F1" /> : <Text style={[styles.modalSave, editField === 'email' && { opacity: 0.3 }]}>Guardar</Text>}
                        </Pressable>
                    </View>
                    <View style={styles.modalBody}>
                        <Text style={styles.inputLabel}>{getFieldLabel()}</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editValue}
                            onChangeText={setEditValue}
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            autoCapitalize={editField === 'username' ? 'none' : 'words'}
                            editable={editField !== 'email'}
                            autoFocus
                        />
                        {editField === 'username' && <Text style={styles.inputHint}>O teu @ único na plataforma.</Text>}
                    </View>
                </View>
            </Modal>

            <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setStatusModalVisible(false)}>
                    <View style={styles.statusSheet}>
                        <Text style={styles.sheetTitle}>O teu estado</Text>
                        {STATUS_OPTIONS.map((option) => (
                            <Pressable
                                key={option.value}
                                style={[styles.statusOption, preferredStatus === option.value && styles.statusOptionActive]}
                                onPress={() => handleUpdateStatus(option.value)}
                            >
                                <View style={[styles.statusDotLg, { backgroundColor: option.color }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.statusLabel}>{option.label}</Text>
                                    <Text style={styles.statusDesc}>{option.description}</Text>
                                </View>
                                {preferredStatus === option.value && <Ionicons name="checkmark" size={20} color="#6366F1" />}
                            </Pressable>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {/* REUSING FAQ & LEGAL MODALS LOGIC WITH UPDATED STYLES */}
            <Modal visible={faqModalVisible} transparent animationType="slide" onRequestClose={() => setFaqModalVisible(false)}>
                <View style={styles.sheetOverlay}>
                    <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetHeaderTitle}>FAQ</Text>
                        <ScrollView contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 50 }}>
                            {FAQ_DATA.map(item => (
                                <View key={item.id} style={styles.faqCard}>
                                    <View style={[styles.faqIcon, { backgroundColor: `${item.color}20` }]}>
                                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.faqQuestion}>{item.question}</Text>
                                        <Text style={styles.faqAnswer}>{item.answer}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <Pressable style={styles.closeFloatBtn} onPress={() => setFaqModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={legalModalVisible} transparent animationType="slide" onRequestClose={() => setLegalModalVisible(false)}>
                <View style={styles.sheetOverlay}>
                    <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetHeaderTitle}>{legalType === 'terms' ? 'Termos' : 'Privacidade'}</Text>
                        <ScrollView contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 50 }}>
                            <LegalMarkdown style={mdStyles}>{legalType === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY}</LegalMarkdown>
                        </ScrollView>
                        <Pressable style={styles.closeFloatBtn} onPress={() => setLegalModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <SupportModal visible={supportModalVisible} onClose={() => setSupportModalVisible(false)} />

        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0F' },
    content: { flex: 1 },
    contentContainer: { paddingHorizontal: 16, paddingTop: 16 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#0A0A0F', zIndex: 10 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1F', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },

    // Hero Card
    heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15151A', borderRadius: 24, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', overflow: 'hidden' },
    heroContent: { flexDirection: 'row', alignItems: 'center', flex: 1, zIndex: 1 },
    heroAvatarContainer: { position: 'relative', marginRight: 16 },
    heroAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#fff' },
    heroAvatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    heroInitial: { fontSize: 24, fontWeight: '700', color: '#FFF' },
    heroEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6366F1', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#15151A' },
    heroInfo: { flex: 1 },
    heroName: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 2 },
    heroUsername: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
    heroStatusChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    heroStatusText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginLeft: 6, fontWeight: '500' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },

    // Groups
    groupContainer: { marginBottom: 24 },
    groupTitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 10, marginLeft: 12, letterSpacing: 1 },
    groupCard: { backgroundColor: '#15151A', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    groupCardNoBg: { backgroundColor: 'transparent', borderWidth: 0 },

    // Rows
    settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 60 },
    settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    settingsRowPressed: { backgroundColor: 'rgba(255,255,255,0.03)' },
    rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    rowContent: { flex: 1, marginRight: 8 },
    rowLabel: { fontSize: 16, color: '#FFF', fontWeight: '500' },
    rowSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    rowValue: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },

    // Footer
    footer: { alignItems: 'center', marginTop: 20, opacity: 0.3 },
    versionText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    userIdText: { color: '#FFF', fontSize: 10, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

    // Modals
    modalBg: { flex: 1, backgroundColor: '#0A0A0F' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    modalCancel: { color: '#EF4444', fontSize: 16 },
    modalSave: { color: '#6366F1', fontSize: 16, fontWeight: '600' },
    modalTitle: { color: '#FFF', fontSize: 17, fontWeight: '600' },
    modalBody: { padding: 24 },
    inputLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    modalInput: { backgroundColor: '#15151A', borderRadius: 16, padding: 16, color: '#FFF', fontSize: 18, borderWidth: 1, borderColor: '#6366F1' },
    inputHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    statusSheet: { backgroundColor: '#1A1A20', borderRadius: 24, padding: 24 },
    sheetTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
    statusOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
    statusOptionActive: { backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: '#6366F1' },
    statusDotLg: { width: 12, height: 12, borderRadius: 6, marginRight: 16 },
    statusLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    statusDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },

    // Sheets (FAQ/Legal)
    sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
    sheetContent: { backgroundColor: '#15151A', height: '85%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    sheetHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', marginTop: 12, borderRadius: 2 },
    sheetHeaderTitle: { color: '#FFF', fontSize: 24, fontWeight: '700', margin: 24 },
    faqCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 12 },
    faqIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    faqQuestion: { color: '#FFF', fontWeight: '700', marginBottom: 4 },
    faqAnswer: { color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
    closeFloatBtn: { position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

});

const mdStyles = {
    body: { color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 24 },
    heading1: { color: '#FFF', fontSize: 24, fontWeight: '700' as const, marginVertical: 16 },
    heading2: { color: '#FFF', fontSize: 20, fontWeight: '600' as const, marginVertical: 12 },
};
