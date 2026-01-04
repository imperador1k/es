/**
 * Premium Tabs Layout
 * Custom FloatingTabBar with hidden native tab bar
 */

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { COLORS } from '@/lib/theme.premium';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { TutorialProvider } from '@/providers/TutorialProvider';

export default function TabsLayout() {
  return (
    <TutorialProvider>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
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

        {/* Custom Floating Tab Bar */}
        <FloatingTabBar />
      </View>
    </TutorialProvider>
  );
}