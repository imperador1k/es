/**
 * Premium Tabs Layout - Responsive Design
 * Desktop: Fixed Sidebar | Mobile: Floating Tab Bar OR Drawer (configurable)
 */

import { DESKTOP_SIDEBAR_COLLAPSED_WIDTH, DESKTOP_SIDEBAR_WIDTH, DesktopSidebar } from '@/components/DesktopSidebar';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { HamburgerButton, MobileDrawer } from '@/components/MobileDrawer';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { COLORS } from '@/lib/theme.premium';
import { useSettings } from '@/providers/SettingsProvider';
import { TutorialProvider } from '@/providers/TutorialProvider';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Platform, View } from 'react-native';

export default function TabsLayout() {
  const { isDesktop, isMobile } = useBreakpoints();
  const { uiMode } = useSettings();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const toggleSidebar = () => {
    // Simple layout animation for smooth transition
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const currentSidebarWidth = sidebarCollapsed ? DESKTOP_SIDEBAR_COLLAPSED_WIDTH : DESKTOP_SIDEBAR_WIDTH;

  // Determine which mobile navigation to show
  const showBottomTabs = !isDesktop && uiMode === 'tabs';
  const showDrawer = !isDesktop && uiMode === 'drawer';

  return (
    <TutorialProvider>
      <View style={{ flex: 1, backgroundColor: COLORS.background, flexDirection: 'row' }}>
        {/* Desktop Sidebar */}
        {isDesktop && <DesktopSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}

        {/* Main Content Area */}
        <View style={{
          flex: 1,
          marginLeft: isDesktop ? currentSidebarWidth : 0,
          transition: 'margin-left 0.3s ease', // CSS transition for web
        } as any}>
          <Tabs
            screenOptions={{
              headerShown: false,
              // Hide the native tab bar completely
              tabBarStyle: { display: 'none' },
            }}
          >
            {/* Main Tabs (visible in FloatingTabBar) */}
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="calendar" options={{ title: 'Planner' }} />
            <Tabs.Screen name="messages" options={{ title: 'Social' }} />

            {/* Hidden Tabs (accessible via navigation) */}
            <Tabs.Screen name="planner" options={{ href: null }} />
            <Tabs.Screen name="subjects" options={{ href: null }} />
            <Tabs.Screen name="activity" options={{ href: null }} />
            <Tabs.Screen name="teams" options={{ href: null }} />
            <Tabs.Screen name="schedule" options={{ href: null }} />
            <Tabs.Screen name="profile" options={{ href: null }} />
            <Tabs.Screen name="two" options={{ href: null }} />
          </Tabs>
        </View>

        {/* Mobile: Floating Tab Bar (default mode) */}
        {showBottomTabs && <FloatingTabBar />}

        {/* Mobile: Hamburger Button + Drawer (drawer mode) */}
        {showDrawer && (
          <>
            <HamburgerButton onPress={() => setDrawerVisible(true)} />
            <MobileDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
          </>
        )}
      </View>
    </TutorialProvider>
  );
}