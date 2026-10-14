import { useEffect, useState } from 'react';
import type { BoardMode, BoardPeriod } from './query';
import type { BoardRow, MyStanding } from './types';

type StandingBody = {
  rank: number | null;
  best: { elapsedMs: number; achievedAt: string } | null;
};

function toStanding(body: StandingBody): MyStanding | undefined {
  if (body.rank === null || body.best === null) {
    return undefined;
  }

  return { rank: body.rank, best: body.best };
}

/** Whether a visible board row is the caller's own best. */
export function isMine(entry: BoardRow, mine: MyStanding | undefined): boolean {
  return (
    mine !== undefined &&
    entry.rank === mine.rank &&
    entry.elapsedMs === mine.best.elapsedMs &&
    entry.achievedAt === mine.best.achievedAt
  );
}

/** Loads the caller's best after hydration, so the public board itself stays cacheable. */
export function useMyStanding(mode: BoardMode, period: BoardPeriod): MyStanding | undefined {
  const [standing, setStanding] = useState<{ key: string; value: MyStanding } | undefined>();
  const key = `${mode}:${period}`;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/leaderboards/${mode}/me?period=${period}`, {
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const value = toStanding((await response.json()) as StandingBody);

        if (value !== undefined) {
          setStanding({ key, value });
        }
      } catch {
        // Aborted, offline or not signed in: the pinned row simply stays hidden.
      }
    }

    void load();

    return () => controller.abort();
  }, [mode, period, key]);

  return standing?.key === key ? standing.value : undefined;
}
