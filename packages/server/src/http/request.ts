import type { Caller } from '@nxc/game/ranked/types';
import { Effect, Schema } from 'effect';
import type { ServerSettings } from '../config';
import { InvalidRequest, OriginRejected } from '../errors';
import { sessionLifetimeMs } from '../identity/PlayerStore';

export const sessionCookieName = 'nxc_s';

/** Ten entries of 120 characters fit easily; anything larger is not from our client. */
const maxBodyBytes = 16 * 1024;

/** Unknown properties are errors, so a forged `elapsedMs` or `found` is a 400, not ignored. */
const strict = { onExcessProperty: 'error', errors: 'first' } as const;

export function decodeStrict<A>(schema: Schema.Decoder<A>, input: unknown) {
  return Schema.decodeUnknownEffect(schema)(input, strict).pipe(
    Effect.mapError((error) => new InvalidRequest({ message: error.message })),
  );
}

/** Reads and decodes a JSON body. An empty body decodes as `{}`. */
export function readBody<A>(request: Request, schema: Schema.Decoder<A>) {
  return Effect.gen(function* () {
    const text = yield* Effect.promise(() => request.text());

    if (text.length > maxBodyBytes) {
      return yield* new InvalidRequest({ message: 'Body too large' });
    }

    const json = yield* Effect.try({
      try: () => (text.trim() === '' ? {} : JSON.parse(text)),
      catch: () => new InvalidRequest({ message: 'Body is not JSON' }),
    });

    return yield* decodeStrict(schema, json);
  });
}

function hostOf(origin: string) {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
}

/**
 * The host the browser asked for. Behind Vercel's proxy (and the local Next.js rewrite)
 * `request.url` may name an internal host, so the `Host` headers are the reliable source.
 */
function requestedHost(request: Request) {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();

  return forwarded || request.headers.get('host') || new URL(request.url).host;
}

/**
 * A state-changing request must come from this site. Browsers send `Origin` on every POST made
 * with `fetch`, so a missing one is rejected too.
 */
export function checkOrigin(request: Request, settings: ServerSettings) {
  const origin = request.headers.get('origin');

  if (origin === null) {
    return Effect.fail(new OriginRejected());
  }

  const sameSite = hostOf(origin) === requestedHost(request);

  if (sameSite || settings.allowedOrigins.includes(origin)) {
    return Effect.void;
  }

  return Effect.fail(new OriginRejected());
}

function cookieValue(request: Request, name: string) {
  const header = request.headers.get('cookie') ?? '';

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');

    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return undefined;
}

/** Vercel puts the client address first in `x-forwarded-for`. */
function clientAddress(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

export function callerFrom(request: Request): Caller {
  return {
    sessionToken: cookieValue(request, sessionCookieName),
    clientAddress: clientAddress(request),
  };
}

/** HTTPS requests, including those terminated at a proxy. */
export function requestIsSecure(request: Request) {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();

  if (forwarded === 'https' || forwarded === 'http') {
    return forwarded === 'https';
  }

  return new URL(request.url).protocol === 'https:';
}

export function sessionCookie(token: string, settings: ServerSettings, request: Request) {
  const attributes = [
    `${sessionCookieName}=${token}`,
    'Path=/',
    `Max-Age=${Math.floor(sessionLifetimeMs / 1000)}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  // WebKit drops a Secure cookie set over plain HTTP, which is how local and CI
  // builds serve the game. Production HTTPS still gets the flag.
  if (settings.secureCookies && requestIsSecure(request)) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}
