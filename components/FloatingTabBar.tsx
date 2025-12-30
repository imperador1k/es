/**
 * Floating Tab Bar - Premium Design
 * Glassmorphism navigation with elegant FAB
 */

import { COLORS, RADIUS, SHADOWS, SPACING } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { QuickActionsModal } from './QuickActionsModal';

// ============================================
// TYPES
// ============================================

interface TabItem {
    name: string;
    route: string;
    icon: string;
    iconActive: string;
}

// ============================================
// DATA
// ============================================

const TABS: TabItem[] = [
    { name: 'index', route: '/(tabs)', icon: 'home-outline', iconActive: 'home' },
    { name: 'calendar', route: '/(tabs)/calendar', icon: 'calendar-outline', iconActive: 'calendar' },
    { name: 'messages', route: '/(tabs)/messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// SIMPLE FAB BUTTON
// ============================================

function SimpleFAB({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.95, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    return (
        <AnimatedPressable
            style={[styles.fabButton, animatedStyle]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
            >
                <Ionicons name="add" size={26} color="#FFF" />
            </LinearGradient>
        </AnimatedPressable>
    );
}

// ============================================
// TAB ITEM
// ============================================

function TabItemButton({
    tab,
    isActive,
    onPress,
}: {
    tab: TabItem;
    isActive: boolean;
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.85, { damping: 15 });
        translateY.value = withSpring(-2);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10 });
        translateY.value = withSpring(0);
    };

    return (
        <AnimatedPressable
            style={[styles.tabItem, animatedStyle]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <View style={[styles.tabIconContainer, isActive && styles.tabIconContainerActive]}>
                <Ionicons
                    name={(isActive ? tab.iconActive : tab.icon) as any}
                    size={22}
                    color={isActive ? COLORS.text.primary : COLORS.text.tertiary}
                />
            </View>
        </AnimatedPressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FloatingTabBar() {
    const pathname = usePathname();
    const [quickActionsVisible, setQuickActionsVisible] = useState(false);

    const isActive = (route: string) => {
        if (route === '/(tabs)') {
            return pathname === '/' || pathname === '/(tabs)' || pathname === '/index';
        }
        return pathname.includes(route.replace('/(tabs)', ''));
    };

    const handleTabPress = (route: string) => {
        router.push(route as any);
    };

    return (
        <>
            <View style={styles.container}>
                {/* Bar Background */}
                <View style={styles.barContainer}>
                    <BlurView intensity={60} tint="dark" style={styles.blurBar}>
                        {/* Left Tabs */}
                        <View style={styles.tabsGroup}>
                            <TabItemButton
                                tab={TABS[0]}
                                isActive={isActive(TABS[0].route)}
                                onPress={() => handleTabPress(TABS[0].route)}
                            />
                            <TabItemButton
                                tab={TABS[1]}
                                isActive={isActive(TABS[1].route)}
                                onPress={() => handleTabPress(TABS[1].route)}
                            />
                        </View>

                        {/* Center Spacer for FAB */}
                        <View style={styles.fabSpacer} />

                        {/* Right Tabs */}
                        <View style={styles.tabsGroup}>
                            <TabItemButton
                                tab={TABS[2]}
                                isActive={isActive(TABS[2].route)}
                                onPress={() => handleTabPress(TABS[2].route)}
                            />
                            <TabItemButton
                                tab={{ name: 'profile', route: '/(tabs)/profile', icon: 'person-outline', iconActive: 'person' }}
                                isActive={isActive('/(tabs)/profile')}
                                onPress={() => handleTabPress('/(tabs)/profile')}
                            />
                        </View>
                    </BlurView>
                </View>

                {/* Floating FAB */}
                <SimpleFAB onPress={() => setQuickActionsVisible(!quickActionsVisible)} />
            </View>

            {/* Quick Actions Modal */}
            <QuickActionsModal
                visible={quickActionsVisible}
                onClose={() => setQuickActionsVisible(false)}
            />
        </>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 36,
        left: 16,
        right: 16,
        alignItems: 'center',
    },
    barContainer: {
        width: '100%',
    },
    blurBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS['3xl'],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        backgroundColor: 'rgba(24, 26, 32, 0.8)',
    },
    tabsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    tabItem: {
        padding: SPACING.sm,
    },
    tabIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIconContainerActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    fabSpacer: {
        width: 60,
    },

    // FAB
    fabButton: {
        position: 'absolute',
        top: -10,
        ...SHADOWS.md,
    },
    fabGradient: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.background,
    },
});

export default FloatingTabBar;
