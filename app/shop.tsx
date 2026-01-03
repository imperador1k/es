/**
 * Shop Screen - ABSURDAMENTE PREMIUM
 * Loja épica com cards 3D, animações, efeitos visuais insanos
 */

import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// TYPES
// ============================================

interface ShopItem {
    id: string;
    name: string;
    description: string | null;
    price: number;
    type: 'avatar_frame' | 'theme' | 'title' | 'badge' | 'consumable';
    icon_url: string | null;
    preview_color: string | null;
    is_consumable: boolean;
}

type CategoryFilter = 'all' | 'avatar_frame' | 'consumable';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.md) / 2;

// ============================================
// EPIC CONSTANTS
// ============================================

const CATEGORY_CONFIG = {
    all: { label: 'Tudo', icon: 'apps' as const, gradient: ['#6366F1', '#4F46E5'] as const, emoji: '🛒' },
    avatar_frame: { label: 'Molduras', icon: 'person-circle' as const, gradient: ['#EC4899', '#DB2777'] as const, emoji: '🖼️' },
    consumable: { label: 'Power-ups', icon: 'flash' as const, gradient: ['#22C55E', '#16A34A'] as const, emoji: '⚡' },
};

const RARITY_GLOW: Record<string, string> = {
    avatar_frame: 'rgba(236, 72, 153, 0.4)',
    consumable: 'rgba(34, 197, 94, 0.4)',
};

// ============================================
// COMPONENT
// ============================================

export default function ShopScreen() {
    const { user } = useAuthContext();
    const { profile, refetchProfile } = useProfile();
    const { showAlert } = useAlert();

    const [items, setItems] = useState<ShopItem[]>([]);
    const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

    const headerAnim = useRef(new Animated.Value(0)).current;
    const balanceAnim = useRef(new Animated.Value(0)).current;

    // ============================================
    // LOAD DATA
    // ============================================

    const loadShopData = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [itemsRes, inventoryRes] = await Promise.all([
                supabase.from('shop_items').select('*').eq('is_active', true).order('price', { ascending: true }),
                supabase.from('user_inventory').select('item_id').eq('user_id', user.id),
            ]);

            if (itemsRes.error) throw itemsRes.error;
            setItems(itemsRes.data || []);
            setOwnedItems(new Set((inventoryRes.data || []).map((i) => i.item_id)));

            // Animate in
            Animated.stagger(100, [
                Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
                Animated.spring(balanceAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
            ]).start();
        } catch (err) {
            console.error('Erro ao carregar loja:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => { loadShopData(); }, [loadShopData]);

    // Realtime XP
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`shop-xp:${user.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => refetchProfile())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user?.id, refetchProfile]);

    // ============================================
    // PURCHASE
    // ============================================

    const handlePurchase = async (item: ShopItem) => {
        if (!user?.id) return;
        const userXP = profile?.current_xp || 0;

        if (!item.is_consumable && ownedItems.has(item.id)) {
            showAlert({ title: 'Já Adquirido', message: 'Já possuis este item!' });
            return;
        }

        if (userXP < item.price) {
            showAlert({ title: 'XP Insuficiente', message: `Precisas de ${item.price} XP mas tens ${userXP} XP.` });
            return;
        }

        showAlert({
            title: '🛒 Confirmar Compra',
            message: `Comprar "${item.name}" por ${item.price} XP?`,
            buttons: [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Comprar!',
                    onPress: async () => {
                        setPurchasing(item.id);
                        try {
                            const { data, error } = await supabase.rpc('purchase_shop_item', { p_user_id: user.id, p_item_id: item.id });
                            if (error) throw error;

                            if (data?.success) {
                                showAlert({
                                    title: '🎉 Compra Realizada!',
                                    message: `Adquiriste "${data.item_name}"!\n\nNovo saldo: ${data.new_xp} XP`
                                });
                                setOwnedItems((prev) => new Set([...prev, item.id]));
                                refetchProfile();
                            } else {
                                showAlert({ title: 'Erro', message: data?.error || 'Compra falhou.' });
                            }
                        } catch (err: any) {
                            showAlert({ title: 'Erro', message: err.message });
                        } finally {
                            setPurchasing(null);
                        }
                    },
                },
            ]
        });
    };

    // ============================================
    // FILTER
    // ============================================

    const filteredItems = activeCategory === 'all' ? items : items.filter((i) => i.type === activeCategory);

    const getStatus = (item: ShopItem): 'owned' | 'affordable' | 'locked' => {
        if (!item.is_consumable && ownedItems.has(item.id)) return 'owned';
        if ((profile?.current_xp || 0) >= item.price) return 'affordable';
        return 'locked';
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>A carregar loja...</Text>
                </View>
            </View>
        );
    }

    const userXP = profile?.current_xp || 0;
    const ownedCount = items.filter((i) => ownedItems.has(i.id)).length;

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Epic Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>🛒 Loja</Text>
                        <Text style={styles.headerSubtitle}>{items.length} itens • {ownedCount} adquiridos</Text>
                    </View>
                </Animated.View>

                {/* Epic Balance Card */}
                <Animated.View style={[styles.balanceSection, { opacity: balanceAnim, transform: [{ scale: balanceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
                    <LinearGradient colors={['#6366F1', '#4F46E5', '#4338CA']} style={styles.balanceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        {/* Decorative circles */}
                        <View style={styles.balanceDecor1} />
                        <View style={styles.balanceDecor2} />

                        <View style={styles.balanceLeft}>
                            <View style={styles.balanceIconWrap}>
                                <Ionicons name="flash" size={28} color="#FFD700" />
                            </View>
                            <View>
                                <Text style={styles.balanceLabel}>Teu Saldo</Text>
                                <Text style={styles.balanceValue}>{userXP.toLocaleString()}</Text>
                            </View>
                        </View>

                        <Pressable style={styles.earnButton} onPress={() => router.push('/(tabs)/calendar' as any)}>
                            <Ionicons name="add-circle" size={20} color="#6366F1" />
                            <Text style={styles.earnButtonText}>Ganhar</Text>
                        </Pressable>
                    </LinearGradient>
                </Animated.View>

                {/* Category Filters - Estrutura Simples */}
                <View style={styles.categoriesContainer}>
                    {(Object.keys(CATEGORY_CONFIG) as CategoryFilter[]).map((key) => {
                        const config = CATEGORY_CONFIG[key];
                        const isActive = activeCategory === key;
                        const count = key === 'all' ? items.length : items.filter((i) => i.type === key).length;

                        return (
                            <Pressable
                                key={key}
                                style={[
                                    styles.categoryButton,
                                    isActive && { backgroundColor: config.gradient[0] }
                                ]}
                                onPress={() => setActiveCategory(key)}
                            >
                                <Text style={styles.categoryEmoji}>{config.emoji}</Text>
                                <Text style={[
                                    styles.categoryText,
                                    isActive && styles.categoryTextActive
                                ]}>
                                    {config.label}
                                </Text>
                                {isActive && (
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>{count}</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* Items Grid */}
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ShopCard item={item} status={getStatus(item)} purchasing={purchasing === item.id} onPurchase={() => handlePurchase(item)} />}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShopData(); }} tintColor="#6366F1" />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🛍️</Text>
                            <Text style={styles.emptyTitle}>Loja Vazia</Text>
                            <Text style={styles.emptySubtitle}>{activeCategory === 'all' ? 'Ainda não há itens.' : 'Nenhum item nesta categoria.'}</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}

// ============================================
// SHOP CARD COMPONENT
// ============================================

function ShopCard({ item, status, purchasing, onPurchase }: { item: ShopItem; status: 'owned' | 'affordable' | 'locked'; purchasing: boolean; onPurchase: () => void }) {
    const scale = useRef(new Animated.Value(1)).current;
    const config = CATEGORY_CONFIG[item.type as CategoryFilter] || CATEGORY_CONFIG.all;
    const glow = RARITY_GLOW[item.type] || RARITY_GLOW.badge;

    return (
        <Pressable
            onPress={() => status === 'affordable' && onPurchase()}
            onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
            disabled={status === 'owned' || purchasing}
        >
            <Animated.View style={[styles.shopCard, { transform: [{ scale }] }, status === 'owned' && styles.shopCardOwned, status === 'locked' && styles.shopCardLocked]}>
                {/* Glow */}
                {status === 'affordable' && <View style={[styles.shopCardGlow, { backgroundColor: glow }]} />}

                {/* Owned Badge */}
                {status === 'owned' && (
                    <View style={styles.ownedRibbon}>
                        <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.ownedRibbonGradient}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                        </LinearGradient>
                    </View>
                )}

                {/* Preview */}
                <LinearGradient colors={[`${config.gradient[0]}30`, `${config.gradient[1]}10`]} style={styles.shopCardPreview}>
                    {item.icon_url ? (
                        <Image source={{ uri: item.icon_url }} style={styles.shopCardImage} />
                    ) : (
                        <View style={styles.shopCardIconWrap}>
                            <LinearGradient colors={config.gradient} style={styles.shopCardIconGradient}>
                                <Ionicons name={config.icon} size={32} color="#FFF" />
                            </LinearGradient>
                        </View>
                    )}
                </LinearGradient>

                {/* Info */}
                <View style={styles.shopCardInfo}>
                    <Text style={styles.shopCardName} numberOfLines={1}>{item.name}</Text>
                    {item.description && <Text style={styles.shopCardDesc} numberOfLines={2}>{item.description}</Text>}

                    {/* Type Badge */}
                    <View style={[styles.typeBadge, { backgroundColor: `${config.gradient[0]}20` }]}>
                        <Text style={[styles.typeBadgeText, { color: config.gradient[0] }]}>{config.emoji} {config.label}</Text>
                    </View>
                </View>

                {/* Action */}
                {status === 'owned' ? (
                    <View style={styles.ownedBar}>
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                        <Text style={styles.ownedBarText}>Adquirido</Text>
                    </View>
                ) : (
                    <Pressable style={[styles.buyBar, status === 'locked' && styles.buyBarLocked]} onPress={onPurchase} disabled={status === 'locked' || purchasing}>
                        {purchasing ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name={status === 'locked' ? 'lock-closed' : 'flash'} size={14} color="#FFF" />
                                <Text style={styles.buyBarText}>{item.price} XP</Text>
                            </>
                        )}
                    </Pressable>
                )}
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

    // Balance
    balanceSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
    balanceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, borderRadius: RADIUS['2xl'], overflow: 'hidden', position: 'relative' },
    balanceDecor1: { position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' },
    balanceDecor2: { position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' },
    balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    balanceIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255, 215, 0, 0.2)', alignItems: 'center', justifyContent: 'center' },
    balanceLabel: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.7)' },
    balanceValue: { fontSize: 32, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    earnButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
    earnButtonText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#6366F1' },

    // Categories - Nova estrutura simples
    categoriesContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        gap: SPACING.sm
    },
    categoryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.surfaceElevated
    },
    categoryEmoji: { fontSize: 16 },
    categoryText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary
    },
    categoryTextActive: {
        color: '#FFF',
        fontWeight: TYPOGRAPHY.weight.bold
    },
    categoryBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        marginLeft: 2
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF'
    },

    // Grid
    gridContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
    gridRow: { gap: SPACING.md, marginBottom: SPACING.md },

    // Shop Card
    shopCard: { width: CARD_WIDTH, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
    shopCardOwned: { opacity: 0.7 },
    shopCardLocked: { opacity: 0.5 },
    shopCardGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 80, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'] },
    ownedRibbon: { position: 'absolute', top: 8, right: 8, zIndex: 10 },
    ownedRibbonGradient: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    shopCardPreview: { height: 100, alignItems: 'center', justifyContent: 'center' },
    shopCardImage: { width: 56, height: 56, resizeMode: 'contain' },
    shopCardIconWrap: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
    shopCardIconGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    shopCardInfo: { padding: SPACING.md },
    shopCardName: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary },
    shopCardDesc: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.text.tertiary, marginTop: 4, lineHeight: 16 },
    typeBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, marginTop: SPACING.sm },
    typeBadgeText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.medium },

    // Buttons
    buyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6366F1', paddingVertical: SPACING.sm, marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg },
    buyBarLocked: { backgroundColor: COLORS.text.tertiary },
    buyBarText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },
    ownedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingVertical: SPACING.sm, marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg },
    ownedBarText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: '#22C55E' },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary, marginTop: SPACING.md },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.text.tertiary, marginTop: SPACING.xs },
});
