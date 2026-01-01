/**
 * QuickActionsModal - Full App Hub
 * Todas as páginas da app organizadas por importância
 */

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// ============================================
// TYPES
// ============================================

interface QuickActionsModalProps {
    visible: boolean;
    onClose: () => void;
}

interface ActionItem {
    id: string;
    icon: string;
    label: string;
    description?: string;
    gradient: [string, string];
    route: string;
    featured?: boolean;
}

interface QuickLink {
    id: string;
    icon: string;
    label: string;
    route: string;
}

// ============================================
// DATA - Organized by Category
// ============================================

// Featured Actions (Biggest - Top Priority)
const FEATURED_ACTIONS: ActionItem[] = [
    {
        id: 'subjects',
        icon: 'book',
        label: 'Disciplinas',
        description: 'Gerir cadeiras',
        gradient: ['#EC4899', '#F472B6'],
        route: '/(tabs)/subjects',
        featured: true,
    },
    {
        id: 'study-room',
        icon: 'people',
        label: 'Study Room',
        description: 'Estudar em grupo',
        gradient: ['#6366F1', '#8B5CF6'],
        route: '/(app)/study-room',
        featured: true,
    },
];

// Primary Actions (Important)
const PRIMARY_ACTIONS: ActionItem[] = [
    {
        id: 'tasks',
        icon: 'checkmark-circle',
        label: 'Tarefas',
        description: 'Planear estudos',
        gradient: ['#10B981', '#34D399'],
        route: '/(tabs)/planner',
    },
    {
        id: 'activity',
        icon: 'pulse',
        label: 'Atividade',
        description: 'O teu progresso',
        gradient: ['#F59E0B', '#FBBF24'],
        route: '/(tabs)/activity',
    },
    {
        id: 'focus',
        icon: 'timer',
        label: 'Foco',
        description: 'Pomodoro timer',
        gradient: ['#EF4444', '#F87171'],
        route: '/pomodoro',
    },
    {
        id: 'ai-tutor',
        icon: 'sparkles',
        label: 'AI Tutor',
        description: 'Ajuda inteligente',
        gradient: ['#8B5CF6', '#A78BFA'],
        route: '/(app)/ai-tutor',
    },
];

// Secondary Quick Links
const SOCIAL_LINKS: QuickLink[] = [
    { id: 'teams', icon: 'people-outline', label: 'Equipas', route: '/(tabs)/teams' },
    { id: 'leaderboard', icon: 'trophy-outline', label: 'Ranking', route: '/leaderboard' },
    { id: 'badges', icon: 'ribbon-outline', label: 'Badges', route: '/badges' },
];

const SHOP_LINKS: QuickLink[] = [
    { id: 'shop', icon: 'diamond-outline', label: 'Loja', route: '/shop' },
    { id: 'frames', icon: 'image-outline', label: 'Molduras', route: '/frames' },
    { id: 'consumables', icon: 'flask-outline', label: 'Consumíveis', route: '/consumables' },
];

const UTILITY_LINKS: QuickLink[] = [
    { id: 'calendar', icon: 'calendar-outline', label: 'Calendário', route: '/(tabs)/calendar' },
    { id: 'messages', icon: 'chatbubble-outline', label: 'Mensagens', route: '/(tabs)/messages' },
    { id: 'settings', icon: 'settings-outline', label: 'Definições', route: '/settings' },
];

// ============================================
// FEATURED CARD (Big, Beautiful)
// ============================================

function FeaturedCard({
    action,
    onPress,
}: {
    action: ActionItem;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.featuredCard, { transform: [{ scale }] }]}>
                <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredGradient}
                >
                    <View style={styles.featuredIconWrap}>
                        <Ionicons name={action.icon as any} size={32} color="#FFF" />
                    </View>
                    <View style={styles.featuredContent}>
                        <Text style={styles.featuredLabel}>{action.label}</Text>
                        {action.description && (
                            <Text style={styles.featuredDescription}>{action.description}</Text>
                        )}
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// PRIMARY ACTION BUTTON
// ============================================

function PrimaryActionButton({
    action,
    onPress,
}: {
    action: ActionItem;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.primaryButton, { transform: [{ scale }] }]}>
                <LinearGradient
                    colors={action.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradient}
                >
                    <Ionicons name={action.icon as any} size={26} color="#FFF" />
                </LinearGradient>
                <Text style={styles.primaryLabel}>{action.label}</Text>
                {action.description && (
                    <Text style={styles.primaryDescription}>{action.description}</Text>
                )}
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// QUICK LINK CHIP
// ============================================

function QuickLinkChip({
    item,
    onPress,
}: {
    item: QuickLink;
    onPress: () => void;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.quickChip, { transform: [{ scale }] }]}>
                <View style={styles.quickChipIcon}>
                    <Ionicons name={item.icon as any} size={18} color={COLORS.text.secondary} />
                </View>
                <Text style={styles.quickChipLabel}>{item.label}</Text>
            </Animated.View>
        </Pressable>
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

export function QuickActionsModal({ visible, onClose }: QuickActionsModalProps) {
    const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const closeWithAnimation = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SHEET_HEIGHT,
                duration: 200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const handleAction = (route: string) => {
        closeWithAnimation();
        setTimeout(() => router.push(route as any), 200);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > Math.abs(gs.dx) && gs.dy > 5,
            onPanResponderGrant: () => translateY.stopAnimation(),
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) {
                    translateY.setValue(gs.dy);
                    backdropOpacity.setValue(Math.max(0, 1 - gs.dy / SHEET_HEIGHT));
                }
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > SHEET_HEIGHT * 0.25 || gs.vy > 0.5) {
                    closeWithAnimation();
                } else {
                    Animated.parallel([
                        Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 150, useNativeDriver: true }),
                        Animated.spring(backdropOpacity, { toValue: 1, useNativeDriver: true }),
                    ]).start();
                }
            },
        })
    ).current;

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeWithAnimation} statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation} />
            </Animated.View>

            {/* Bottom Sheet */}
            <View style={styles.sheetWrapper}>
                <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
                    {/* Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={styles.handle} />
                        <Text style={styles.sheetTitle}>Acesso Rápido</Text>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Featured Section - Biggest */}
                        <SectionHeader title="Essencial" emoji="⭐" />
                        <View style={styles.featuredSection}>
                            {FEATURED_ACTIONS.map((action) => (
                                <FeaturedCard key={action.id} action={action} onPress={() => handleAction(action.route)} />
                            ))}
                        </View>

                        {/* Primary Actions Grid */}
                        <SectionHeader title="Produtividade" emoji="🚀" />
                        <View style={styles.primaryGrid}>
                            {PRIMARY_ACTIONS.map((action) => (
                                <PrimaryActionButton key={action.id} action={action} onPress={() => handleAction(action.route)} />
                            ))}
                        </View>

                        {/* Social Links */}
                        <SectionHeader title="Social" emoji="👥" />
                        <View style={styles.chipsRow}>
                            {SOCIAL_LINKS.map((item) => (
                                <QuickLinkChip key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Shop Links */}
                        <SectionHeader title="Loja & Customização" emoji="💎" />
                        <View style={styles.chipsRow}>
                            {SHOP_LINKS.map((item) => (
                                <QuickLinkChip key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Utility Links */}
                        <SectionHeader title="Utilitários" emoji="⚙️" />
                        <View style={styles.chipsRow}>
                            {UTILITY_LINKS.map((item) => (
                                <QuickLinkChip key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Bottom Spacing */}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    sheetWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        height: SHEET_HEIGHT,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 60,
    },

    // Handle
    handleArea: {
        alignItems: 'center',
        paddingTop: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        marginBottom: SPACING.md,
    },
    sheetTitle: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: COLORS.text.primary,
    },

    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.lg,
        marginBottom: SPACING.md,
    },
    sectionEmoji: {
        fontSize: 18,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Featured Cards (Big, Horizontal)
    featuredSection: {
        gap: SPACING.md,
    },
    featuredCard: {
        borderRadius: RADIUS['2xl'],
        overflow: 'hidden',
    },
    featuredGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        gap: SPACING.md,
    },
    featuredIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredContent: {
        flex: 1,
    },
    featuredLabel: {
        fontSize: TYPOGRAPHY.size.lg,
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
    },
    featuredDescription: {
        fontSize: TYPOGRAPHY.size.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

    // Primary Actions Grid (2x2)
    primaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    primaryButton: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    primaryGradient: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    primaryLabel: {
        fontSize: TYPOGRAPHY.size.base,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: COLORS.text.primary,
        textAlign: 'center',
    },
    primaryDescription: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        marginTop: 2,
    },

    // Quick Links Chips
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    quickChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.full,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    quickChipIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickChipLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.medium,
        color: COLORS.text.secondary,
    },
});

export default QuickActionsModal;
