import { z } from 'zod';
import type { ClubId, Region } from '../content/catalog';

export const levelSchema = z.union([z.literal(10), z.literal(50), z.literal(100)]);

export type Level = z.infer<typeof levelSchema>;

export const levels = levelSchema.options.map((option) => option.value);

export const languageSchema = z.enum(['en', 'ar']);

export type Language = z.infer<typeof languageSchema>;

export const modeSchema = z.enum(['free', 'practice']);

export type Mode = z.infer<typeof modeSchema>;

export type Scope =
  | { kind: 'world' }
  | { kind: 'country'; country: string }
  | { kind: 'region'; region: Region }
  | { kind: 'letter'; letter: string };

export type Challenge = Readonly<{
  id: string;
  scope: Scope;
  target: Level;
}>;

export type IdleRound = { phase: 'idle'; found: readonly [] };

export type CompletedRound = { phase: 'complete'; found: readonly ClubId[]; elapsed: number };

export type PlayingRound = { phase: 'playing'; found: readonly ClubId[]; startedAt: number };

export type Round = IdleRound | CompletedRound | PlayingRound;

export type Session =
  | { kind: 'free'; challenge: Challenge; round: Round }
  | { kind: 'practice'; category: string; challenge: Challenge; round: Round };

/**
 * A playing round that started longer ago than this is treated as abandoned when it is restored.
 * Elapsed time is capped at the same span, so every finished round can be restored again.
 */
export const maxRoundAgeMs = 30 * 24 * 60 * 60 * 1000;

export const maxElapsedSeconds = maxRoundAgeMs / 1000;

/** Whole seconds from `startedAt` to `now`, never negative and never above `maxElapsedSeconds`. */
export function secondsBetween(startedAt: number, now: number) {
  const seconds = Math.floor((now - startedAt) / 1000);

  return Math.min(maxElapsedSeconds, Math.max(0, seconds));
}
