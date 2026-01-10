/**
 * MobileDrawer - Premium Slide-in Navigation
 * Discord-style overlay drawer for alternative mobile navigation
 */

import { hapticImpact } from '@/hooks/useHaptics';
import { SHADOWS } from '@/lib/theme.premium';
import { useProfile } from '@/providers/ProfileProvider';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

// ============================================
// NAVIGATION DATA
// ============================================

interface NavItem {
    id: string;
    icon: string;
    label: string;
    route: string;
    gradient?: [string, string];
}

interface NavSection {
    title: string;
    emoji: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Principal',
        emoji: '🏠',
        items: [
            { id: 'home', icon: 'home', label: 'Home', route: '/(tabs)' },
            { id: 'calendar', icon: 'calendar', label: 'Calendário', route: '/(tabs)/calendar' },
            { id: 'messages', icon: 'chatbubbles', label: 'Mensagens', route: '/(tabs)/messages' },
            { id: 'profile', icon: 'person', label: 'Perfil', route: '/(tabs)/profile' },
        ]
    },
    {
        title: 'Estudos',
        emoji: '📚',
        items: [
            { id: 'subjects', icon: 'book', label: 'Disciplinas', route: '/(tabs)/subjects', gradient: ['#EC4899', '#F472B6'] },
            { id: 'schedule', icon: 'time', label: 'Horário', route: '/(tabs)/schedule', gradient: ['#F59E0B', '#FBBF24'] },
            { id: 'planner', icon: 'checkmark-circle', label: 'Tarefas', route: '/(tabs)/planner', gradient: ['#10B981', '#34D399'] },
            { id: 'focus', icon: 'timer', label: 'Foco', route: '/pomodoro', gradient: ['#EF4444', '#F87171'] },
        ]
    },
    {
        title: 'Social',
        emoji: '👥',
        items: [
            { id: 'study-room', icon: 'videocam', label: 'Study Room', route: '/(app)/study-room', gradient: ['#6366F1', '#8B5CF6'] },
            { id: 'teams', icon: 'people', label: 'Equipas', route: '/(tabs)/teams', gradient: ['#F59E0B', '#FBBF24'] },
            { id: 'ai-tutor', icon: 'sparkles', label: 'AI Tutor', route: '/(app)/ai-tutor', gradient: ['#8B5CF6', '#A78BFA'] },
            { id: 'leaderboard', icon: 'trophy', label: 'Ranking', route: '/leaderboard', gradient: ['#F97316', '#FB923C'] },
        ]
    },
    {
        title: 'Extras',
        emoji: '💎',
        items: [
            { id: 'shop', icon: 'diamond', label: 'Loja', route: '/shop' },
            { id: 'badges', icon: 'ribbon', label: 'Badges', route: '/badges' },
            { id: 'activity', icon: 'pulse', label: 'Atividade', route: '/(tabs)/activity' },
            { id: 'settings', icon: 'settings', label: 'Definições', route: '/settings' },
        ]
    },
];

// ============================================
// NAV ITEM COMPONENT
// ============================================

function NavItemButton({ item, isActive, onPress }: { item: NavItem; isActive: boolean; onPress: () => void }) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.navItem, isActive && styles.navItemActive, { transform: [{ scale }] }]}>
                {item.gradient ? (
                    <LinearGradient colors={item.gradient} style={styles.navItemIconGradient}>
                        <Ionicons name={item.icon as any} size={18} color="#FFF" />
                    </LinearGradient>
                ) : (
                    <View style={[styles.navItemIcon, isActive && styles.navItemIconActive]}>
                        <Ionicons name={item.icon as any} size={18} color={isActive ? '#FFF' : 'rgba(255,255,255,0.6)'} />
                    </View>
                )}
                <Text style={[styles.navItemLabel, isActive && styles.navItemLabelActive]}>{item.label}</Text>
                {isActive && <View style={styles.activeIndicator} />}
            </Animated.View>
        </Pressable>
    );
}

// ============================================
// MAIN DRAWER COMPONENT
// ============================================

interface MobileDrawerProps {
    visible: boolean;
    onClose: () => void;
}

export function MobileDrawer({ visible, onClose }: MobileDrawerProps) {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const { profile } = useProfile();

    const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateX, { toValue: 0, damping: 20, stiffness: 180, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const closeWithAnimation = () => {
        Animated.parallel([
            Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy) && gs.dx < -10,
            onPanResponderMove: (_, gs) => {
                if (gs.dx < 0) {
                    translateX.setValue(gs.dx);
                    backdropOpacity.setValue(Math.max(0, 1 + gs.dx / DRAWER_WIDTH));
                }
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dx < -50 || gs.vx < -0.5) {
                    closeWithAnimation();
                } else {
                    Animated.parallel([
                        Animated.spring(translateX, { toValue: 0, damping: 15, useNativeDriver: true }),
                        Animated.spring(backdropOpacity, { toValue: 1, useNativeDriver: true }),
                    ]).start();
                }
            },
        })
    ).current;

    const isActive = (route: string) => {
        if (route === '/(tabs)') {
            return pathname === '/' || pathname === '/(tabs)' || pathname === '/index';
        }
        return pathname.includes(route.replace('/(tabs)', '').replace('/(app)', ''));
    };

    const handleNavigation = (route: string) => {
        hapticImpact.light();
        closeWithAnimation();
        setTimeout(() => router.push(route as any), 200);
    };

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation} />
            </Animated.View>

            {/* Drawer */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[styles.drawer, { transform: [{ translateX }], paddingTop: insets.top }]}
            >
                <BlurView intensity={Platform.OS === 'ios' ? 80 : 0} tint="dark" style={StyleSheet.absoluteFill} />

                {/* Profile Header */}
                <Pressable style={styles.profileHeader} onPress={() => handleNavigation('/(tabs)/profile')}>
                    {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
                    ) : (
                        <View style={styles.profileAvatarFallback}>
                            <Text style={styles.profileInitial}>{profile?.username?.[0]?.toUpperCase() || 'U'}</Text>
                        </View>
                    )}
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{profile?.full_name || 'Utilizador'}</Text>
                        <Text style={styles.profileUsername}>@{profile?.username || 'user'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                </Pressable>

                {/* Navigation Sections */}
                <ScrollView
                    style={styles.navScroll}
                    contentContainerStyle={[styles.navContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {NAV_SECTIONS.map((section) => (
                        <View key={section.title} style={styles.navSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </View>
                            {section.items.map((item) => (
                                <NavItemButton
                                    key={item.id}
                                    item={item}
                                    isActive={isActive(item.route)}
                                    onPress={() => handleNavigation(item.route)}
                                />
                            ))}
                        </View>
                    ))}

                    {/* Support Button */}
                    <Pressable
                        style={styles.supportButton}
                        onPress={() => {
                            closeWithAnimation();
                            setTimeout(() => {
                                WebBrowser.openBrowserAsync('https://buymeacoffee.com/imperador1k', {
                                    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                                });
                            }, 200);
                        }}
                    >
                        <LinearGradient colors={['#EC4899', '#F472B6']} style={styles.supportButtonGradient}>
                            <Ionicons name="heart" size={18} color="#FFF" />
                            <Text style={styles.supportButtonText}>Apoiar o Projeto</Text>
                        </LinearGradient>
                    </Pressable>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

// ============================================
// HAMBURGER BUTTON (Floating)
// ============================================

interface HamburgerButtonProps {
    onPress: () => void;
}

export function HamburgerButton({ onPress }: HamburgerButtonProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={[styles.hamburgerWrapper, { transform: [{ scale }] }]}>
            <Pressable
                style={styles.hamburgerButton}
                onPress={() => { hapticImpact.medium(); onPress(); }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <BlurView intensity={Platform.OS === 'ios' ? 80 : 120} tint="dark" style={styles.hamburgerBlur}>
                    <Ionicons name="menu" size={24} color="#FFF" />
                </BlurView>
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    drawer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(20, 22, 28, 0.95)' : '#14161C',
        ...SHADOWS.xl,
    },

    // Profile Header
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        marginBottom: 8,
    },
    profileAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    profileAvatarFallback: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    profileUsername: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },

    // Navigation
    navScroll: {
        flex: 1,
    },
    navContent: {
        paddingHorizontal: 12,
    },
    navSection: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    sectionEmoji: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },

    // Nav Items
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    navItemActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
    },
    navItemIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navItemIconActive: {
        backgroundColor: '#6366F1',
    },
    navItemIconGradient: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navItemLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 12,
    },
    navItemLabelActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    activeIndicator: {
        width: 4,
        height: 20,
        borderRadius: 2,
        backgroundColor: '#6366F1',
    },

    // Support Button
    supportButton: {
        marginTop: 12,
        borderRadius: 14,
        overflow: 'hidden',
    },
    supportButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
    },
    supportButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },

    // Hamburger Button
    hamburgerWrapper: {
        position: 'absolute',
        bottom: 42,
        left: 20,
    },
    hamburgerButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    hamburgerBlur: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(20, 22, 28, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
});

export default MobileDrawer;
