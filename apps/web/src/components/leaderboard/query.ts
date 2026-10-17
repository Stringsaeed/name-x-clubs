export const boardModes = ['t10', 't50', 't100'] as const;

export type BoardMode = (typeof boardModes)[number];

export const boardPeriods = ['day', 'week', 'all'] as const;

export type BoardPeriod = (typeof boardPeriods)[number];

export const defaultMode: BoardMode = 't10';

export const defaultPeriod: BoardPeriod = 'day';

export const targetByBoardMode: Readonly<Record<BoardMode, number>> = {
  t10: 10,
  t50: 50,
  t100: 100,
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(options: readonly T[], value: string | undefined, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

export type BoardQuery = Readonly<{ mode: BoardMode; period: BoardPeriod }>;

/** Unknown or missing query values fall back to the defaults, so a bad link still shows a board. */
export function parseBoardQuery(
  searchParams: Record<string, string | string[] | undefined>,
): BoardQuery {
  return {
    mode: pick(boardModes, firstValue(searchParams.mode), defaultMode),
    period: pick(boardPeriods, firstValue(searchParams.period), defaultPeriod),
  };
}

export function boardQueryString({ mode, period }: BoardQuery): string {
  return `?mode=${mode}&period=${period}`;
}

export function boardPath(lang: string, query: BoardQuery): string {
  return `/${lang}/leaderboard${boardQueryString(query)}`;
}
