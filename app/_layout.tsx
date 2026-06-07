import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useNotoFonts,
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_700Bold,
} from '@expo-google-fonts/noto-sans-jp';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { UserProvider, useUser } from '@/context/UserContext';
import { PurchaseProvider } from '@/context/PurchaseContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** テーマに追従する画面スタック（背景色・StatusBar の明暗をテーマから決定する） */
function ThemedStack() {
  const { colors, isDark } = useTheme();
  const { hasOnboarded, loading } = useUser();

  // ユーザー情報ロード完了後、未オンボードならオンボーディング画面へ
  useEffect(() => {
    if (!loading && !hasOnboarded) {
      router.replace('/onboarding');
    }
  }, [loading, hasOnboarded]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'light'} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="theme-select" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/[id]/index" />
          <Stack.Screen name="group/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/[id]/invite" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/[id]/payment/new" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="group/[id]/payment/[paymentId]/edit"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
          <Stack.Screen name="join/[groupId]" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useNotoFonts({
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_700Bold,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    // フォントが読めない環境でもアプリを止めないよう、最大2秒で起動を継続する
    const timer = setTimeout(() => setReady(true), 2000);
    if (fontsLoaded) {
      setReady(true);
      clearTimeout(timer);
    }
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  const onLayout = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <UserProvider>
            <PurchaseProvider>
              <ThemedStack />
            </PurchaseProvider>
          </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
