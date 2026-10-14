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
  difficulty: 'easy' | 'medium';
}>;
export type IdleRound = { phase: 'idle'; found: readonly [] };
export type CompletedRound = { phase: 'complete'; found: readonly ClubId[]; elapsed: number };
export type Round =
  | IdleRound
  | CompletedRound
  | { phase: 'playing'; found: readonly ClubId[]; startedAt: number };
export type Session =
  | { kind: 'free'; challenge: Challenge; round: Round }
  | { kind: 'practice'; category: string; challenge: Challenge; round: Round };
