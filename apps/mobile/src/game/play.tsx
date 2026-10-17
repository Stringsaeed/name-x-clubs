import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { Share } from 'react-native';
import type { Language, Level, Mode } from '../../../web/src/game/model';
import { formatRankedTime } from '../../../web/src/game/ranked/clock';
import {
  isRankedRoundOf,
  type RankedOutcome,
  rankedOutcome,
} from '../../../web/src/game/ranked/rankedView';
import { resultElapsed, shareText } from '../copy';
import { rankedApi } from './api';
import { createGameController, type GameController } from './engine';
import { type PlaySnapshot, RankedPlay } from './rankedPlay';
import { createMemoryPort, createSessionPort, readLanguage, saveLanguage } from './storage';

export type PlayActions = Readonly<{
  changeMode: (mode: Mode) => void;
  changeLevel: (level: Level) => void;
  changeCategory: (category: string) => void;
  startRound: () => void;
  finishRound: () => void;
  nextRound: () => void;
  /** True when the composer should clear. */
  submitAnswer: (text: string) => boolean;
  shareResult: () => Promise<void>;
}>;

export type { PlaySnapshot, RankedOutcome };

type PlayContextValue = Readonly<{
  play: RankedPlay;
  language: Language;
  setLanguage: (language: Language) => void;
}>;

const PlayContext = createContext<PlayContextValue | null>(null);

function usePlayContext() {
  const value = useContext(PlayContext);

  if (!value) {
    throw new Error('PlayProvider is missing');
  }

  return value;
}

function shareMessage(snapshot: PlaySnapshot, language: Language) {
  const { view, ranked } = snapshot;
  const elapsedMs = ranked?.result?.elapsedMs ?? null;
  const label =
    elapsedMs !== null && isRankedRoundOf(view, ranked)
      ? formatRankedTime(elapsedMs)
      : resultElapsed(view.session);

  return shareText(view.session, language, label);
}

function createActions(play: RankedPlay, language: Language): PlayActions {
  return {
    changeMode: play.changeMode,
    changeLevel: play.changeLevel,
    changeCategory: play.changeCategory,
    startRound: play.startRound,
    finishRound: play.finishRound,
    nextRound: play.nextRound,
    submitAnswer: play.submitAnswer,
    async shareResult() {
      try {
        await Share.share({ message: shareMessage(play.getSnapshot(), language) });
      } catch {
        // Closing the sheet, or no sharing on this device, is not an error to show.
      }
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
  const [shared] = useState(() => ({
    controller: createGameController({ storage: createMemoryPort(entries) }),
    sessionPort: createSessionPort(entries),
  }));
  const [language, setLanguageState] = useState(() => readLanguage(entries));
  const play = useMemo(() => createRankedPlay(shared, language), [shared, language]);

  useEffect(() => {
    play.resume();

    return () => play.dispose();
  }, [play]);

  const value = useMemo<PlayContextValue>(
    () => ({
      play,
      language,
      setLanguage(next) {
        saveLanguage(next);
        setLanguageState(next);
      },
    }),
    [play, language],
  );

  return <PlayContext.Provider value={value}>{children}</PlayContext.Provider>;
}

function createRankedPlay(
  shared: Readonly<{
    controller: GameController;
    sessionPort: ReturnType<typeof createSessionPort>;
  }>,
  language: Language,
) {
  return new RankedPlay({
    controller: shared.controller,
    api: rankedApi,
    storage: shared.sessionPort,
    lang: language,
  });
}

function usePlaySnapshot(): PlaySnapshot {
  const { play } = usePlayContext();

  return useSyncExternalStore(play.subscribe, play.getSnapshot, play.getSnapshot);
}

export function usePlay(): Readonly<{ snapshot: PlaySnapshot; actions: PlayActions }> {
  const { play, language } = usePlayContext();
  const snapshot = usePlaySnapshot();
  const actions = useMemo(() => createActions(play, language), [play, language]);

  return { snapshot, actions };
}

export function useLanguage(): Language {
  return usePlayContext().language;
}

export function useSetLanguage(): (language: Language) => void {
  return usePlayContext().setLanguage;
}

export function useRankedOutcome(): RankedOutcome {
  const snapshot = usePlaySnapshot();

  return useMemo(() => rankedOutcome(snapshot.view, snapshot.ranked), [snapshot]);
}
