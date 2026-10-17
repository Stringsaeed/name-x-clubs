import type { Club } from '../content/catalog';
import type { Challenge } from '../model';

/** Matching only needs to know which clubs a round accepts. */
export type ScopedChallenge = Pick<Challenge, 'scope'>;

export type Resolution =
  | { kind: 'match'; club: Club }
  | { kind: 'wrong-category'; club: Club }
  | { kind: 'ambiguous' }
  | { kind: 'unknown' };

export type ParsedAnswer = Resolution & { input: string };

export type AnswerEvent =
  | Exclude<ParsedAnswer, { kind: 'match' }>
  | { kind: 'accepted' | 'duplicate'; club: Club; input: string };

export const worldChallenge: ScopedChallenge = { scope: { kind: 'world' } };
