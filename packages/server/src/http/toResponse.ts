import type { SqlError } from 'effect/sql';
import type { AppError } from '../errors';

export const noStore = { 'Cache-Control': 'private, no-store' } as const;

export function json(body: unknown, status = 200, headers: HeadersInit = noStore) {
  return Response.json(body, { status, headers });
}

function statusOf(error: AppError): number {
  switch (error._tag) {
    case 'InvalidRequest':
      return 400;
    case 'NotSignedIn':
      return 401;
    case 'OriginRejected':
    case 'CaptchaFailed':
      return 403;
    case 'RoundNotFound':
    case 'BoardNotFound':
      return 404;
    case 'SeqGap':
    case 'RoundInProgress':
    case 'RoundClosed':
      return 409;
    case 'RateLimited':
      return 429;
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
}

/**
 * The error's own fields, such as `expectedSeq`, go to the client next to its tag. `message` is
 * not enumerable on errors, so a decoding failure's reason is added explicitly.
 */
function errorBody(error: AppError) {
  const { _tag, ...fields } = error;

  if (error._tag === 'InvalidRequest') {
    return { error: _tag, message: error.message };
  }

  return { error: _tag, ...fields };
}

/** The single place where a typed failure becomes an HTTP response. */
export function toResponse(error: AppError | SqlError.SqlError): Response {
  if (error._tag === 'SqlError') {
    console.error('Database error', error);

    return unavailable();
  }

  const headers = new Headers(noStore);

  if (error._tag === 'RateLimited') {
    headers.set('Retry-After', String(error.retryAfterSeconds));
  }

  return json(errorBody(error), statusOf(error), headers);
}

export function unavailable() {
  return json({ error: 'Unavailable' }, 503);
}

export function internalError() {
  return json({ error: 'Internal' }, 500);
}
