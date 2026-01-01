import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import "../global.css";

// LiveKit WebRTC setup - only for native platforms
import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  // Dynamic import to avoid bundling native code for web
  require('@livekit/react-native').registerGlobals();
}

import { MiniPlayer } from '@/components/MiniPlayer';
import { useColorScheme } from '@/components/useColorScheme';
import { CallProvider } from '@/context/CallContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AudioPlayerProvider } from '@/providers/AudioPlayerProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { ProfileProvider } from '@/providers/ProfileProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { TeamsProvider } from '@/providers/TeamsProvider';
import { View } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Inter - Premium Modern Font
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    // Legacy
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// Componente que inicializa push notifications (deve estar dentro dos providers)
function PushNotificationsInitializer({ children }: { children: React.ReactNode }) {
  const { expoPushToken, isRegistered } = usePushNotifications();

  useEffect(() => {
    if (expoPushToken) {
      console.log('🔔 Push token pronto:', expoPushToken);
      console.log('📝 Registado no Supabase:', isRegistered);
    }
  }, [expoPushToken, isRegistered]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryProvider>
      <AuthProvider>
        <ProfileProvider>
          <CallProvider>
            <TeamsProvider>
              <AudioPlayerProvider>
                <PushNotificationsInitializer>
                  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <View style={{ flex: 1 }}>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
                      </Stack>
                      <MiniPlayer />
                    </View>
                  </ThemeProvider>
                </PushNotificationsInitializer>
              </AudioPlayerProvider>
            </TeamsProvider>
          </CallProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

