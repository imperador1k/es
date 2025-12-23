import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import "../global.css";

import { useColorScheme } from '@/components/useColorScheme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AuthProvider } from '@/providers/AuthProvider';
import { ProfileProvider } from '@/providers/ProfileProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { TeamsProvider } from '@/providers/TeamsProvider';

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
          <TeamsProvider>
            <PushNotificationsInitializer>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
                </Stack>
              </ThemeProvider>
            </PushNotificationsInitializer>
          </TeamsProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

