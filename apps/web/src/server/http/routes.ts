/**
 * The HTTP edge: each handler reads the request, runs one Effect program on the shared runtime and
 * turns the outcome into a `Response`. Route files under `src/app/api` only forward to these.
 */
import 'server-only';
import { Effect, type ManagedRuntime, Option } from 'effect';
import { SqlClient, type SqlError } from 'effect/sql';
import { ServerConfig } from '../config';
import { type AppError, BoardNotFound, NotSignedIn, RoundNotFound } from '../errors';
import { PlayerStore } from '../identity/PlayerStore';
import { Leaderboard } from '../leaderboard/Leaderboard';
import { Rounds } from '../rounds/Rounds';
import { callerFrom, checkOrigin, decodeStrict, readBody, sessionCookie } from './request';
import {
  AnswersBody,
  BoardMode,
  BoardQuery,
  FinishBody,
  ResumeQuery,
  RoundId,
  StartBody,
} from './schemas';
import { internalError, json, noStore, toResponse, unavailable } from './toResponse';

export type AppServices = Rounds | Leaderboard | PlayerStore | ServerConfig | SqlClient.SqlClient;

export type AppRuntime = ManagedRuntime.ManagedRuntime<AppServices, unknown>;

export type RuntimeHandle = Readonly<{
  get: () => AppRuntime;
  /** Drops a runtime whose layers failed to build (no database yet), so the next request retries. */
  reset: () => void;
}>;

type Program = Effect.Effect<Response, AppError | SqlError.SqlError, AppServices>;

/** Public boards are cached at the edge and never personalized. */
const publicBoardCache = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };

/** A malformed round id is reported like a missing round, so ids cannot be probed. */
function roundIdFrom(value: string) {
  return decodeStrict(RoundId, value).pipe(Effect.mapError(() => new RoundNotFound()));
}

function boardModeFrom(value: string) {
  return decodeStrict(BoardMode, value).pipe(Effect.mapError(() => new BoardNotFound()));
}

function boardQueryFrom(request: Request) {
  const query = new URL(request.url).searchParams;

  return decodeStrict(BoardQuery, {
    period: query.get('period') ?? 'day',
    lang: query.get('lang') ?? 'en',
  });
}

function resumeQueryFrom(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang');

  if (lang === null) {
    return decodeStrict(ResumeQuery, {});
  }

  return decodeStrict(ResumeQuery, { lang });
}

const postGuard = (request: Request) =>
  ServerConfig.use((settings) => checkOrigin(request, settings));

const startRound = (request: Request): Program =>
  Effect.gen(function* () {
    yield* postGuard(request);
    const body = yield* readBody(request, StartBody);
    const rounds = yield* Rounds;
    const settings = yield* ServerConfig;
    const { sessionToken, ...started } = yield* rounds.start(callerFrom(request), body);
    const headers = { ...noStore, 'Set-Cookie': sessionCookie(sessionToken, settings, request) };

    return json(started, 201, headers);
  });

const submitAnswers = (request: Request, id: string): Program =>
  Effect.gen(function* () {
    yield* postGuard(request);
    const roundId = yield* roundIdFrom(id);
    const body = yield* readBody(request, AnswersBody);
    const rounds = yield* Rounds;

    return json(yield* rounds.answer(callerFrom(request), roundId, body));
  });

const resumeRound = (request: Request, id: string): Program =>
  Effect.gen(function* () {
    const roundId = yield* roundIdFrom(id);
    const { lang } = yield* resumeQueryFrom(request);
    const rounds = yield* Rounds;

    return json(yield* rounds.resume(callerFrom(request), roundId, lang));
  });

const finishRound = (request: Request, id: string): Program =>
  Effect.gen(function* () {
    yield* postGuard(request);
    const roundId = yield* roundIdFrom(id);
    const body = yield* readBody(request, FinishBody);
    const rounds = yield* Rounds;

    return json(yield* rounds.finish(callerFrom(request), roundId, body));
  });

/** Never reads cookies: the response is shared through the CDN. */
const leaderboard = (request: Request, modeParam: string): Program =>
  Effect.gen(function* () {
    const mode = yield* boardModeFrom(modeParam);
    const { period, lang } = yield* boardQueryFrom(request);
    const board = yield* Leaderboard;
    const entries = yield* board.top(mode, period, lang);

    return json({ mode, period, entries }, 200, publicBoardCache);
  });

const myStanding = (request: Request, modeParam: string): Program =>
  Effect.gen(function* () {
    const mode = yield* boardModeFrom(modeParam);
    const { period } = yield* boardQueryFrom(request);
    const { sessionToken } = callerFrom(request);

    if (sessionToken === undefined) {
      return yield* new NotSignedIn();
    }

    const players = yield* PlayerStore;
    const player = yield* players.findBySession(sessionToken);

    if (Option.isNone(player)) {
      return yield* new NotSignedIn();
    }

    const board = yield* Leaderboard;

    return json(yield* board.standing(player.value.id, mode, period));
  });

const health = (): Program =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* sql`SELECT 1`;

    return json({ db: 'ok' });
  }).pipe(Effect.catch(() => Effect.succeed(json({ db: 'unavailable' }, 503))));

/** Every typed failure becomes its HTTP response; anything else is logged and becomes a 500. */
function handled(program: Program) {
  return program.pipe(
    Effect.catch((error) => Effect.succeed(toResponse(error))),
    Effect.catchCause((cause) =>
      Effect.sync(() => {
        console.error('Unhandled server failure', cause);

        return internalError();
      }),
    ),
  );
}

export function makeRoutes(runtime: RuntimeHandle) {
  async function run(program: Program): Promise<Response> {
    try {
      return await runtime.get().runPromise(handled(program));
    } catch (buildFailure) {
      // Program failures are all handled above, so only building the layers can land here.
      console.error('Server runtime unavailable', buildFailure);
      runtime.reset();

      return unavailable();
    }
  }

  return {
    startRound: (request: Request) => run(startRound(request)),
    submitAnswers: (request: Request, id: string) => run(submitAnswers(request, id)),
    resumeRound: (request: Request, id: string) => run(resumeRound(request, id)),
    finishRound: (request: Request, id: string) => run(finishRound(request, id)),
    leaderboard: (request: Request, mode: string) => run(leaderboard(request, mode)),
    myStanding: (request: Request, mode: string) => run(myStanding(request, mode)),
    health: () => run(health()),
  };
}

export type Routes = ReturnType<typeof makeRoutes>;
