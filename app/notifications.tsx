/**
 * Notifications Settings Page - TripGlide Premium Design
 * Definições personalizadas para push notifications por categoria
 */

import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface NotificationSettings {
    push_enabled: boolean;
    dm_notifications: boolean;
    team_notifications: boolean;
    task_notifications: boolean;
    friend_notifications: boolean;
    mention_notifications: boolean;
    marketing_notifications: boolean;
    sound_enabled: boolean;
    vibration_enabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    push_enabled: true,
    dm_notifications: true,
    team_notifications: true,
    task_notifications: true,
    friend_notifications: true,
    mention_notifications: true,
    marketing_notifications: false,
    sound_enabled: true,
    vibration_enabled: true,
};

// ============================================
// TOGGLE ITEM COMPONENT
// ============================================

function SettingToggle({
    icon,
    iconColor,
    title,
    description,
    value,
    onValueChange,
    disabled,
}: {
    icon: string;
    iconColor: string;
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
            <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name={icon as any} size={20} color={iconColor} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>{title}</Text>
                {description && (
                    <Text style={styles.settingDescription}>{description}</Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#6366F1' }}
                thumbColor={value ? '#FFF' : 'rgba(255,255,255,0.5)'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
            />
        </View>
    );
}

// ============================================
// SECTION HEADER
// ============================================

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>{emoji}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationsScreen() {
    const { user } = useAuthContext();
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Carregar definições
    useEffect(() => {
        if (user?.id) {
            loadSettings();
        }
    }, [user?.id]);

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('notification_settings')
                .eq('id', user?.id)
                .single();

            if (data?.notification_settings) {
                setSettings({ ...DEFAULT_SETTINGS, ...data.notification_settings });
            }
        } catch (err) {
            console.error('Error loading notification settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
        const newSettings = { ...settings, [key]: value };

        // Se desligar master, desliga tudo
        if (key === 'push_enabled' && !value) {
            Object.keys(newSettings).forEach(k => {
                if (k !== 'push_enabled') {
                    (newSettings as any)[k] = false;
                }
            });
        }

        setSettings(newSettings);

        // Guardar no Supabase
        setSaving(true);
        try {
            await supabase
                .from('profiles')
                .update({ notification_settings: newSettings })
                .eq('id', user?.id);
        } catch (err) {
            console.error('Error saving notification settings:', err);
        } finally {
            setSaving(false);
        }
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

    const masterEnabled = settings.push_enabled;

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Notificações</Text>
                    {saving && (
                        <ActivityIndicator size="small" color="#6366F1" style={{ marginLeft: 12 }} />
                    )}
                    <View style={{ flex: 1 }} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Master Toggle Card */}
                    <View style={styles.masterCard}>
                        <LinearGradient
                            colors={masterEnabled ? ['#6366F1', '#8B5CF6'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                            style={styles.masterCardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.masterCardIcon}>
                                <Ionicons
                                    name={masterEnabled ? 'notifications' : 'notifications-off'}
                                    size={28}
                                    color={masterEnabled ? '#FFF' : 'rgba(255,255,255,0.4)'}
                                />
                            </View>
                            <View style={styles.masterCardContent}>
                                <Text style={styles.masterCardTitle}>
                                    {masterEnabled ? 'Notificações Ativas' : 'Notificações Desligadas'}
                                </Text>
                                <Text style={[styles.masterCardDescription, !masterEnabled && { color: 'rgba(255,255,255,0.4)' }]}>
                                    {masterEnabled
                                        ? 'Recebes todas as notificações configuradas'
                                        : 'Não vais receber nenhuma notificação'}
                                </Text>
                            </View>
                            <Switch
                                value={masterEnabled}
                                onValueChange={(val) => updateSetting('push_enabled', val)}
                                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.3)' }}
                                thumbColor="#FFF"
                                ios_backgroundColor="rgba(255,255,255,0.2)"
                            />
                        </LinearGradient>
                    </View>

                    {/* Mensagens */}
                    <SectionHeader title="Mensagens" emoji="💬" />
                    <View style={styles.settingsCard}>
                        <SettingToggle
                            icon="chatbubble"
                            iconColor="#06B6D4"
                            title="Mensagens Diretas"
                            description="Novas mensagens de amigos"
                            value={settings.dm_notifications}
                            onValueChange={(val) => updateSetting('dm_notifications', val)}
                            disabled={!masterEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingToggle
                            icon="at"
                            iconColor="#F59E0B"
                            title="Menções"
                            description="Quando alguém te menciona"
                            value={settings.mention_notifications}
                            onValueChange={(val) => updateSetting('mention_notifications', val)}
                            disabled={!masterEnabled}
                        />
                    </View>

                    {/* Equipas & Tarefas */}
                    <SectionHeader title="Equipas & Tarefas" emoji="👥" />
                    <View style={styles.settingsCard}>
                        <SettingToggle
                            icon="people"
                            iconColor="#8B5CF6"
                            title="Equipas"
                            description="Mensagens e atualizações de equipa"
                            value={settings.team_notifications}
                            onValueChange={(val) => updateSetting('team_notifications', val)}
                            disabled={!masterEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingToggle
                            icon="checkmark-circle"
                            iconColor="#10B981"
                            title="Tarefas"
                            description="Novas tarefas e lembretes de prazo"
                            value={settings.task_notifications}
                            onValueChange={(val) => updateSetting('task_notifications', val)}
                            disabled={!masterEnabled}
                        />
                    </View>

                    {/* Social */}
                    <SectionHeader title="Social" emoji="🤝" />
                    <View style={styles.settingsCard}>
                        <SettingToggle
                            icon="person-add"
                            iconColor="#EC4899"
                            title="Pedidos de Amizade"
                            description="Novos pedidos e amigos aceites"
                            value={settings.friend_notifications}
                            onValueChange={(val) => updateSetting('friend_notifications', val)}
                            disabled={!masterEnabled}
                        />
                    </View>

                    {/* Som & Vibração */}
                    <SectionHeader title="Som & Vibração" emoji="🔔" />
                    <View style={styles.settingsCard}>
                        <SettingToggle
                            icon="volume-high"
                            iconColor="#3B82F6"
                            title="Som"
                            description="Tocar som ao receber notificação"
                            value={settings.sound_enabled}
                            onValueChange={(val) => updateSetting('sound_enabled', val)}
                            disabled={!masterEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingToggle
                            icon="phone-portrait"
                            iconColor="#6366F1"
                            title="Vibração"
                            description="Vibrar ao receber notificação"
                            value={settings.vibration_enabled}
                            onValueChange={(val) => updateSetting('vibration_enabled', val)}
                            disabled={!masterEnabled}
                        />
                    </View>

                    {/* Marketing */}
                    <SectionHeader title="Outros" emoji="📢" />
                    <View style={styles.settingsCard}>
                        <SettingToggle
                            icon="megaphone"
                            iconColor="#64748B"
                            title="Novidades & Promoções"
                            description="Atualizações da app e eventos"
                            value={settings.marketing_notifications}
                            onValueChange={(val) => updateSetting('marketing_notifications', val)}
                            disabled={!masterEnabled}
                        />
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={20} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.infoText}>
                            As notificações push requerem permissão do sistema. Se não recebes notificações, verifica as definições do dispositivo.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ============================================
// STYLES - TripGlide Premium
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0C0E',
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
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginLeft: 14,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // Master Card
    masterCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
    },
    masterCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    masterCardIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    masterCardContent: {
        flex: 1,
    },
    masterCardTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 4,
    },
    masterCardDescription: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginTop: 8,
    },
    sectionEmoji: {
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },

    // Settings Card
    settingsCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 20,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    settingItemDisabled: {
        opacity: 0.4,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    settingTitleDisabled: {
        color: 'rgba(255,255,255,0.5)',
    },
    settingDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginLeft: 70,
    },

    // Info Card
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 14,
        borderRadius: 12,
        marginTop: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        lineHeight: 18,
    },
});
