export type BoardRow = Readonly<{
  rank: number;
  name: string;
  anonymous: boolean;
  elapsedMs: number;
  achievedAt: string;
}>;

/** The caller's own best on the current board, from `/api/leaderboards/:mode/me`. */
export type MyStanding = Readonly<{
  rank: number;
  best: { elapsedMs: number; achievedAt: string };
}>;
