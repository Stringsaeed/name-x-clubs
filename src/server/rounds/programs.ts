/**
 * Server-authoritative ranked rounds: start, submit answers, resume and finish.
 *
 * The server stamps every time it uses. A round's time is the receive time of the batch that
 * reaches the target, minus the server's start time. Client times are stored and only checked for
 * consistency (see `pace.ts`).
 */
import 'server-only';
import { Clock, Crypto, Effect, Option } from 'effect';
import { SqlClient } from 'effect/sql';
import { Captcha } from '../captcha/Captcha';
import { ServerConfig } from '../config';
import { NotSignedIn, RoundClosed, RoundInProgress, RoundNotFound, SeqGap } from '../errors';
import { type Player, PlayerStore } from '../identity/PlayerStore';
import { Leaderboard, periods } from '../leaderboard/Leaderboard';
import { RateLimit, rateLimitRules } from '../rateLimit/RateLimit';
import { catalogVersion } from './catalogVersion';
import { maxRankedRoundMs, targetByMode } from './modes';
import { batchFlags, type PaceFlag, type PaceVerdict, paceVerdict } from './pace';
import { type RoundRecord, type RoundStatus, RoundStore, type StoredEntry } from './RoundStore';
import { replayEntries } from './replay';
import {
  type AnswerEntry,
  type AnswersRequest,
  answersResponse,
  type Caller,
  type FinishRequest,
  phaseOf,
  type StartRequest,
} from './types';

export type RoundsServices =
  | SqlClient.SqlClient
  | Crypto.Crypto
  | ServerConfig
  | PlayerStore
  | RoundStore
  | Leaderboard
  | RateLimit
  | Captcha;

const signedInPlayer = Effect.fn('Rounds.signedInPlayer')(function* (caller: Caller) {
  if (caller.sessionToken === undefined) {
    return yield* new NotSignedIn();
  }

  const players = yield* PlayerStore;
  const player = yield* players.findBySession(caller.sessionToken);

  if (Option.isNone(player)) {
    return yield* new NotSignedIn();
  }

  return player.value;
});

/** The caller's player, created on the first ranked start. A known session is renewed. */
const playerForStart = Effect.fn('Rounds.playerForStart')(function* (caller: Caller) {
  const players = yield* PlayerStore;
  const rateLimit = yield* RateLimit;
  const token = caller.sessionToken;

  if (token !== undefined) {
    const existing = yield* players.findBySession(token);

    if (Option.isSome(existing)) {
      yield* players.renewSession(token);

      return { player: existing.value, sessionToken: token };
    }
  }

  const clientKey = yield* rateLimit.clientKey(caller.clientAddress);
  yield* rateLimit.consume(`create-player:${clientKey}`, rateLimitRules.createPlayer);

  return yield* players.createAnonymous();
});

/** One round in play per player, so a mode cannot change mid-round. Stale rounds are dropped. */
const ensureNoRoundInPlay = Effect.fn('Rounds.ensureNoRoundInPlay')(function* (
  player: Player,
  nowMs: number,
) {
  const store = yield* RoundStore;
  yield* store.abandonStartedBefore(player.id, new Date(nowMs - maxRankedRoundMs));
  const playing = yield* store.findPlaying(player.id);

  if (Option.isSome(playing)) {
    return yield* new RoundInProgress({ roundId: playing.value.id, mode: playing.value.mode });
  }
});

export const start = Effect.fn('Rounds.start')(function* (caller: Caller, request: StartRequest) {
  const crypto = yield* Crypto.Crypto;
  const rateLimit = yield* RateLimit;
  const store = yield* RoundStore;
  const { player, sessionToken } = yield* playerForStart(caller);
  yield* rateLimit.consume(`start-round:${player.id}`, rateLimitRules.startRound);

  const nowMs = yield* Clock.currentTimeMillis;
  yield* ensureNoRoundInPlay(player, nowMs);

  const roundId = yield* Effect.orDie(crypto.randomUUIDv7());
  yield* store.create({
    id: roundId,
    playerId: player.id,
    mode: request.mode,
    lang: request.lang,
    catalogVersion,
    startedAt: new Date(nowMs),
  });

  return { roundId, startedAt: nowMs, serverNow: nowMs, sessionToken };
});

const recordVerified = Effect.fn('Rounds.recordVerified')(function* (
  round: RoundRecord,
  elapsedMs: number,
  achievedAt: Date,
) {
  const leaderboard = yield* Leaderboard;

  yield* leaderboard.recordVerified({
    mode: round.mode,
    playerId: round.playerId,
    roundId: round.id,
    scoreKey: elapsedMs,
    elapsedMs,
    achievedAt,
  });
});

function statusForVerdict(verdict: PaceVerdict, captchaEnabled: boolean): RoundStatus {
  if (verdict === 'impossible') {
    return 'rejected';
  }

  if (verdict === 'suspicious') {
    return 'flagged';
  }

  if (captchaEnabled) {
    return 'complete';
  }

  return 'verified';
}

/** Applies the pace policy to a round that just reached its target. */
const completeRound = Effect.fn('Rounds.completeRound')(function* (
  round: RoundRecord,
  finishedAtMs: number,
) {
  const config = yield* ServerConfig;
  const store = yield* RoundStore;
  const elapsedMs = finishedAtMs - round.startedAt.getTime();
  const pace = paceVerdict(round.mode, elapsedMs, round.flags);
  const status = statusForVerdict(pace.verdict, config.captchaEnabled);
  const finishedAt = new Date(finishedAtMs);

  yield* store.close(round.id, {
    status,
    finishedAt,
    elapsedMs,
    scoreKey: elapsedMs,
    flags: pace.flags,
  });

  if (status === 'verified') {
    yield* recordVerified(round, elapsedMs, finishedAt);
  }

  return { status, elapsedMs };
});

function mergeFlags(current: readonly PaceFlag[], added: readonly PaceFlag[]) {
  return [...new Set([...current, ...added])];
}

/** Scores the entries this round has not seen yet. Runs inside the answer transaction. */
const applyEntries = Effect.fn('Rounds.applyEntries')(function* (
  round: RoundRecord,
  entries: readonly AnswerEntry[],
  receivedAtMs: number,
) {
  const store = yield* RoundStore;
  const receivedMs = receivedAtMs - round.startedAt.getTime();
  const texts = entries.map((entry) => entry.text);
  const replay = replayEntries(round.found, texts, targetByMode[round.mode]);
  const stored: StoredEntry[] = entries.map((entry, index) => ({
    seq: round.nextSeq + index,
    receivedMs,
    clientMs: entry.clientMs,
    text: entry.text,
    accepted: replay.outcomes[index]?.accepted ?? [],
  }));
  const clientMs = entries.map((entry) => entry.clientMs);
  const flags = mergeFlags(round.flags, batchFlags({ receivedMs, clientMs }));
  const nextSeq = round.nextSeq + entries.length;
  const progressed = { ...round, found: replay.found, nextSeq, flags };

  yield* store.appendEntries(round.id, stored);
  yield* store.saveProgress(round.id, progressed);

  const events = replay.outcomes.flatMap((outcome) => outcome.events);

  if (replay.completedAt === null) {
    return answersResponse(progressed, events);
  }

  const result = yield* completeRound(progressed, receivedAtMs);

  return answersResponse({ ...progressed, ...result }, events);
});

const lockedRound = Effect.fn('Rounds.lockedRound')(function* (roundId: string, player: Player) {
  const store = yield* RoundStore;
  const round = yield* store.lock(roundId, player.id);

  if (Option.isNone(round)) {
    return yield* new RoundNotFound();
  }

  return round.value;
});

/**
 * Entries are numbered from 0. A batch that starts before `nextSeq` is a retry, or overlaps one:
 * the entries already applied are skipped, so resending adds nothing.
 */
const answerLocked = Effect.fn('Rounds.answerLocked')(function* (
  round: RoundRecord,
  request: AnswersRequest,
  receivedAtMs: number,
) {
  if (request.seq > round.nextSeq) {
    return yield* new SeqGap({ expectedSeq: round.nextSeq });
  }

  const fresh = request.entries.slice(round.nextSeq - request.seq);

  if (fresh.length === 0) {
    return answersResponse(round, []);
  }

  if (round.status !== 'playing') {
    return yield* new RoundClosed({ status: round.status });
  }

  return yield* applyEntries(round, fresh, receivedAtMs);
});

export const answer = Effect.fn('Rounds.answer')(function* (
  caller: Caller,
  roundId: string,
  request: AnswersRequest,
) {
  const sql = yield* SqlClient.SqlClient;
  const rateLimit = yield* RateLimit;
  const player = yield* signedInPlayer(caller);
  yield* rateLimit.consume(`answers:${player.id}`, rateLimitRules.answers);

  // The receive time is taken once, before waiting for the row lock.
  const receivedAtMs = yield* Clock.currentTimeMillis;
  const locked = lockedRound(roundId, player);

  return yield* sql.withTransaction(
    Effect.flatMap(locked, (round) => answerLocked(round, request, receivedAtMs)),
  );
});

export const resume = Effect.fn('Rounds.resume')(function* (caller: Caller, roundId: string) {
  const store = yield* RoundStore;
  const player = yield* signedInPlayer(caller);
  const found = yield* store.find(roundId, player.id);

  if (Option.isNone(found)) {
    return yield* new RoundNotFound();
  }

  const round = found.value;
  const serverNow = yield* Clock.currentTimeMillis;

  return {
    roundId: round.id,
    mode: round.mode,
    status: round.status,
    phase: phaseOf(round.status),
    startedAt: round.startedAt.getTime(),
    serverNow,
    nextSeq: round.nextSeq,
    found: round.found,
    elapsedMs: round.elapsedMs,
  };
});

const ranksFor = Effect.fn('Rounds.ranksFor')(function* (round: RoundRecord) {
  const leaderboard = yield* Leaderboard;
  const [day, week, all] = yield* Effect.forEach(periods, (period) =>
    leaderboard.standing(round.playerId, round.mode, period),
  );

  return { day: day?.rank ?? null, week: week?.rank ?? null, all: all?.rank ?? null };
});

const abandon = Effect.fn('Rounds.abandon')(function* (round: RoundRecord) {
  const store = yield* RoundStore;
  const finishedAt = new Date(yield* Clock.currentTimeMillis);
  const outcome = { status: 'abandoned', finishedAt, elapsedMs: null, scoreKey: null } as const;
  yield* store.close(round.id, { ...outcome, flags: round.flags });

  return { ...round, ...outcome };
});

/** A completed round enters the board once the captcha passes. */
const verifyCompleted = Effect.fn('Rounds.verifyCompleted')(function* (
  round: RoundRecord,
  elapsedMs: number,
  finishedAt: Date,
  captchaToken: string | undefined,
) {
  const captcha = yield* Captcha;
  const store = yield* RoundStore;
  yield* captcha.verify(captchaToken);

  const outcome = { status: 'verified', finishedAt, elapsedMs, scoreKey: elapsedMs } as const;
  yield* store.close(round.id, { ...outcome, flags: round.flags });
  yield* recordVerified(round, elapsedMs, finishedAt);

  return { ...round, ...outcome };
});

/** Moves a round out of play, idempotently. Returns the round as it now stands. */
const settle = Effect.fn('Rounds.settle')(function* (round: RoundRecord, request: FinishRequest) {
  if (round.status === 'playing') {
    return yield* abandon(round);
  }

  const { elapsedMs, finishedAt } = round;

  if (round.status === 'complete' && elapsedMs !== null && finishedAt !== null) {
    return yield* verifyCompleted(round, elapsedMs, finishedAt, request.captchaToken);
  }

  return round;
});

export const finish = Effect.fn('Rounds.finish')(function* (
  caller: Caller,
  roundId: string,
  request: FinishRequest,
) {
  const sql = yield* SqlClient.SqlClient;
  const player = yield* signedInPlayer(caller);
  const locked = lockedRound(roundId, player);
  const round = yield* sql.withTransaction(
    Effect.flatMap(locked, (current) => settle(current, request)),
  );

  if (round.status !== 'verified') {
    return { status: round.status, elapsedMs: round.elapsedMs, ranks: null };
  }

  const ranks = yield* ranksFor(round);

  return { status: round.status, elapsedMs: round.elapsedMs, ranks };
});
