import { z } from 'zod';
import { clubIdSchema } from '../../content/catalog';
import type { Round, Session } from '../model';

const maxFound = 100;

const wireRoundSchema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('idle'), found: z.tuple([]) }),
  z.object({
    phase: z.literal('playing'),
    found: z.array(clubIdSchema).max(maxFound),
    startedAt: z.number().finite().nonnegative(),
  }),
  z.object({
    phase: z.literal('complete'),
    found: z.array(clubIdSchema).max(maxFound),
    elapsed: z.number().int().nonnegative(),
  }),
]);

const wireSessionSchema = z.object({
  version: z.literal(2),
  category: z.string().max(40),
  challengeId: z.string().max(40),
  round: wireRoundSchema,
});

const legacyPracticeSchema = z.object({
  version: z.literal(1),
  category: z.string().max(40),
  challengeId: z.string().max(40),
  round: z.object({
    phase: z.enum(['idle', 'playing', 'complete']),
    found: z.array(clubIdSchema).max(maxFound),
  }),
});

/** The shape stored under `nxc-v2-<mode>-<level>`. Structurally valid, not yet checked against the catalog. */
export type WireSession = Omit<z.infer<typeof wireSessionSchema>, 'round'> & { round: Round };

type LegacyRound = z.infer<typeof legacyPracticeSchema>['round'];

export function parseWireSession(value: unknown): WireSession | null {
  const result = wireSessionSchema.safeParse(value);

  return result.success ? result.data : null;
}

export function toWireSession(session: Session): WireSession {
  return {
    version: 2,
    category: session.kind === 'practice' ? session.category : 'world',
    challengeId: session.challenge.id,
    round: session.round,
  };
}

/**
 * v1 rounds carried a countdown, not a start time.
 *
 * - playing: the clock restarts at `now`, because v1 never recorded how long the player had played.
 * - complete: found clubs are kept. The model has no "unknown" elapsed, so it is stored as 0 and
 *   shows as 00:00.
 * - idle: v1 could leave clubs on an idle round. They were never part of a played round, so they are
 *   dropped, but the record's category and challenge are kept.
 */
function migrateLegacyRound(round: LegacyRound, now: number): Round {
  switch (round.phase) {
    case 'playing': {
      return { phase: 'playing', found: round.found, startedAt: now };
    }

    case 'complete': {
      return { phase: 'complete', found: round.found, elapsed: 0 };
    }

    case 'idle': {
      return { phase: 'idle', found: [] };
    }
  }
}

export function migrateLegacyPractice(value: unknown, now: number): WireSession | null {
  const result = legacyPracticeSchema.safeParse(value);

  if (!result.success) {
    return null;
  }

  const legacy = result.data;

  return {
    version: 2,
    category: legacy.category,
    challengeId: legacy.challengeId,
    round: migrateLegacyRound(legacy.round, now),
  };
}
