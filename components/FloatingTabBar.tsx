/**
 * Floating Tab Bar - Ultra Premium Design
 * Inspired by TripGlide with integrated center button
 */

import { hapticImpact } from '@/hooks/useHaptics';
import { SHADOWS } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { QuickActionsModal } from './QuickActionsModal';

const WalkthroughableView = walkthroughable(View);

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
    { name: 'home', route: '/(tabs)', icon: 'home-outline', iconActive: 'home' },
    { name: 'calendar', route: '/(tabs)/calendar', icon: 'calendar-outline', iconActive: 'calendar' },
    { name: 'messages', route: '/(tabs)/messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
    { name: 'profile', route: '/(tabs)/profile', icon: 'person-outline', iconActive: 'person' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// ============================================
// CENTER BUTTON (Integrated)
// ============================================

function CenterButton({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.4);
    const rotation = useSharedValue(0);

    useEffect(() => {
        // Subtle glow pulse
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ],
    }));

    const animatedGlowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: 1.3 }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
        rotation.value = withSpring(15, { damping: 10 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
        rotation.value = withSpring(0, { damping: 10 });
    };

    return (
        <View style={styles.centerButtonWrapper}>
            {/* Glow Effect */}
            <Animated.View style={[styles.centerButtonGlow, animatedGlowStyle]}>
                <LinearGradient
                    colors={['rgba(99, 102, 241, 0.5)', 'rgba(139, 92, 246, 0.3)', 'transparent']}
                    style={styles.glowGradient}
                />
            </Animated.View>

            {/* Main Button */}
            <AnimatedPressable
                style={[styles.centerButton, animatedButtonStyle]}
                onPress={() => {
                    hapticImpact.medium();
                    onPress();
                }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <LinearGradient
                    colors={['#6366F1', '#8B5CF6', '#A855F7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.centerButtonGradient}
                >
                    <View style={styles.centerButtonInner}>
                        <Ionicons name="add" size={28} color="#FFF" />
                    </View>
                </LinearGradient>
            </AnimatedPressable>
        </View>
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
    const iconScale = useSharedValue(1);
    const bgOpacity = useSharedValue(isActive ? 1 : 0);

    useEffect(() => {
        bgOpacity.value = withSpring(isActive ? 1 : 0, { damping: 15 });
        iconScale.value = withSequence(
            withSpring(isActive ? 1.15 : 1, { damping: 10 }),
            withSpring(1, { damping: 12 })
        );
    }, [isActive]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedBgStyle = useAnimatedStyle(() => ({
        opacity: bgOpacity.value,
        transform: [{ scale: bgOpacity.value * 0.2 + 0.8 }],
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    };

    return (
        <AnimatedPressable
            style={[styles.tabItem, animatedContainerStyle]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            {/* Active Background Pill */}
            <Animated.View style={[styles.tabActiveBg, animatedBgStyle]} />

            {/* Icon */}
            <Animated.View style={animatedIconStyle}>
                <Ionicons
                    name={(isActive ? tab.iconActive : tab.icon) as any}
                    size={24}
                    color={isActive ? '#FFF' : 'rgba(255,255,255,0.5)'}
                />
            </Animated.View>
        </AnimatedPressable>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================



// ... (existing helper functions)

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
        hapticImpact.light();
        router.push(route as any);
    };

    return (
        <>
            <View style={styles.container}>
                {/* Premium Glass Bar */}
                <BlurView
                    intensity={Platform.OS === 'ios' ? 80 : 120}
                    tint="dark"
                    style={styles.barBlur}
                >
                    <View style={styles.barContent}>
                        {/* Left Tabs */}
                        <View style={styles.tabsSection}>
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

                        {/* Center Button (Step 2) */}
                        <CopilotStep text="Toca aqui para criar tarefas, eventos ou usar o AI Tutor! 🚀" order={2} name="fab_add">
                            <WalkthroughableView style={styles.centerButtonWrapper}>
                                <CenterButton onPress={() => setQuickActionsVisible(true)} />
                            </WalkthroughableView>
                        </CopilotStep>

                        {/* Right Tabs */}
                        <View style={styles.tabsSection}>
                            {/* Messages (Step 3) */}
                            <CopilotStep text="Aqui entras nas Salas de Estudo e falas com a tua Squad! 💬" order={3} name="chat_tab">
                                <WalkthroughableView>
                                    <TabItemButton
                                        tab={TABS[2]}
                                        isActive={isActive(TABS[2].route)}
                                        onPress={() => handleTabPress(TABS[2].route)}
                                    />
                                </WalkthroughableView>
                            </CopilotStep>

                            {/* Profile (Step 4) */}
                            <CopilotStep text="O teu perfil! Vê XP, Badges e sobe no Leaderboard! 🏆" order={4} name="profile_tab">
                                <WalkthroughableView>
                                    <TabItemButton
                                        tab={TABS[3]}
                                        isActive={isActive(TABS[3].route)}
                                        onPress={() => handleTabPress(TABS[3].route)}
                                    />
                                </WalkthroughableView>
                            </CopilotStep>
                        </View>
                    </View>

                    {/* Premium Border Glow */}
                    <View style={styles.borderGlow} />
                </BlurView>
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
        bottom: 42,
        left: 20,
        right: 20,
        alignItems: 'center',
    },

    // Bar
    barBlur: {
        width: '100%',
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: 'rgba(20, 22, 28, 0.85)',
    },
    barContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    borderGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        pointerEvents: 'none',
    },

    // Tabs
    tabsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tabItem: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    tabActiveBg: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 26,
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
    },

    // Center Button
    centerButtonWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerButtonGlow: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    glowGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
    },
    centerButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        ...SHADOWS.lg,
    },
    centerButtonGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 29,
        padding: 3,
    },
    centerButtonInner: {
        flex: 1,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
});

export default FloatingTabBar;
