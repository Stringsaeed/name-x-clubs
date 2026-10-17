import { createContext, type ReactNode, useContext, useState, useSyncExternalStore } from 'react';
import type { Language } from '../../web/src/game/model';
import { createPlay, type Play } from './engine';
import { createMemoryPort, readLanguage, saveLanguage } from './storage';

type LanguageStore = Readonly<{
  get: () => Language;
  set: (language: Language) => void;
  subscribe: (listener: () => void) => () => void;
}>;

type PlayContextValue = Readonly<{
  play: Play;
  language: LanguageStore;
}>;

const PlayContext = createContext<PlayContextValue | null>(null);

export function createLanguageStore(initial: Language): LanguageStore {
  let language = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => language,
    set(next) {
      language = next;
      saveLanguage(next);

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function PlayProvider({
  entries,
  children,
}: {
  entries: Record<string, string>;
  children: ReactNode;
}) {
  const [value] = useState<PlayContextValue>(() => ({
    play: createPlay(createMemoryPort(entries)),
    language: createLanguageStore(readLanguage(entries)),
  }));

  return <PlayContext.Provider value={value}>{children}</PlayContext.Provider>;
}

function usePlayContext() {
  const value = useContext(PlayContext);

  if (!value) {
    throw new Error('PlayProvider is missing');
  }

  return value;
}

export function usePlay() {
  const { play } = usePlayContext();
  const view = useSyncExternalStore(play.subscribe, play.getSnapshot, play.getSnapshot);

  return { view, dispatch: play.dispatch };
}

export function useLanguage() {
  const { language } = usePlayContext();

  return useSyncExternalStore(language.subscribe, language.get, language.get);
}

export function useSetLanguage() {
  return usePlayContext().language.set;
}
