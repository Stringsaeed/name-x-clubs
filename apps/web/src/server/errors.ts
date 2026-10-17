import 'server-only';
import { Schema } from 'effect';

/** The body, a path parameter or a query parameter does not match its schema. HTTP 400. */
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()('InvalidRequest', {
  message: Schema.String,
}) {}

/** The request has no valid session cookie. HTTP 401. */
export class NotSignedIn extends Schema.TaggedError<NotSignedIn>()('NotSignedIn', {}) {}

/** A state-changing request came from another site. HTTP 403. */
export class OriginRejected extends Schema.TaggedError<OriginRejected>()('OriginRejected', {}) {}

/** The captcha is enabled and did not pass. HTTP 403. */
export class CaptchaFailed extends Schema.TaggedError<CaptchaFailed>()('CaptchaFailed', {}) {}

/** No such round for this player. Another player's round is reported the same way. HTTP 404. */
export class RoundNotFound extends Schema.TaggedError<RoundNotFound>()('RoundNotFound', {}) {}

/** Unknown leaderboard mode. HTTP 404. */
export class BoardNotFound extends Schema.TaggedError<BoardNotFound>()('BoardNotFound', {}) {}

/** Answers skipped a sequence number. The client resends from `expectedSeq`. HTTP 409. */
export class SeqGap extends Schema.TaggedError<SeqGap>()('SeqGap', {
  expectedSeq: Schema.Number,
}) {}

/** The player already has a round in play; it must be finished first. HTTP 409. */
export class RoundInProgress extends Schema.TaggedError<RoundInProgress>()('RoundInProgress', {
  roundId: Schema.String,
  mode: Schema.String,
}) {}

/** The round no longer accepts answers. HTTP 409. */
export class RoundClosed extends Schema.TaggedError<RoundClosed>()('RoundClosed', {
  status: Schema.String,
}) {}

/** Too many requests in the current window. HTTP 429. */
export class RateLimited extends Schema.TaggedError<RateLimited>()('RateLimited', {
  retryAfterSeconds: Schema.Number,
}) {}

export type AppError =
  | InvalidRequest
  | NotSignedIn
  | OriginRejected
  | CaptchaFailed
  | RoundNotFound
  | BoardNotFound
  | SeqGap
  | RoundInProgress
  | RoundClosed
  | RateLimited;
