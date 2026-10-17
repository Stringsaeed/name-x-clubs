import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { type Colors, palettes, type Scheme } from './tokens';

export const themeKey = 'nxc-theme';

export type ThemePreference = 'system' | Scheme;

export type Theme = Readonly<{
  scheme: Scheme;
  colors: Colors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Flips between dark and light and persists the choice. */
  toggle: () => void;
}>;

const ThemeContext = createContext<Theme | null>(null);

/** Reads a saved `nxc-theme` entry; anything else follows the system. */
export function readThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'dark' || value === 'light' ? value : 'system';
}

function persist(preference: ThemePreference) {
  const write =
    preference === 'system'
      ? AsyncStorage.removeItem(themeKey)
      : AsyncStorage.setItem(themeKey, preference);

  write.catch(() => {});
}

export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: Scheme | null;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference ?? 'system');
  const systemScheme: Scheme = system === 'light' ? 'light' : 'dark';
  const scheme: Scheme = preference === 'system' ? systemScheme : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    persist(next);
  }, []);

  const toggle = useCallback(() => {
    setPreference(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setPreference]);

  const value = useMemo<Theme>(
    () => ({ scheme, colors: palettes[scheme], preference, setPreference, toggle }),
    [scheme, preference, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('ThemeProvider is missing');
  }

  return value;
}

export function useColors(): Colors {
  return useTheme().colors;
}
