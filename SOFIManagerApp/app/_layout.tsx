import { DarkTheme, DefaultTheme, ThemeProvider as NavigationProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ThemeProvider, useTheme } from '@/constants/ThemeContext';
import { PermissionsProvider } from '@/constants/PermissionsContext';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(auth)',
};

function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const [loaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-EB': require('../assets/fonts/Poppins-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <NavigationProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
       <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PermissionsProvider>
        <RootLayoutContent />
      </PermissionsProvider>
    </ThemeProvider>
  );
}
