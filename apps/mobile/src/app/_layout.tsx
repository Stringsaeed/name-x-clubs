import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydrateFeedbackSettings } from '../feedback/feedback';
import { PlayProvider } from '../game/play';
import { loadEntries } from '../game/storage';
import { fontAssets } from '../theme/fonts';
import { readThemePreference, ThemeProvider, themeKey, useTheme } from '../theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Entries = Record<string, string>;

/** The saved entries, read once. Feedback settings are applied before the first render. */
function useEntries() {
  const [entries, setEntries] = useState<Entries | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadEntries()
      .catch((): Entries => ({}))
      .then((saved) => {
        if (cancelled) {
          return;
        }

        hydrateFeedbackSettings(saved);
        setEntries(saved);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return entries;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const entries = useEntries();
  // A font that fails to load falls back to the system face rather than keeping the splash up.
  const ready = (fontsLoaded || fontError !== null) && entries !== null;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  const saved = readThemePreference(entries[themeKey]);

  return (
    <ThemeProvider initialPreference={saved === 'system' ? null : saved}>
      <PlayProvider entries={entries}>
        <SafeAreaProvider>
          <ThemedStack />
        </SafeAreaProvider>
      </PlayProvider>
    </ThemeProvider>
  );
}

/** Inside the providers, so the status bar and screen background follow the theme. */
function ThemedStack() {
  const { scheme, colors } = useTheme();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.paper },
      animation: 'slide_from_right' as const,
    }),
    [colors.paper],
  );

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={screenOptions} />
    </>
  );
}
