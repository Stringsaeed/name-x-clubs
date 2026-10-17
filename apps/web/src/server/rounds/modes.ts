import type { Level } from '../../game/model';

export const rankedModes = ['t10', 't50', 't100'] as const;

export type RankedMode = (typeof rankedModes)[number];

export const targetByMode: Readonly<Record<RankedMode, Level>> = { t10: 10, t50: 50, t100: 100 };

/** A ranked round still playing after this long is abandoned. */
export const maxRankedRoundMs = 2 * 60 * 60 * 1000;
