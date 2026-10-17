import type { ClubId } from '../../content/catalog';
import type { Locale } from '../../i18n/config';
import type { RankedMode } from './modes';
import type { RoundRecord, RoundStatus } from './RoundStore';
import type { EntryEvent } from './replay';

/** What a request carries about who is asking. Read from headers by the HTTP layer. */
export type Caller = Readonly<{ sessionToken: string | undefined; clientAddress: string }>;

export type StartRequest = Readonly<{ mode: RankedMode; lang: Locale }>;

export type AnswerEntry = Readonly<{ text: string; clientMs: number }>;

export type AnswersRequest = Readonly<{ seq: number; entries: readonly AnswerEntry[] }>;

/** `lang` picks the language of the player's display name; it defaults to the round's language. */
export type FinishRequest = Readonly<{ captchaToken?: string; lang?: Locale }>;

export type Phase = 'playing' | 'complete';

export type RoundResult = Readonly<{ status: RoundStatus; elapsedMs: number | null }>;

export type Started = Readonly<{
  roundId: string;
  startedAt: number;
  serverNow: number;
  /** The player's own name: their username, else their nickname. Only ever sent to the owner. */
  displayName: string;
  /** The session to (re)set in the cookie, which slides its expiry forward. */
  sessionToken: string;
}>;

export type AnswersResponse = Readonly<{
  nextSeq: number;
  found: readonly ClubId[];
  events: readonly EntryEvent[];
  phase: Phase;
  result?: RoundResult;
}>;

export type RoundView = Readonly<{
  roundId: string;
  mode: RankedMode;
  status: RoundStatus;
  phase: Phase;
  startedAt: number;
  serverNow: number;
  nextSeq: number;
  found: readonly ClubId[];
  elapsedMs: number | null;
  displayName: string;
}>;

export type Ranks = Readonly<{ day: number | null; week: number | null; all: number | null }>;

export type Finished = Readonly<{
  status: RoundStatus;
  elapsedMs: number | null;
  ranks: Ranks | null;
  displayName: string;
}>;

export function phaseOf(status: RoundStatus): Phase {
  if (status === 'playing') {
    return 'playing';
  }

  return 'complete';
}

type RoundSnapshot = Pick<RoundRecord, 'status' | 'elapsedMs' | 'found' | 'nextSeq'>;

export function answersResponse(
  round: RoundSnapshot,
  events: readonly EntryEvent[],
): AnswersResponse {
  const response = {
    nextSeq: round.nextSeq,
    found: round.found,
    events,
    phase: phaseOf(round.status),
  };

  if (round.status === 'playing') {
    return response;
  }

  return { ...response, result: { status: round.status, elapsedMs: round.elapsedMs } };
}
