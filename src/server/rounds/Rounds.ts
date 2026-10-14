import 'server-only';
import { Context, Effect, Layer } from 'effect';
import type { SqlError } from 'effect/sql';
import type {
  CaptchaFailed,
  NotSignedIn,
  RateLimited,
  RoundClosed,
  RoundInProgress,
  RoundNotFound,
  SeqGap,
} from '../errors';
import { answer, finish, type RoundsServices, resume, start } from './programs';
import type {
  AnswersRequest,
  AnswersResponse,
  Caller,
  Finished,
  FinishRequest,
  RoundView,
  Started,
  StartRequest,
} from './types';

type CommonError = SqlError.SqlError | NotSignedIn | RateLimited | RoundNotFound;

/** The rounds API as a service. The programs live in `programs.ts`. */
export class Rounds extends Context.Service<
  Rounds,
  {
    start(
      caller: Caller,
      request: StartRequest,
    ): Effect.Effect<Started, CommonError | RoundInProgress>;
    answer(
      caller: Caller,
      roundId: string,
      request: AnswersRequest,
    ): Effect.Effect<AnswersResponse, CommonError | SeqGap | RoundClosed>;
    resume(caller: Caller, roundId: string): Effect.Effect<RoundView, CommonError>;
    finish(
      caller: Caller,
      roundId: string,
      request: FinishRequest,
    ): Effect.Effect<Finished, CommonError | CaptchaFailed>;
  }
>()('nxc/server/Rounds') {
  static readonly layer = Layer.effect(
    Rounds,
    Effect.gen(function* () {
      const services = yield* Effect.context<RoundsServices>();
      const withServices = <A, E>(program: Effect.Effect<A, E, RoundsServices>) =>
        Effect.provideContext(program, services);

      return Rounds.of({
        start: (caller, request) => withServices(start(caller, request)),
        answer: (caller, roundId, request) => withServices(answer(caller, roundId, request)),
        resume: (caller, roundId) => withServices(resume(caller, roundId)),
        finish: (caller, roundId, request) => withServices(finish(caller, roundId, request)),
      });
    }),
  );
}
