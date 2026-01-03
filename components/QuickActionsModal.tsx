/**
 * QuickActionsModal V2 - Premium App Hub
 * TODAS as ações destacadas com gradientes e visual premium
 */

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.92;

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
    size?: 'large' | 'medium' | 'small';
}

// ============================================
// DATA - TODAS AS AÇÕES COM GRADIENTES
// ============================================

const MAIN_ACTIONS: ActionItem[] = [
    {
        id: 'subjects',
        icon: 'book',
        label: 'Disciplinas',
        description: 'Gerir as tuas cadeiras',
        gradient: ['#EC4899', '#F472B6'],
        route: '/(tabs)/subjects',
        size: 'large',
    },
    {
        id: 'study-room',
        icon: 'videocam',
        label: 'Study Room',
        description: 'Estudar com amigos em vídeo',
        gradient: ['#6366F1', '#8B5CF6'],
        route: '/(app)/study-room',
        size: 'large',
    },
];

const PRODUCTIVITY_ACTIONS: ActionItem[] = [
    {
        id: 'planner',
        icon: 'checkmark-circle',
        label: 'Tarefas',
        description: 'Planear estudos',
        gradient: ['#10B981', '#34D399'],
        route: '/(tabs)/planner',
        size: 'medium',
    },
    {
        id: 'calendar',
        icon: 'calendar',
        label: 'Calendário',
        description: 'Agenda e eventos',
        gradient: ['#3B82F6', '#60A5FA'],
        route: '/(tabs)/calendar',
        size: 'medium',
    },
    {
        id: 'focus',
        icon: 'timer',
        label: 'Foco',
        description: 'Pomodoro timer',
        gradient: ['#EF4444', '#F87171'],
        route: '/pomodoro',
        size: 'medium',
    },
    {
        id: 'ai-tutor',
        icon: 'sparkles',
        label: 'AI Tutor',
        description: 'Ajuda inteligente',
        gradient: ['#8B5CF6', '#A78BFA'],
        route: '/(app)/ai-tutor',
        size: 'medium',
    },
];

const SOCIAL_ACTIONS: ActionItem[] = [
    {
        id: 'teams',
        icon: 'people',
        label: 'Equipas',
        description: 'Grupos de estudo',
        gradient: ['#F59E0B', '#FBBF24'],
        route: '/(tabs)/teams',
        size: 'medium',
    },
    {
        id: 'messages',
        icon: 'chatbubbles',
        label: 'Mensagens',
        description: 'Chat com amigos',
        gradient: ['#06B6D4', '#22D3EE'],
        route: '/(tabs)/messages',
        size: 'medium',
    },
    {
        id: 'leaderboard',
        icon: 'trophy',
        label: 'Ranking',
        description: 'Competição semanal',
        gradient: ['#F97316', '#FB923C'],
        route: '/leaderboard',
        size: 'medium',
    },
    {
        id: 'activity',
        icon: 'pulse',
        label: 'Atividade',
        description: 'O teu progresso',
        gradient: ['#84CC16', '#A3E635'],
        route: '/(tabs)/activity',
        size: 'medium',
    },
];

const REWARDS_ACTIONS: ActionItem[] = [
    {
        id: 'shop',
        icon: 'diamond',
        label: 'Loja',
        description: 'Gastar moedas',
        gradient: ['#7C3AED', '#A78BFA'],
        route: '/shop',
        size: 'small',
    },
    {
        id: 'badges',
        icon: 'ribbon',
        label: 'Badges',
        description: 'Conquistas',
        gradient: ['#EC4899', '#F472B6'],
        route: '/badges',
        size: 'small',
    },
    {
        id: 'frames',
        icon: 'image',
        label: 'Molduras',
        description: 'Customizar perfil',
        gradient: ['#14B8A6', '#2DD4BF'],
        route: '/frames',
        size: 'small',
    },
    {
        id: 'consumables',
        icon: 'flask',
        label: 'Consumíveis',
        description: 'Power-ups',
        gradient: ['#F43F5E', '#FB7185'],
        route: '/consumables',
        size: 'small',
    },
];

const UTILITY_ACTIONS: ActionItem[] = [
    {
        id: 'friends',
        icon: 'person-add',
        label: 'Amigos',
        gradient: ['#0EA5E9', '#38BDF8'],
        route: '/friends/search',
        size: 'small',
    },
    {
        id: 'notifications',
        icon: 'notifications',
        label: 'Notificações',
        gradient: ['#EAB308', '#FDE047'],
        route: '/notifications',
        size: 'small',
    },
    {
        id: 'settings',
        icon: 'settings',
        label: 'Definições',
        gradient: ['#64748B', '#94A3B8'],
        route: '/settings',
        size: 'small',
    },
    {
        id: 'profile',
        icon: 'person',
        label: 'Perfil',
        gradient: ['#6366F1', '#818CF8'],
        route: '/(tabs)/profile',
        size: 'small',
    },
];

// ============================================
// ACTION CARD COMPONENT (Visual & Highlighted)
// ============================================

function ActionCard({ item, onPress }: { item: ActionItem; onPress: () => void }) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.95, friction: 8, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
    };

    const isLarge = item.size === 'large';
    const isMedium = item.size === 'medium';
    const isSmall = item.size === 'small';

    if (isLarge) {
        return (
            <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <Animated.View style={[styles.largeCard, { transform: [{ scale }] }]}>
                    <LinearGradient
                        colors={item.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.largeCardGradient}
                    >
                        <View style={styles.largeCardIcon}>
                            <Ionicons name={item.icon as any} size={32} color="#FFF" />
                        </View>
                        <View style={styles.largeCardContent}>
                            <Text style={styles.largeCardLabel}>{item.label}</Text>
                            {item.description && (
                                <Text style={styles.largeCardDescription}>{item.description}</Text>
                            )}
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                </Animated.View>
            </Pressable>
        );
    }

    if (isMedium) {
        return (
            <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.mediumCardWrapper}>
                <Animated.View style={[styles.mediumCard, { transform: [{ scale }] }]}>
                    <LinearGradient
                        colors={item.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.mediumCardIcon}
                    >
                        <Ionicons name={item.icon as any} size={26} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.mediumCardLabel}>{item.label}</Text>
                    {item.description && (
                        <Text style={styles.mediumCardDescription}>{item.description}</Text>
                    )}
                </Animated.View>
            </Pressable>
        );
    }

    // Small
    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.smallCardWrapper}>
            <Animated.View style={[styles.smallCard, { transform: [{ scale }] }]}>
                <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.smallCardIcon}
                >
                    <Ionicons name={item.icon as any} size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.smallCardLabel}>{item.label}</Text>
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
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 22,
                    stiffness: 180,
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
                if (gs.dy > SHEET_HEIGHT * 0.2 || gs.vy > 0.5) {
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
                <Animated.View style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom }]}>
                    {/* Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={styles.handle} />
                        <Text style={styles.sheetTitle}>Hub de Navegação</Text>
                        <Text style={styles.sheetSubtitle}>Todas as funcionalidades da app</Text>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Main Actions (Large Cards) */}
                        <SectionHeader title="Principal" emoji="⭐" />
                        <View style={styles.largeSection}>
                            {MAIN_ACTIONS.map((item) => (
                                <ActionCard key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Productivity (Medium Grid) */}
                        <SectionHeader title="Produtividade" emoji="🚀" />
                        <View style={styles.mediumGrid}>
                            {PRODUCTIVITY_ACTIONS.map((item) => (
                                <ActionCard key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Social (Medium Grid) */}
                        <SectionHeader title="Social" emoji="👥" />
                        <View style={styles.mediumGrid}>
                            {SOCIAL_ACTIONS.map((item) => (
                                <ActionCard key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Rewards (Small Grid) */}
                        <SectionHeader title="Recompensas" emoji="💎" />
                        <View style={styles.smallGrid}>
                            {REWARDS_ACTIONS.map((item) => (
                                <ActionCard key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Utility (Small Grid) */}
                        <SectionHeader title="Utilitários" emoji="⚙️" />
                        <View style={styles.smallGrid}>
                            {UTILITY_ACTIONS.map((item) => (
                                <ActionCard key={item.id} item={item} onPress={() => handleAction(item.route)} />
                            ))}
                        </View>

                        {/* Bottom Padding */}
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

const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const MEDIUM_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const SMALL_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP * 3) / 4;

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    sheetWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        height: SHEET_HEIGHT,
        backgroundColor: '#0C0C0E',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    scrollContent: {
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingBottom: 60,
    },

    // Handle
    handleArea: {
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    handle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 2,
        marginBottom: 14,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    sheetSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },

    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        marginBottom: 14,
    },
    sectionEmoji: {
        fontSize: 18,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },

    // Large Cards
    largeSection: {
        gap: CARD_GAP,
    },
    largeCard: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    largeCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 14,
    },
    largeCardIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeCardContent: {
        flex: 1,
    },
    largeCardLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    largeCardDescription: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 3,
    },

    // Medium Cards (2 per row)
    mediumGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
    },
    mediumCardWrapper: {
        width: MEDIUM_CARD_WIDTH,
    },
    mediumCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 18,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    mediumCardIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    mediumCardLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        textAlign: 'center',
    },
    mediumCardDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 3,
    },

    // Small Cards (4 per row)
    smallGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
    },
    smallCardWrapper: {
        width: SMALL_CARD_WIDTH,
    },
    smallCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    smallCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    smallCardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
    },
});

export default QuickActionsModal;
