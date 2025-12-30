/**
 * Consumíveis Screen - PREMIUM
 * Inventário de itens comprados que podem ser usados
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
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

interface InventoryItem {
    id: string;
    item_id: string;
    purchased_at: string;
    is_equipped: boolean;
    shop_item: {
        id: string;
        name: string;
        description: string | null;
        type: string;
        config: any;
        is_consumable: boolean;
    };
}

const { width } = Dimensions.get('window');

// ============================================
// EFFECT CONFIG
// ============================================

const EFFECT_CONFIG: Record<string, { icon: string; gradient: readonly [string, string]; label: string }> = {
    streak_freeze: { icon: '❄️', gradient: ['#60A5FA', '#3B82F6'] as const, label: 'Streak Freeze' },
    xp_multiplier: { icon: '⚡', gradient: ['#FBBF24', '#F59E0B'] as const, label: 'XP Boost' },
    task_skip: { icon: '⏭️', gradient: ['#A855F7', '#7C3AED'] as const, label: 'Saltar Tarefa' },
    deadline_extension: { icon: '⏰', gradient: ['#22C55E', '#16A34A'] as const, label: 'Extensão Prazo' },
    ai_hint: { icon: '💡', gradient: ['#EC4899', '#DB2777'] as const, label: 'Dica IA' },
};

// ============================================
// COMPONENT
// ============================================

export default function ConsumablesScreen() {
    const { user } = useAuthContext();
    const { profile, refetchProfile } = useProfile();

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [using, setUsing] = useState<string | null>(null);

    const headerAnim = useRef(new Animated.Value(0)).current;

    // ============================================
    // LOAD DATA
    // ============================================

    const loadInventory = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('user_inventory')
                .select(`
                    id,
                    item_id,
                    purchased_at,
                    is_equipped,
                    shop_item:shop_items (
                        id,
                        name,
                        description,
                        type,
                        config,
                        is_consumable
                    )
                `)
                .eq('user_id', user.id)
                .order('purchased_at', { ascending: false });

            if (error) throw error;

            // Filtrar apenas consumíveis
            const consumables = (data || [])
                .filter((item: any) => {
                    const shopItem = Array.isArray(item.shop_item) ? item.shop_item[0] : item.shop_item;
                    return shopItem?.is_consumable === true;
                })
                .map((item: any) => ({
                    ...item,
                    shop_item: Array.isArray(item.shop_item) ? item.shop_item[0] : item.shop_item,
                }));

            setItems(consumables);

            Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
        } catch (err) {
            console.error('Erro ao carregar inventário:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => { loadInventory(); }, [loadInventory]);

    // ============================================
    // USE CONSUMABLE
    // ============================================

    const handleUse = async (item: InventoryItem) => {
        if (!user?.id) return;

        const config = item.shop_item.config;
        const effect = config?.effect;

        // Confirmação
        let confirmMessage = `Queres usar "${item.shop_item.name}"?`;

        if (effect === 'streak_freeze') {
            confirmMessage = `❄️ Ativar Streak Freeze?\n\nIsto adiciona uma proteção à tua streak. Se falhares um dia, a streak será mantida automaticamente!`;
        } else if (effect === 'xp_multiplier') {
            const mult = config?.multiplier || 2;
            const hours = config?.duration_hours || 24;
            confirmMessage = `⚡ Ativar XP Boost ${mult}x?\n\nTodo o XP que ganhares nas próximas ${hours} horas será multiplicado por ${mult}!`;
        }

        Alert.alert('Usar Consumível', confirmMessage, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Usar!',
                onPress: async () => {
                    setUsing(item.id);

                    try {
                        const { data, error } = await supabase.rpc('use_consumable', {
                            p_user_id: user.id,
                            p_inventory_id: item.id,
                        });

                        if (error) throw error;

                        if (data?.success) {
                            Alert.alert('✅ Ativado!', data.message || 'Consumível ativado com sucesso!');
                            // Remover do inventário local
                            setItems((prev) => prev.filter((i) => i.id !== item.id));
                            refetchProfile();
                        } else {
                            Alert.alert('Erro', data?.error || 'Não foi possível usar.');
                        }
                    } catch (err: any) {
                        console.error('Erro ao usar consumível:', err);
                        Alert.alert('Erro', err.message);
                    } finally {
                        setUsing(null);
                    }
                },
            },
        ]);
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar consumíveis...</Text>
                </View>
            </View>
        );
    }

    const streakFreezes = profile?.streak_freezes || 0;
    const xpMultiplier = profile?.xp_multiplier || 1;
    const xpMultiplierExpires = profile?.xp_multiplier_expires;
    const hasActiveBoost = xpMultiplier > 1 && xpMultiplierExpires && new Date(xpMultiplierExpires) > new Date();

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>⚡ Consumíveis</Text>
                        <Text style={styles.headerSubtitle}>{items.length} disponíveis</Text>
                    </View>
                    <Pressable style={styles.shopButton} onPress={() => router.push('/shop')}>
                        <Ionicons name="cart" size={20} color="#6366F1" />
                    </Pressable>
                </Animated.View>

                {/* Active Effects */}
                <View style={styles.activeEffectsSection}>
                    <Text style={styles.sectionTitle}>Efeitos Ativos</Text>
                    <View style={styles.activeEffectsRow}>
                        {/* Streak Freezes */}
                        <View style={styles.effectCard}>
                            <LinearGradient colors={['rgba(96, 165, 250, 0.2)', 'rgba(59, 130, 246, 0.1)']} style={styles.effectCardGradient}>
                                <Text style={styles.effectEmoji}>❄️</Text>
                                <Text style={styles.effectValue}>{streakFreezes}</Text>
                                <Text style={styles.effectLabel}>Freezes</Text>
                            </LinearGradient>
                        </View>

                        {/* XP Multiplier */}
                        <View style={styles.effectCard}>
                            <LinearGradient
                                colors={hasActiveBoost ? ['rgba(251, 191, 36, 0.3)', 'rgba(245, 158, 11, 0.2)'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                style={styles.effectCardGradient}
                            >
                                <Text style={styles.effectEmoji}>⚡</Text>
                                <Text style={[styles.effectValue, hasActiveBoost && { color: '#FBBF24' }]}>{xpMultiplier}x</Text>
                                <Text style={styles.effectLabel}>XP Boost</Text>
                                {hasActiveBoost && (
                                    <Text style={styles.effectExpiry}>
                                        {Math.round((new Date(xpMultiplierExpires).getTime() - Date.now()) / (1000 * 60 * 60))}h restantes
                                    </Text>
                                )}
                            </LinearGradient>
                        </View>
                    </View>
                </View>

                {/* Inventory List */}
                <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>Inventário</Text>

                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ConsumableCard
                            item={item}
                            onUse={() => handleUse(item)}
                            isUsing={using === item.id}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadInventory(); }}
                            tintColor="#6366F1"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>📦</Text>
                            <Text style={styles.emptyTitle}>Inventário Vazio</Text>
                            <Text style={styles.emptySubtitle}>Compra consumíveis na loja para os usar aqui!</Text>
                            <Pressable style={styles.emptyButton} onPress={() => router.push('/shop')}>
                                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.emptyButtonGradient}>
                                    <Ionicons name="cart" size={18} color="#FFF" />
                                    <Text style={styles.emptyButtonText}>Ir à Loja</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}

// ============================================
// CONSUMABLE CARD
// ============================================

function ConsumableCard({ item, onUse, isUsing }: { item: InventoryItem; onUse: () => void; isUsing: boolean }) {
    const scale = useRef(new Animated.Value(1)).current;
    const config = item.shop_item.config;
    const effect = config?.effect || 'unknown';
    const effectConfig = EFFECT_CONFIG[effect] || { icon: '🎁', gradient: ['#6366F1', '#4F46E5'] as const, label: 'Item' };

    const getEffectDetails = () => {
        if (effect === 'streak_freeze') {
            const qty = config?.quantity || 1;
            return `Protege streak por ${qty} dia${qty > 1 ? 's' : ''}`;
        }
        if (effect === 'xp_multiplier') {
            return `${config?.multiplier || 2}x XP por ${config?.duration_hours || 24}h`;
        }
        if (effect === 'task_skip') {
            return `Salta tarefa (${config?.xp_percentage || 25}% XP)`;
        }
        if (effect === 'deadline_extension') {
            return `+${config?.hours || 24}h no prazo`;
        }
        return item.shop_item.description || 'Consumível';
    };

    return (
        <Pressable
            onPress={onUse}
            onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
            disabled={isUsing}
        >
            <Animated.View style={[styles.consumableCard, { transform: [{ scale }] }]}>
                {/* Icon */}
                <LinearGradient colors={effectConfig.gradient} style={styles.consumableIcon}>
                    <Text style={styles.consumableEmoji}>{effectConfig.icon}</Text>
                </LinearGradient>

                {/* Info */}
                <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>{item.shop_item.name}</Text>
                    <Text style={styles.consumableDetails}>{getEffectDetails()}</Text>
                    <Text style={styles.consumableDate}>
                        Comprado {new Date(item.purchased_at).toLocaleDateString('pt-PT')}
                    </Text>
                </View>

                {/* Use Button */}
                <Pressable style={styles.useButton} onPress={onUse} disabled={isUsing}>
                    {isUsing ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="flash" size={16} color="#FFF" />
                            <Text style={styles.useButtonText}>Usar</Text>
                        </>
                    )}
                </Pressable>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
    loadingText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.secondary },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerContent: { flex: 1, marginLeft: SPACING.md },
    headerTitle: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary },
    headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary },
    shopButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center' },

    // Sections
    sectionTitle: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.secondary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },

    // Active Effects
    activeEffectsSection: { paddingTop: SPACING.md },
    activeEffectsRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.md },
    effectCard: { flex: 1, borderRadius: RADIUS['2xl'], overflow: 'hidden' },
    effectCardGradient: { padding: SPACING.lg, alignItems: 'center' },
    effectEmoji: { fontSize: 28 },
    effectValue: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.primary, marginTop: SPACING.xs },
    effectLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary },
    effectExpiry: { fontSize: TYPOGRAPHY.size.xs, color: '#FBBF24', marginTop: 4 },

    // List
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },

    // Consumable Card
    consumableCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    consumableIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    consumableEmoji: { fontSize: 24 },
    consumableInfo: { flex: 1, marginLeft: SPACING.md },
    consumableName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    consumableDetails: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.secondary, marginTop: 2 },
    consumableDate: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginTop: 4 },
    useButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.xl },
    useButtonText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary, marginTop: SPACING.md },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.tertiary, marginTop: SPACING.xs, textAlign: 'center' },
    emptyButton: { marginTop: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden' },
    emptyButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING['2xl'], paddingVertical: SPACING.md },
    emptyButtonText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
});
