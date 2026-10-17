import type { BoardMode, BoardPeriod } from '../components/leaderboard/query';
import type { BoardRow } from '../components/leaderboard/types';

const defaultApiOrigin = 'http://127.0.0.1:4100';
const boardRevalidateSeconds = 30;

/** Where the API service lives for server-side code, without a trailing slash. */
export function apiOrigin(): string {
  return (process.env.API_ORIGIN ?? defaultApiOrigin).replace(/\/+$/, '');
}

/**
 * Loads a public board from the API. The response is shared by everyone, so Next.js revalidates it
 * every 30 seconds. Any failure answers `undefined` so the page renders its unavailable state.
 */
export async function loadBoard(
  mode: BoardMode,
  period: BoardPeriod,
  lang: string,
): Promise<readonly BoardRow[] | undefined> {
  const url = `${apiOrigin()}/api/leaderboards/${mode}?period=${period}&lang=${lang}`;

  try {
    const response = await fetch(url, { next: { revalidate: boardRevalidateSeconds } });

    if (!response.ok) {
      return undefined;
    }

    const body = (await response.json()) as { entries: readonly BoardRow[] };

    return body.entries;
  } catch (error) {
    console.error('Leaderboard API request failed', error);

    return undefined;
  }
}
