import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardMode, BoardPeriod } from '../../../web/src/components/leaderboard/query';
import type { BoardRow, MyStanding } from '../../../web/src/components/leaderboard/types';
import type { Language } from '../../../web/src/game/model';
import { appFetch } from './api';

export type { BoardMode, BoardPeriod, BoardRow, MyStanding };

type BoardBody = Readonly<{ entries: readonly BoardRow[] }>;

type StandingBody = Readonly<{
  rank: number | null;
  best: { elapsedMs: number; achievedAt: string } | null;
}>;

export type BoardStatus = 'loading' | 'ready' | 'unavailable';

export type BoardState = Readonly<{
  status: BoardStatus;
  entries: readonly BoardRow[];
  mine: MyStanding | undefined;
  refresh: () => void;
  refreshing: boolean;
}>;

/** Whether a visible board row is the caller's own best. */
export function isMine(entry: BoardRow, mine: MyStanding | undefined): boolean {
  return (
    mine !== undefined &&
    entry.rank === mine.rank &&
    entry.elapsedMs === mine.best.elapsedMs &&
    entry.achievedAt === mine.best.achievedAt
  );
}

/** The public board; throws when the server cannot be reached or answers with an error. */
export async function fetchBoard(
  mode: BoardMode,
  period: BoardPeriod,
  lang: Language,
  signal?: AbortSignal,
): Promise<readonly BoardRow[]> {
  const response = await appFetch(`/api/leaderboards/${mode}?period=${period}&lang=${lang}`, {
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`Leaderboard answered ${response.status}`);
  }

  return ((await response.json()) as BoardBody).entries;
}

/** The caller's own best, or undefined when there is none or no session. Never throws. */
export async function fetchMyStanding(
  mode: BoardMode,
  period: BoardPeriod,
  signal?: AbortSignal,
): Promise<MyStanding | undefined> {
  try {
    const response = await appFetch(`/api/leaderboards/${mode}/me?period=${period}`, {
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) {
      return undefined;
    }

    const body = (await response.json()) as StandingBody;

    if (body.rank === null || body.best === null) {
      return undefined;
    }

    return { rank: body.rank, best: body.best };
  } catch {
    return undefined;
  }
}

type Loaded = Readonly<{
  key: string;
  status: 'ready' | 'unavailable';
  entries: readonly BoardRow[];
  mine: MyStanding | undefined;
}>;

async function load(
  mode: BoardMode,
  period: BoardPeriod,
  lang: Language,
  key: string,
  signal: AbortSignal,
): Promise<Loaded> {
  const standing = fetchMyStanding(mode, period, signal);

  try {
    const entries = await fetchBoard(mode, period, lang, signal);

    return { key, status: 'ready', entries, mine: await standing };
  } catch {
    return { key, status: 'unavailable', entries: [], mine: undefined };
  }
}

const noEntries: readonly BoardRow[] = [];

/** Loads a board and the caller's place on it; changing the mode, period or language reloads. */
export function useBoard(mode: BoardMode, period: BoardPeriod, lang: Language): BoardState {
  const key = `${mode}:${period}:${lang}`;
  const [loaded, setLoaded] = useState<Loaded | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [reloads, setReloads] = useState(0);
  const lastKey = useRef(key);

  useEffect(() => {
    const controller = new AbortController();
    const isReload = lastKey.current === key;
    lastKey.current = key;

    setRefreshing(isReload && reloads > 0);

    void load(mode, period, lang, key, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setLoaded(result);
        setRefreshing(false);
      }
    });

    return () => controller.abort();
  }, [mode, period, lang, key, reloads]);

  const refresh = useCallback(() => setReloads((count) => count + 1), []);
  const current = loaded?.key === key ? loaded : undefined;

  return {
    status: current?.status ?? 'loading',
    entries: current?.entries ?? noEntries,
    mine: current?.mine,
    refresh,
    refreshing,
  };
}
