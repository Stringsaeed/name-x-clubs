import { type ClubId, clubById } from '@nxc/game/content/catalog';
import { challengesForLevel, eligibleClubs } from '@nxc/game/engine';
import {
  type Challenge,
  type Level,
  type Mode,
  maxElapsedSeconds,
  maxRoundAgeMs,
  type PlayingRound,
  type Round,
  type Session,
  secondsBetween,
} from '@nxc/game/model';
import type { WireSession } from './wire';

export type RestoreContext = Readonly<{ mode: Mode; level: Level; now: number }>;

/** `repaired` is true when the saved round was adjusted and should be written back. */
export type Restored = Readonly<{ session: Session; repaired: boolean }>;

type RestoredRound<R extends Round = Round> = Readonly<{ round: R; repaired: boolean }>;

function findChallenge(level: Level, challengeId: string): Challenge | null {
  return challengesForLevel(level).find((challenge) => challenge.id === challengeId) ?? null;
}

/** Free time only plays the world challenge; practice may play any challenge for the level. */
function isChallengeAllowedInMode(challenge: Challenge, mode: Mode) {
  return mode === 'practice' || challenge.scope.kind === 'world';
}

/** A practice category is either the challenge it chose or `random`. */
function isCategoryConsistent(record: WireSession) {
  return record.category === 'random' || record.category === record.challengeId;
}

function fitsTarget(found: readonly ClubId[], challenge: Challenge) {
  return found.length <= challenge.target;
}

function hasNoDuplicates(found: readonly ClubId[]) {
  return new Set(found).size === found.length;
}

function areAllEligible(found: readonly ClubId[], challenge: Challenge) {
  const eligible = new Set(eligibleClubs(challenge).map((club) => club.id));

  return found.every((id) => clubById.has(id) && eligible.has(id));
}

function hasValidFound(found: readonly ClubId[], challenge: Challenge) {
  return fitsTarget(found, challenge) && hasNoDuplicates(found) && areAllEligible(found, challenge);
}

function isElapsedPlausible(elapsed: number) {
  return elapsed <= maxElapsedSeconds;
}

function isAbandoned(startedAt: number, now: number) {
  return now - startedAt > maxRoundAgeMs;
}

/** A start time in the future means the clock moved back. Restart the clock instead of losing the round. */
function clampStartedAt(round: PlayingRound, now: number): RestoredRound<PlayingRound> {
  if (round.startedAt <= now) {
    return { round, repaired: false };
  }

  return { round: { ...round, startedAt: now }, repaired: true };
}

function restorePlaying(
  round: PlayingRound,
  challenge: Challenge,
  now: number,
): RestoredRound | null {
  if (isAbandoned(round.startedAt, now)) {
    return null;
  }

  const clamped = clampStartedAt(round, now);

  if (round.found.length < challenge.target) {
    return clamped;
  }

  const elapsed = secondsBetween(clamped.round.startedAt, now);

  return { round: { phase: 'complete', found: round.found, elapsed }, repaired: true };
}

function restoreRound(round: Round, challenge: Challenge, now: number): RestoredRound | null {
  if (!hasValidFound(round.found, challenge)) {
    return null;
  }

  switch (round.phase) {
    case 'idle': {
      return { round, repaired: false };
    }

    case 'complete': {
      return isElapsedPlausible(round.elapsed) ? { round, repaired: false } : null;
    }

    case 'playing': {
      return restorePlaying(round, challenge, now);
    }
  }
}

/**
 * Turns a structurally valid record into a session for `mode` and `level`, or null when the
 * record does not belong there or fails any consistency check.
 */
export function restoreSession(record: WireSession, context: RestoreContext): Restored | null {
  const challenge = findChallenge(context.level, record.challengeId);

  if (!challenge || !isChallengeAllowedInMode(challenge, context.mode)) {
    return null;
  }

  if (context.mode === 'practice' && !isCategoryConsistent(record)) {
    return null;
  }

  const restored = restoreRound(record.round, challenge, context.now);

  if (!restored) {
    return null;
  }

  if (context.mode === 'free') {
    return {
      session: { kind: 'free', challenge, round: restored.round },
      repaired: restored.repaired,
    };
  }

  return {
    session: { kind: 'practice', category: record.category, challenge, round: restored.round },
    repaired: restored.repaired,
  };
}

export function freeSession(level: Level): Session {
  return {
    kind: 'free',
    challenge: challengesForLevel(level)[0],
    round: { phase: 'idle', found: [] },
  };
}

function pickRandomChallenge(level: Level, previousId: string | undefined, random: () => number) {
  const pool = challengesForLevel(level);
  const alternatives = pool.filter((challenge) => challenge.id !== previousId);

  return alternatives[Math.floor(random() * alternatives.length)] ?? pool[0];
}

/**
 * A fresh practice session. `random` picks a challenge other than `previousId`; any other
 * category picks that challenge, falling back to the world challenge.
 */
export function practiceSession(
  level: Level,
  category: string,
  previousId: string | undefined,
  random: () => number,
): Extract<Session, { kind: 'practice' }> {
  if (category === 'random') {
    const challenge = pickRandomChallenge(level, previousId, random);

    return { kind: 'practice', category, challenge, round: { phase: 'idle', found: [] } };
  }

  const challenge = findChallenge(level, category) ?? challengesForLevel(level)[0];

  return {
    kind: 'practice',
    category: challenge.id,
    challenge,
    round: { phase: 'idle', found: [] },
  };
}
