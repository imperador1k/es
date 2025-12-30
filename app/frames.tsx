/**
 * Frames Screen - Gerir Molduras de Avatar
 * Ver molduras adquiridas e equipar/desequipar
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

interface FrameItem {
    id: string;
    item_id: string;
    shop_item: {
        id: string;
        name: string;
        description: string | null;
        config: {
            border_color: string;
            border_width: number;
            glow_color?: string;
            glow?: boolean;
            legendary?: boolean;
        };
    };
}

// ============================================
// COMPONENT
// ============================================

export default function FramesScreen() {
    const { user } = useAuthContext();
    const { profile, refetchProfile } = useProfile();

    const [frames, setFrames] = useState<FrameItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [equipping, setEquipping] = useState<string | null>(null);

    const headerAnim = useRef(new Animated.Value(0)).current;

    // ============================================
    // LOAD DATA
    // ============================================

    const loadFrames = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Buscar itens do inventário que são molduras (type = 'avatar_frame')
            const { data, error } = await supabase
                .from('user_inventory')
                .select(`
                    id,
                    item_id,
                    shop_item:shop_items!inner (
                        id,
                        name,
                        description,
                        config,
                        type
                    )
                `)
                .eq('user_id', user.id);

            if (error) throw error;

            console.log('📦 Inventário raw:', JSON.stringify(data, null, 2));

            // Filtrar apenas molduras (type = 'avatar_frame')
            const frameItems = (data || [])
                .filter((item: any) => {
                    const shopItem = Array.isArray(item.shop_item) ? item.shop_item[0] : item.shop_item;
                    return shopItem?.type === 'avatar_frame';
                })
                .map((item: any) => ({
                    ...item,
                    shop_item: Array.isArray(item.shop_item) ? item.shop_item[0] : item.shop_item,
                }));

            console.log('🖼️ Molduras filtradas:', frameItems.length);
            setFrames(frameItems);

            Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
        } catch (err) {
            console.error('Erro ao carregar molduras:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => { loadFrames(); }, [loadFrames]);

    // ============================================
    // EQUIP/UNEQUIP
    // ============================================

    const handleEquip = async (itemId: string) => {
        if (!user?.id) return;

        setEquipping(itemId);
        try {
            const { data, error } = await supabase.rpc('equip_frame', {
                p_user_id: user.id,
                p_item_id: itemId,
            });

            if (error) throw error;

            if (data?.success) {
                Alert.alert('✅ Moldura Equipada!', data.message);
                refetchProfile();
            } else {
                Alert.alert('Erro', data?.error || 'Não foi possível equipar.');
            }
        } catch (err: any) {
            Alert.alert('Erro', err.message);
        } finally {
            setEquipping(null);
        }
    };

    const handleUnequip = async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase.rpc('unequip_frame', {
                p_user_id: user.id,
            });

            if (error) throw error;

            if (data?.success) {
                Alert.alert('✅ Moldura Removida', data.message);
                refetchProfile();
            }
        } catch (err: any) {
            Alert.alert('Erro', err.message);
        }
    };

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#EC4899" />
                    <Text style={styles.loadingText}>A carregar molduras...</Text>
                </View>
            </View>
        );
    }

    const equippedFrameId = profile?.equipped_frame;

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <Animated.View style={[styles.header, { opacity: headerAnim }]}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text.primary} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>🖼️ Molduras</Text>
                        <Text style={styles.headerSubtitle}>{frames.length} molduras</Text>
                    </View>
                    <Pressable style={styles.shopButton} onPress={() => router.push('/shop')}>
                        <Ionicons name="cart" size={20} color="#EC4899" />
                    </Pressable>
                </Animated.View>

                {/* Current Frame */}
                {equippedFrameId && (
                    <View style={styles.currentSection}>
                        <Text style={styles.sectionLabel}>MOLDURA ATUAL</Text>
                        <Pressable style={styles.currentFrameCard} onPress={handleUnequip}>
                            <LinearGradient colors={['rgba(236, 72, 153, 0.2)', 'rgba(219, 39, 119, 0.1)']} style={styles.currentFrameGradient}>
                                <Text style={styles.currentFrameEmoji}>🖼️</Text>
                                <Text style={styles.currentFrameLabel}>Remover Moldura</Text>
                                <Ionicons name="close-circle" size={20} color="#EC4899" />
                            </LinearGradient>
                        </Pressable>
                    </View>
                )}

                {/* Frames List */}
                <Text style={styles.sectionTitle}>Tuas Molduras</Text>

                <FlatList
                    data={frames}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadFrames(); }}
                            tintColor="#EC4899"
                        />
                    }
                    renderItem={({ item }) => {
                        const config = item.shop_item.config;
                        const isEquipped = equippedFrameId === item.item_id;
                        const isEquipping = equipping === item.item_id;

                        return (
                            <Pressable
                                style={[styles.frameCard, isEquipped && styles.frameCardEquipped]}
                                onPress={() => !isEquipped && handleEquip(item.item_id)}
                                disabled={isEquipping}
                            >
                                {/* Preview */}
                                <View style={styles.framePreview}>
                                    {/* Glow */}
                                    {config.glow && (
                                        <View style={[styles.frameGlow, { backgroundColor: config.glow_color }]} />
                                    )}
                                    {/* Avatar Preview */}
                                    <View style={[
                                        styles.avatarPreview,
                                        {
                                            borderColor: config.border_color,
                                            borderWidth: config.border_width,
                                        }
                                    ]}>
                                        <Text style={styles.avatarPreviewText}>👤</Text>
                                    </View>
                                </View>

                                {/* Info */}
                                <Text style={styles.frameName} numberOfLines={1}>{item.shop_item.name}</Text>

                                {/* Button */}
                                {isEquipped ? (
                                    <View style={styles.equippedBadge}>
                                        <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                                        <Text style={styles.equippedBadgeText}>Equipada</Text>
                                    </View>
                                ) : (
                                    <Pressable
                                        style={[styles.equipButton, { backgroundColor: config.border_color }]}
                                        onPress={() => handleEquip(item.item_id)}
                                        disabled={isEquipping}
                                    >
                                        {isEquipping ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Text style={styles.equipButtonText}>Equipar</Text>
                                        )}
                                    </Pressable>
                                )}
                            </Pressable>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🖼️</Text>
                            <Text style={styles.emptyTitle}>Sem Molduras</Text>
                            <Text style={styles.emptySubtitle}>Compra molduras na loja para personalizar o teu avatar!</Text>
                            <Pressable style={styles.emptyButton} onPress={() => router.push('/shop')}>
                                <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.emptyButtonGradient}>
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
    shopButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(236, 72, 153, 0.15)', alignItems: 'center', justifyContent: 'center' },

    // Current Frame
    currentSection: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    sectionLabel: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text.tertiary, letterSpacing: 1, marginBottom: SPACING.sm },
    currentFrameCard: { borderRadius: RADIUS['2xl'], overflow: 'hidden' },
    currentFrameGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg },
    currentFrameEmoji: { fontSize: 24 },
    currentFrameLabel: { flex: 1, fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.primary },

    // Section
    sectionTitle: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.secondary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },

    // Grid
    gridContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
    gridRow: { gap: SPACING.md, marginBottom: SPACING.md },

    // Frame Card
    frameCard: { flex: 1, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS['2xl'], padding: SPACING.md, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    frameCardEquipped: { borderColor: '#22C55E' },
    framePreview: { position: 'relative', marginBottom: SPACING.md },
    frameGlow: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 40, opacity: 0.5 },
    avatarPreview: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
    avatarPreviewText: { fontSize: 28 },
    frameName: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: COLORS.text.primary, marginBottom: SPACING.sm, textAlign: 'center' },
    equippedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
    equippedBadgeText: { fontSize: TYPOGRAPHY.size.xs, fontWeight: TYPOGRAPHY.weight.semibold, color: '#22C55E' },
    equipButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg },
    equipButtonText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: '#FFF' },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text.primary, marginTop: SPACING.md },
    emptySubtitle: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text.tertiary, marginTop: SPACING.xs, textAlign: 'center', paddingHorizontal: SPACING.xl },
    emptyButton: { marginTop: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden' },
    emptyButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING['2xl'], paddingVertical: SPACING.md },
    emptyButtonText: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: '#FFF' },
});
