/**
 * Desktop Sidebar Navigation
 * Discord/Twitter style fixed sidebar for desktop screens
 * Only renders when isDesktop is true
 */

import { useBreakpoints } from '@/hooks/useBreakpoints';
import { COLORS, SHADOWS } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

// ============================================
// TYPES
// ============================================

interface NavItem {
    name: string;
    label: string;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
}

// ============================================
// NAVIGATION ITEMS
// ============================================

const NAV_ITEMS: NavItem[] = [
    { name: 'home', label: 'Início', route: '/(tabs)', icon: 'home-outline', iconActive: 'home' },
    { name: 'schedule', label: 'Horário', route: '/(tabs)/schedule', icon: 'time-outline', iconActive: 'time' },
    { name: 'calendar', label: 'Calendário', route: '/(tabs)/calendar', icon: 'calendar-outline', iconActive: 'calendar' },
    { name: 'planner', label: 'Planner', route: '/(tabs)/planner', icon: 'clipboard-outline', iconActive: 'clipboard' },
    { name: 'subjects', label: 'Matérias', route: '/(tabs)/subjects', icon: 'book-outline', iconActive: 'book' },
    { name: 'teams', label: 'Equipas', route: '/(tabs)/teams', icon: 'people-outline', iconActive: 'people' },
    { name: 'messages', label: 'Mensagens', route: '/(tabs)/messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
    { name: 'profile', label: 'Perfil', route: '/(tabs)/profile', icon: 'person-outline', iconActive: 'person' },
];

const QUICK_ACTIONS: NavItem[] = [
    { name: 'study-room', label: 'Sala de Estudo', route: '/(app)/study-room', icon: 'headset-outline', iconActive: 'headset' },
    { name: 'pomodoro', label: 'Foco', route: '/pomodoro', icon: 'timer-outline', iconActive: 'timer' },
    { name: 'leaderboard', label: 'Ranking', route: '/leaderboard', icon: 'trophy-outline', iconActive: 'trophy' },
    { name: 'badges', label: 'Conquistas', route: '/badges', icon: 'medal-outline', iconActive: 'medal' },
    { name: 'shop', label: 'Loja', route: '/shop', icon: 'cart-outline', iconActive: 'cart' },
];

// ============================================
// NAV ITEM COMPONENT
// ============================================

function SidebarItemNative({ item, isActive, onPress, collapsed }: { item: NavItem; isActive: boolean; onPress: () => void; collapsed: boolean }) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    return (
        <Animated.View style={animatedStyle}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[styles.navItem, isActive && styles.navItemActive, collapsed && styles.navItemCollapsed]}
            >
                {isActive && (
                    <LinearGradient
                        colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <View style={[styles.activeIndicator, isActive && styles.activeIndicatorVisible]} />
                <Ionicons
                    name={isActive ? item.iconActive : item.icon}
                    size={22}
                    color={isActive ? '#6366F1' : COLORS.text.secondary}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive, collapsed && { display: 'none' }]}>
                    {item.label}
                </Text>
            </Pressable>
        </Animated.View>
    );
}

function SidebarItemWeb({ item, isActive, onPress, collapsed }: { item: NavItem; isActive: boolean; onPress: () => void; collapsed: boolean }) {
    return (
        <View>
            <Pressable
                onPress={onPress}
                style={[styles.navItem, isActive && styles.navItemActive, collapsed && styles.navItemCollapsed]}
            >
                {isActive && (
                    <LinearGradient
                        colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <View style={[styles.activeIndicator, isActive && styles.activeIndicatorVisible]} />
                <Ionicons
                    name={isActive ? item.iconActive : item.icon}
                    size={22}
                    color={isActive ? '#6366F1' : COLORS.text.secondary}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive, collapsed && { display: 'none' }]}>
                    {item.label}
                </Text>
            </Pressable>
        </View>
    );
}

function SidebarItem(props: { item: NavItem; isActive: boolean; onPress: () => void; collapsed: boolean }) {
    if (Platform.OS === 'web') return <SidebarItemWeb {...props} />;
    return <SidebarItemNative {...props} />;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DesktopSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    const { isDesktop } = useBreakpoints();
    const pathname = usePathname();

    // Don't render on mobile/tablet
    if (!isDesktop) return null;

    const isActive = (route: string) => {
        if (route === '/(tabs)') {
            return pathname === '/' || pathname === '/(tabs)';
        }
        return pathname.startsWith(route.replace('/(tabs)', ''));
    };

    const handleNavPress = (route: string) => {
        router.push(route as any);
    };

    const ContainerComponent = Platform.OS === 'web' ? View : Animated.View;

    return (
        <ContainerComponent style={[styles.container, { width: collapsed ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_WIDTH }]}>
            <BlurView intensity={80} tint="dark" style={styles.sidebar}>
                {/* Logo/Brand */}
                <View style={[styles.header, collapsed && styles.headerCollapsed]}>
                    <Pressable onPress={onToggle}>
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.logoGradient}
                        >
                            <Text style={styles.logoText}>E+</Text>
                        </LinearGradient>
                    </Pressable>
                    {!collapsed && <Text style={styles.brandText}>Escola+</Text>}
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {/* Main Navigation */}
                    <View style={styles.navSection}>
                        {!collapsed && <Text style={styles.sectionLabel}>MENU</Text>}
                        {NAV_ITEMS.map((item) => (
                            <SidebarItem
                                key={item.name}
                                item={item}
                                isActive={isActive(item.route)}
                                onPress={() => handleNavPress(item.route)}
                                collapsed={collapsed}
                            />
                        ))}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.navSection}>
                        {!collapsed && <Text style={styles.sectionLabel}>AÇÕES RÁPIDAS</Text>}
                        {QUICK_ACTIONS.map((item) => (
                            <SidebarItem
                                key={item.name}
                                item={item}
                                isActive={isActive(item.route)}
                                onPress={() => handleNavPress(item.route)}
                                collapsed={collapsed}
                            />
                        ))}
                    </View>
                </ScrollView>

                {/* Footer - Toggle Button */}
                <View style={styles.footer}>
                    <Pressable
                        style={[styles.footerItem, collapsed && styles.footerItemCollapsed]}
                        onPress={onToggle}
                    >
                        <Ionicons
                            name={collapsed ? "chevron-forward" : "chevron-back"}
                            size={20}
                            color={COLORS.text.tertiary}
                        />
                        {!collapsed && <Text style={styles.footerText}>Recolher Menu</Text>}
                    </Pressable>
                    <Pressable style={[styles.footerItem, collapsed && styles.footerItemCollapsed]} onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={20} color={COLORS.text.tertiary} />
                        {!collapsed && <Text style={styles.footerText}>Definições</Text>}
                    </Pressable>
                </View>
            </BlurView>
        </ContainerComponent>
    );
}

// ============================================
// STYLES
// ============================================

export const DESKTOP_SIDEBAR_WIDTH = 260;
export const DESKTOP_SIDEBAR_COLLAPSED_WIDTH = 80;

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
    },
    sidebar: {
        flex: 1,
        backgroundColor: 'rgba(13, 13, 20, 0.95)',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
        marginBottom: 16,
        overflow: 'hidden',
    },
    headerCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    logoGradient: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.glow,
    },
    logoText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF',
    },
    brandText: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: COLORS.text.primary,
        marginLeft: 12,
    },

    // Navigation
    navSection: {
        paddingHorizontal: 12,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.text.tertiary,
        letterSpacing: 1,
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
        overflow: 'hidden',
    },
    navItemCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    navItemActive: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    activeIndicator: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: 2,
        backgroundColor: 'transparent',
    },
    activeIndicatorVisible: {
        backgroundColor: '#6366F1',
    },
    navLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text.secondary,
        marginLeft: 12,
    },
    navLabelActive: {
        color: '#6366F1',
        fontWeight: '600',
    },

    // Footer
    footer: {
        marginTop: 'auto',
        paddingHorizontal: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    footerItemCollapsed: {
        justifyContent: 'center',
        paddingHorizontal: 0,
    },
    footerText: {
        fontSize: 14,
        color: COLORS.text.tertiary,
        marginLeft: 12,
    },
});


