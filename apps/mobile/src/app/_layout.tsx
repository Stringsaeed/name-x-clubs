import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PlayProvider } from '../play';
import { loadEntries } from '../storage';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito: require('../../../web/src/fonts/nunito.ttf'),
    AlanSans: require('../../../web/src/fonts/alan-sans.ttf'),
  });
  const [entries, setEntries] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadEntries().then((saved) => {
      if (!cancelled) {
        setEntries(saved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && entries) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, entries]);

  if (!fontsLoaded || !entries) {
    return null;
  }

  return (
    <PlayProvider entries={entries}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      />
    </PlayProvider>
  );
}
