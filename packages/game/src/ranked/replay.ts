/**
 * Replays ranked entries through the same pure matcher the client uses (world scope), with the
 * ranked caps on top. No Effect and no I/O, so it is tested directly.
 */
import type { ClubId } from '../content/catalog';
import { type AnswerEvent, parseAnswers, scoreAnswers } from '../engine';
import { worldChallenge } from '../matching/types';
import type { Level } from '../model';

/** A ranked entry credits at most this many clubs, which blunts pasting a prepared list. */
export const maxAcceptedPerEntry = 3;

export type EntryEvent = Readonly<{
  kind: AnswerEvent['kind'] | 'over-limit';
  input: string;
  clubId?: ClubId;
}>;

export type EntryOutcome = Readonly<{ accepted: readonly ClubId[]; events: readonly EntryEvent[] }>;

export type ReplayResult = Readonly<{
  found: readonly ClubId[];
  outcomes: readonly EntryOutcome[];
  /** Index of the entry that reached the target, or `null` while the round goes on. */
  completedAt: number | null;
}>;

function toEntryEvent(event: AnswerEvent): EntryEvent {
  if (event.kind === 'accepted' || event.kind === 'duplicate' || event.kind === 'wrong-category') {
    return { kind: event.kind, input: event.input, clubId: event.club.id };
  }

  return { kind: event.kind, input: event.input };
}

/** Scores one entry, keeping only the first `maxAcceptedPerEntry` new clubs it names. */
export function replayEntry(found: readonly ClubId[], text: string, target: Level): EntryOutcome {
  const scored = scoreAnswers(found, parseAnswers(text, worldChallenge), target);
  const accepted: ClubId[] = [];
  const events: EntryEvent[] = [];

  for (const event of scored.events) {
    if (event.kind !== 'accepted') {
      events.push(toEntryEvent(event));
      continue;
    }

    if (accepted.length === maxAcceptedPerEntry) {
      events.push({ kind: 'over-limit', input: event.input, clubId: event.club.id });
      continue;
    }

    accepted.push(event.club.id);
    events.push(toEntryEvent(event));
  }

  return { accepted, events };
}

/** Applies entries in order. Entries after the one that reaches the target score nothing. */
export function replayEntries(
  found: readonly ClubId[],
  texts: readonly string[],
  target: Level,
): ReplayResult {
  let current = [...found];
  let completedAt: number | null = null;
  const outcomes: EntryOutcome[] = [];

  for (const [index, text] of texts.entries()) {
    if (completedAt !== null) {
      outcomes.push({ accepted: [], events: [] });
      continue;
    }

    const outcome = replayEntry(current, text, target);
    current = [...current, ...outcome.accepted];
    outcomes.push(outcome);

    if (current.length >= target) {
      completedAt = index;
    }
  }

  return { found: current, outcomes, completedAt };
}
