import { supabase } from '@/lib/supabase';
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
import { Stack, router } from 'expo-router';
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

import { DataSyncProvider } from '@/components/DataSyncProvider';
import { MiniPlayer } from '@/components/MiniPlayer';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TeamInviteHandler } from '@/components/TeamInviteHandler';
import { ToastProvider } from '@/components/ui/Toast';
import { useColorScheme } from '@/components/useColorScheme';
import { CallProvider } from '@/context/CallContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AlertProvider } from '@/providers/AlertProvider';
import { AudioPlayerProvider } from '@/providers/AudioPlayerProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { PresenceProvider } from '@/providers/PresenceProvider';
import { ProfileProvider } from '@/providers/ProfileProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { TeamsProvider } from '@/providers/TeamsProvider';
import { SoundService } from '@/utils/SoundService';
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
      // Pre-load Discord-style sounds for instant playback
      SoundService.initialize();
    }
  }, [loaded]);

  // Handle Deep Linking (Password Reset)
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      // Check for password reset URL
      if (url.includes('reset-password')) {
        try {
          // Extract tokens from hash
          // URL format: escolaa://reset-password#access_token=...&refresh_token=...&type=recovery
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const fragment = url.substring(hashIndex + 1);
            // Simple parser to avoid URLSearchParams issues in some environments/versions if not fully polyfilled
            const params: Record<string, string> = {};
            fragment.split('&').forEach(part => {
              const [key, value] = part.split('=');
              if (key && value) params[key] = decodeURIComponent(value);
            });

            const accessToken = params['access_token'];
            const refreshToken = params['refresh_token'];
            const type = params['type'];

            if (accessToken && refreshToken && type === 'recovery') {
              console.log('🔗 Recuperação de password detetada. A iniciar sessão...');
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!error) {
                // Navigate to reset password screen
                setTimeout(() => {
                  router.replace('/(auth)/reset-password');
                }, 500);
              } else {
                console.error('Erro ao definir sessão:', error);
              }
            }
          }
        } catch (err) {
          console.error('Erro ao processar Deep Link:', err);
        }
      }
    };

    // Check initial URL
    import('expo-linking').then((Linking) => {
      Linking.getInitialURL().then(handleDeepLink);
      const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
      return () => sub.remove();
    });
  }, []);

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

// --------------------------------------------------------------------------
// 🔥 STREAK INITIALIZER
// Deve estar dentro de AuthProvider para ter acesso ao user
// --------------------------------------------------------------------------
import { useAuthContext } from '@/providers/AuthProvider';
import { updateStreakOnSession } from '@/services/streakService';

function StreakInitializer({ children }: { children: React.ReactNode }) {
  const { session } = useAuthContext();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      // Pequeno delay para garantir que tudo carregou
      const timer = setTimeout(() => {
        console.log('🔥 Inicializando streak check...');
        updateStreakOnSession(userId).catch(err => console.error('Erro streak:', err));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  return <>{children}</>;
}

// --------------------------------------------------------------------------
// 🔄 UPDATES HELPER
// Verifica updates OTA ao abrir a app
// --------------------------------------------------------------------------
import { useAlert } from '@/providers/AlertProvider';
import * as Updates from 'expo-updates';
import { AppState } from 'react-native';

function UpdatesHelper({ children }: { children: React.ReactNode }) {
  const { showAlert } = useAlert();

  useEffect(() => {
    async function checkUpdates() {
      if (__DEV__) return; // Não verificar em desenvolvimento

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Prompt user to reload with custom alert
          showAlert({
            title: 'Nova Versão Disponível! 🚀',
            message: 'Uma nova versão da Escola+ foi descarregada. Reiniciar agora para aplicar as melhorias?',
            buttons: [
              { text: 'Agora não', style: 'cancel' },
              {
                text: 'Reiniciar',
                style: 'default',
                onPress: async () => {
                  await Updates.reloadAsync();
                }
              }
            ]
          });
        }
      } catch (error) {
        console.log('Erro ao verificar updates:', error);
      }
    }

    // Check on mount with small delay to ensure alert is ready
    const mountTimer = setTimeout(checkUpdates, 1000);

    // Check on foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkUpdates();
      }
    });

    return () => {
      clearTimeout(mountTimer);
      subscription.remove();
    };
  }, [showAlert]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryProvider>
      <AuthProvider>
        <ProfileProvider>
          <SettingsProvider>
            <DataSyncProvider>
              <AlertProvider>
                <ToastProvider>
                  <CallProvider>
                    <TeamsProvider>
                      <PresenceProvider>
                        <AudioPlayerProvider>
                          <TeamInviteHandler>
                            <PushNotificationsInitializer>
                              <StreakInitializer>
                                <UpdatesHelper>
                                  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                                    <View style={{ flex: 1 }}>
                                      <OfflineBanner />
                                      <Stack screenOptions={{ headerShown: false }}>
                                        <Stack.Screen name="(auth)" />
                                        <Stack.Screen name="(tabs)" />
                                        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
                                      </Stack>
                                      <MiniPlayer />
                                    </View>
                                  </ThemeProvider>
                                </UpdatesHelper>
                              </StreakInitializer>
                            </PushNotificationsInitializer>
                          </TeamInviteHandler>
                        </AudioPlayerProvider>
                      </PresenceProvider>
                    </TeamsProvider>
                  </CallProvider>
                </ToastProvider>
              </AlertProvider>
            </DataSyncProvider>
          </SettingsProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryProvider >
  );
}

