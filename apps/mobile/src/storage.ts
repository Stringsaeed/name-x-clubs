import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '../../web/src/game/model';
import type { StoragePort } from '../../web/src/game/session/storage';

export const languageKey = 'nxc-language';

export async function loadEntries(): Promise<Record<string, string>> {
  const keys = await AsyncStorage.getAllKeys();

  if (keys.length === 0) {
    return {};
  }

  const pairs = await AsyncStorage.multiGet(keys);
  const entries: Record<string, string> = {};

  for (const pair of pairs) {
    const key = pair[0];
    const value = pair[1];

    if (value !== null) {
      entries[key] = value;
    }
  }

  return entries;
}

export function readLanguage(entries: Record<string, string>): Language {
  return entries[languageKey] === 'ar' ? 'ar' : 'en';
}

/** Keeps the game's synchronous reads, and writes through to the phone's storage. */
export function createMemoryPort(entries: Record<string, string>): StoragePort {
  return {
    getItem(key) {
      return entries[key] ?? null;
    },
    setItem(key, value) {
      entries[key] = value;
      void AsyncStorage.setItem(key, value);
    },
  };
}

export function saveLanguage(language: Language) {
  void AsyncStorage.setItem(languageKey, language);
}
