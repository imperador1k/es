/**
 * Shop Screen - Loja de Recompensas
 * Gastar XP em itens, temas e customizações
 */

import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAuthContext } from '@/providers/AuthProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
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

interface OwnedItem {
    item_id: string;
}

type CategoryFilter = 'all' | 'avatar_frame' | 'theme' | 'title' | 'consumable';

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_CONFIG: Record<CategoryFilter, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    all: { label: 'Tudo', icon: 'grid-outline' },
    avatar_frame: { label: 'Molduras', icon: 'person-circle-outline' },
    theme: { label: 'Temas', icon: 'color-palette-outline' },
    title: { label: 'Títulos', icon: 'ribbon-outline' },
    consumable: { label: 'Consumíveis', icon: 'flash-outline' },
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    avatar_frame: 'person-circle',
    theme: 'color-palette',
    title: 'ribbon',
    badge: 'medal',
    consumable: 'flash',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ShopScreen() {
    const { user } = useAuthContext();
    const { profile, refetchProfile } = useProfile();

    const [items, setItems] = useState<ShopItem[]>([]);
    const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

    // ============================================
    // LOAD DATA
    // ============================================

    const loadShopData = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Buscar itens ativos
            const { data: itemsData, error: itemsError } = await supabase
                .from('shop_items')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (itemsError) throw itemsError;
            setItems(itemsData || []);

            // Buscar itens já possuídos
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('user_inventory')
                .select('item_id')
                .eq('user_id', user.id);

            if (inventoryError) throw inventoryError;

            const owned = new Set((inventoryData || []).map((i: OwnedItem) => i.item_id));
            setOwnedItems(owned);

        } catch (err) {
            console.error('Erro ao carregar loja:', err);
            Alert.alert('Erro', 'Não foi possível carregar a loja.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadShopData();
    }, [loadShopData]);

    // Realtime para XP
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`profile:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                () => {
                    refetchProfile();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, refetchProfile]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadShopData();
        refetchProfile();
    };

    // ============================================
    // PURCHASE LOGIC
    // ============================================

    const handlePurchase = async (item: ShopItem) => {
        if (!user?.id) return;

        const userXP = profile?.current_xp || 0;

        // Verificar se já possui
        if (!item.is_consumable && ownedItems.has(item.id)) {
            Alert.alert('Já Adquirido', 'Já possuis este item!');
            return;
        }

        // Verificar XP suficiente
        if (userXP < item.price) {
            Alert.alert(
                'XP Insuficiente',
                `Precisas de ${item.price} XP mas só tens ${userXP} XP.`,
                [{ text: 'OK' }]
            );
            return;
        }

        // Confirmação
        Alert.alert(
            '🛒 Confirmar Compra',
            `Queres comprar "${item.name}" por ${item.price} XP?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Comprar',
                    onPress: async () => {
                        setPurchasing(item.id);

                        try {
                            const { data, error } = await supabase.rpc('purchase_shop_item', {
                                p_user_id: user.id,
                                p_item_id: item.id,
                            });

                            if (error) throw error;

                            if (data?.success) {
                                // Sucesso!
                                Alert.alert(
                                    '🎉 Compra Realizada!',
                                    `Adquiriste "${data.item_name}"!\n\nNovo saldo: ${data.new_xp} XP`,
                                    [{ text: 'Fantástico!' }]
                                );

                                // Atualizar estado local
                                setOwnedItems(prev => new Set([...prev, item.id]));
                                refetchProfile();
                            } else {
                                Alert.alert('Erro', data?.error || 'Não foi possível completar a compra.');
                            }
                        } catch (err: any) {
                            console.error('Erro na compra:', err);
                            Alert.alert('Erro', err.message || 'Erro ao processar compra.');
                        } finally {
                            setPurchasing(null);
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // FILTER & RENDER
    // ============================================

    const filteredItems = activeCategory === 'all'
        ? items
        : items.filter(item => item.type === activeCategory);

    const getItemStatus = (item: ShopItem): 'owned' | 'affordable' | 'locked' => {
        if (!item.is_consumable && ownedItems.has(item.id)) return 'owned';
        if ((profile?.current_xp || 0) >= item.price) return 'affordable';
        return 'locked';
    };

    const renderItem = ({ item }: { item: ShopItem }) => {
        const status = getItemStatus(item);
        const isPurchasing = purchasing === item.id;

        return (
            <Pressable
                style={[
                    styles.itemCard,
                    status === 'owned' && styles.itemCardOwned,
                    status === 'locked' && styles.itemCardLocked,
                ]}
                onPress={() => status === 'affordable' && handlePurchase(item)}
                disabled={status === 'owned' || isPurchasing}
            >
                {/* Preview */}
                <View style={[
                    styles.itemPreview,
                    { backgroundColor: item.preview_color || `${colors.accent.primary}20` },
                ]}>
                    {item.icon_url ? (
                        <Image source={{ uri: item.icon_url }} style={styles.itemImage} />
                    ) : (
                        <Ionicons
                            name={TYPE_ICONS[item.type] || 'gift'}
                            size={40}
                            color={colors.accent.primary}
                        />
                    )}
                    {status === 'owned' && (
                        <View style={styles.ownedBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {item.description && (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                </View>

                {/* Action Button */}
                {status === 'owned' ? (
                    <View style={styles.ownedButton}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success.primary} />
                        <Text style={styles.ownedButtonText}>Adquirido</Text>
                    </View>
                ) : (
                    <Pressable
                        style={[
                            styles.buyButton,
                            status === 'locked' && styles.buyButtonLocked,
                        ]}
                        onPress={() => handlePurchase(item)}
                        disabled={status === 'locked' || isPurchasing}
                    >
                        {isPurchasing ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons
                                    name={status === 'locked' ? 'lock-closed' : 'flash'}
                                    size={14}
                                    color="#FFF"
                                />
                                <Text style={styles.buyButtonText}>{item.price} XP</Text>
                            </>
                        )}
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
                    <Text style={styles.loadingText}>A carregar loja...</Text>
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
                    <Text style={styles.headerTitle}>🛒 Loja</Text>
                    <Text style={styles.headerSubtitle}>Gasta o teu XP em recompensas</Text>
                </View>
            </View>

            {/* XP Balance */}
            <View style={styles.balanceCard}>
                <View style={styles.balanceIcon}>
                    <Ionicons name="flash" size={24} color="#FFD700" />
                </View>
                <View style={styles.balanceInfo}>
                    <Text style={styles.balanceLabel}>Teu Saldo</Text>
                    <Text style={styles.balanceValue}>
                        {(profile?.current_xp || 0).toLocaleString()} XP
                    </Text>
                </View>
                <Pressable
                    style={styles.earnMoreButton}
                    onPress={() => router.push('/(tabs)/calendar' as any)}
                >
                    <Text style={styles.earnMoreText}>Ganhar +</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.accent.primary} />
                </Pressable>
            </View>

            {/* Category Filters */}
            <View style={styles.categoriesContainer}>
                <FlatList
                    horizontal
                    data={Object.entries(CATEGORY_CONFIG) as [CategoryFilter, typeof CATEGORY_CONFIG['all']][]}
                    keyExtractor={([key]) => key}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                    renderItem={({ item: [key, config] }) => (
                        <Pressable
                            style={[
                                styles.categoryChip,
                                activeCategory === key && styles.categoryChipActive,
                            ]}
                            onPress={() => setActiveCategory(key)}
                        >
                            <Ionicons
                                name={config.icon}
                                size={16}
                                color={activeCategory === key ? '#FFF' : colors.text.secondary}
                            />
                            <Text style={[
                                styles.categoryText,
                                activeCategory === key && styles.categoryTextActive,
                            ]}>
                                {config.label}
                            </Text>
                        </Pressable>
                    )}
                />
            </View>

            {/* Items Grid */}
            <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.accent.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="bag-outline" size={64} color={colors.text.tertiary} />
                        <Text style={styles.emptyTitle}>Loja Vazia</Text>
                        <Text style={styles.emptySubtitle}>
                            {activeCategory === 'all'
                                ? 'Ainda não há itens disponíveis.'
                                : 'Não há itens nesta categoria.'}
                        </Text>
                    </View>
                }
            />
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
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
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
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },

    // Balance Card
    balanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.md,
    },
    balanceIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFD70020',
        alignItems: 'center',
        justifyContent: 'center',
    },
    balanceInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    balanceLabel: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    balanceValue: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
    },
    earnMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.accent.subtle,
        borderRadius: borderRadius.lg,
    },
    earnMoreText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.accent.primary,
    },

    // Categories
    categoriesContainer: {
        marginTop: spacing.md,
    },
    categoriesList: {
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    categoryChipActive: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    categoryText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
    },
    categoryTextActive: {
        color: '#FFF',
    },

    // Grid
    gridContent: {
        padding: spacing.md,
    },
    gridRow: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },

    // Item Card
    itemCard: {
        width: '48%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.sm,
    },
    itemCardOwned: {
        opacity: 0.8,
    },
    itemCardLocked: {
        opacity: 0.6,
    },
    itemPreview: {
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    itemImage: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },
    ownedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.success.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemInfo: {
        padding: spacing.md,
    },
    itemName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
    },
    itemDescription: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 4,
    },

    // Buttons
    buyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.accent.primary,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    buyButtonLocked: {
        backgroundColor: colors.text.tertiary,
    },
    buyButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        color: '#FFF',
    },
    ownedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: `${colors.success.primary}15`,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    ownedButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold,
        color: colors.success.primary,
    },

    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['5xl'],
    },
    emptyTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    emptySubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
});
