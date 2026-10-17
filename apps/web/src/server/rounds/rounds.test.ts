import { afterEach, beforeEach, describe, expect, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';
import { sha256Hex } from '../crypto';
import { uniqueClubNames } from '../testing/clubNames';
import { apiRequest, makeTestApp, sessionFrom, type TestApp } from '../testing/testApp';

const [arsenalLike = '', ...otherNames] = uniqueClubNames(12);

const tenClubs = [arsenalLike, ...otherNames].slice(0, 10);

/** A generated nickname: words, then `#` and a four-character tag. */
const nicknamePattern = /^\S.* #[0-9A-Z]{4}$/;

const arabicLetter = /[\u0600-\u06FF]/;

let app: TestApp;

beforeEach(async () => {
  app = await makeTestApp();
});

afterEach(async () => {
  await app.dispose();
});

async function startRound(mode = 't10', session?: string) {
  const response = await app.routes.startRound(
    apiRequest('/api/rounds', { body: { mode, lang: 'en' }, ...(session ? { session } : {}) }),
  );
  const body = await response.json();

  return { response, body, session: session ?? sessionFrom(response) };
}

function answer(roundId: string, session: string, seq: number, texts: readonly string[]) {
  const entries = texts.map((text) => ({ text, clientMs: 0 }));

  return app.routes.submitAnswers(
    apiRequest(`/api/rounds/${roundId}/answers`, { body: { seq, entries }, session }),
    roundId,
  );
}

function finish(roundId: string, session: string) {
  return app.routes.finishRound(
    apiRequest(`/api/rounds/${roundId}/finish`, { body: {}, session }),
    roundId,
  );
}

/** Plays a whole Mode 10 round, `seconds` after it started. */
async function playTen(seconds: number, session?: string) {
  const started = await startRound('t10', session);
  await app.advance(seconds * 1000);
  const answered = await answer(started.body.roundId, started.session, 0, tenClubs);

  return { ...started, answered: await answered.json() };
}

describe('starting a ranked round', () => {
  it('creates an anonymous player with an httpOnly, Lax, 400-day session cookie', async () => {
    const { response, body } = await startRound();
    const cookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(201);
    expect(body).toEqual({
      roundId: expect.any(String),
      startedAt: Date.parse('2026-10-14T12:00:00.000Z'),
      serverNow: Date.parse('2026-10-14T12:00:00.000Z'),
      displayName: expect.stringMatching(nicknamePattern),
    });
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain(`Max-Age=${400 * 24 * 60 * 60}`);
    expect(cookie).not.toContain('Secure');
  });

  it('stores only the SHA-256 of the session token', async () => {
    const { session } = await startRound();
    const hashes = await app.run(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        return yield* sql<{ tokenHash: string }>`SELECT token_hash FROM credentials`;
      }),
    );

    expect(hashes).toEqual([{ tokenHash: sha256Hex(session) }]);
    expect(hashes[0]?.tokenHash).not.toContain(session);
  });

  it('rejects a forged startedAt field with 400', async () => {
    const response = await app.routes.startRound(
      apiRequest('/api/rounds', { body: { mode: 't10', lang: 'en', startedAt: 0 } }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'InvalidRequest' });
  });

  it('rejects a POST from another origin or with no origin with 403', async () => {
    const body = { mode: 't10', lang: 'en' };
    const foreign = await app.routes.startRound(
      apiRequest('/api/rounds', { body, origin: 'https://evil.example' }),
    );
    const missing = await app.routes.startRound(apiRequest('/api/rounds', { body, origin: null }));

    expect(foreign.status).toBe(403);
    expect(missing.status).toBe(403);
  });

  it('accepts a POST whose origin matches the forwarded host even when request.url differs', async () => {
    // Behind a proxy, request.url can name an internal host such as localhost.
    const request = new Request('http://localhost:3000/api/rounds', {
      method: 'POST',
      headers: { origin: 'https://nxc.example', 'x-forwarded-host': 'nxc.example' },
      body: JSON.stringify({ mode: 't10', lang: 'en' }),
    });
    const response = await app.routes.startRound(request);

    expect(response.status).toBe(201);
  });

  it('refuses a second round while one is in play, so the mode cannot change mid-round', async () => {
    const first = await startRound('t10');
    const second = await startRound('t50', first.session);

    expect(second.response.status).toBe(409);
    expect(second.body).toEqual({
      error: 'RoundInProgress',
      roundId: first.body.roundId,
      mode: 't10',
    });

    await finish(first.body.roundId, first.session);
    const third = await startRound('t50', first.session);

    expect(third.response.status).toBe(201);
  });
});

describe('submitting answers', () => {
  it('rejects a forged elapsedMs field with 400', async () => {
    const { body, session } = await startRound();
    const response = await app.routes.submitAnswers(
      apiRequest(`/api/rounds/${body.roundId}/answers`, {
        body: { seq: 0, entries: [{ text: arsenalLike, clientMs: 1 }], elapsedMs: 1 },
        session,
      }),
      body.roundId,
    );

    expect(response.status).toBe(400);
  });

  it('rejects entries over 120 characters and batches over 10 entries with 400', async () => {
    const { body, session } = await startRound();
    const tooLong = await answer(body.roundId, session, 0, ['a'.repeat(121)]);
    const tooMany = await answer(body.roundId, session, 0, Array(11).fill(arsenalLike));

    expect(tooLong.status).toBe(400);
    expect(tooMany.status).toBe(400);
  });

  it('needs a session cookie (401)', async () => {
    const { body } = await startRound();
    const response = await app.routes.submitAnswers(
      apiRequest(`/api/rounds/${body.roundId}/answers`, {
        body: { seq: 0, entries: [{ text: arsenalLike, clientMs: 0 }] },
      }),
      body.roundId,
    );

    expect(response.status).toBe(401);
  });

  it("reports another player's round as not found (404)", async () => {
    const owner = await startRound();
    const intruder = await startRound();
    const roundId = owner.body.roundId;
    const answered = await answer(roundId, intruder.session, 0, [arsenalLike]);
    const resumed = await app.routes.resumeRound(
      apiRequest(`/api/rounds/${roundId}`, { session: intruder.session }),
      roundId,
    );
    const finished = await finish(roundId, intruder.session);
    const malformed = await app.routes.resumeRound(
      apiRequest('/api/rounds/not-a-uuid', { session: owner.session }),
      'not-a-uuid',
    );

    expect([answered.status, resumed.status, finished.status, malformed.status]).toEqual([
      404, 404, 404, 404,
    ]);
  });

  it('adds nothing when a seq is replayed', async () => {
    const { body, session } = await startRound();
    const first = await (await answer(body.roundId, session, 0, [arsenalLike])).json();
    const replayed = await (await answer(body.roundId, session, 0, [arsenalLike])).json();

    expect(first.found).toHaveLength(1);
    expect(replayed).toEqual({ nextSeq: 1, found: first.found, events: [], phase: 'playing' });
  });

  it('applies only the new tail of a batch that overlaps one already applied', async () => {
    const { body, session } = await startRound();
    await answer(body.roundId, session, 0, tenClubs.slice(0, 2));
    const overlapping = await (await answer(body.roundId, session, 1, tenClubs.slice(1, 3))).json();

    expect(overlapping.nextSeq).toBe(3);
    expect(overlapping.found).toHaveLength(3);
  });

  it('answers a seq gap with 409 and the expected seq', async () => {
    const { body, session } = await startRound();
    await answer(body.roundId, session, 0, [arsenalLike]);
    const response = await answer(body.roundId, session, 5, [otherNames[0] ?? '']);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'SeqGap', expectedSeq: 1 });
  });

  it('credits at most three clubs per entry', async () => {
    const { body, session } = await startRound();
    const response = await answer(body.roundId, session, 0, [tenClubs.slice(0, 5).join(', ')]);
    const result = await response.json();

    expect(result.found).toHaveLength(3);
    expect(result.events.map((event: { kind: string }) => event.kind)).toEqual([
      'accepted',
      'accepted',
      'accepted',
      'over-limit',
      'over-limit',
    ]);
  });

  it('times the round by server receive time and ignores client times', async () => {
    const { body, session } = await startRound();
    await app.advance(42_000);
    // The client claims it finished one second in.
    const entries = tenClubs.map((text) => ({ text, clientMs: 1_000 }));
    const response = await app.routes.submitAnswers(
      apiRequest(`/api/rounds/${body.roundId}/answers`, { body: { seq: 0, entries }, session }),
      body.roundId,
    );

    expect(await response.json()).toMatchObject({
      phase: 'complete',
      result: { status: 'verified', elapsedMs: 42_000 },
    });
  });
});

describe('pace policy', () => {
  it('rejects an impossible Mode 10 round (under 5 s) and keeps it off the board', async () => {
    const { answered, body, session } = await playTen(3);
    const finished = await (await finish(body.roundId, session)).json();
    const board = await (
      await app.routes.leaderboard(apiRequest('/api/leaderboards/t10'), 't10')
    ).json();

    expect(answered.result).toEqual({ status: 'rejected', elapsedMs: 3_000 });
    expect(finished).toMatchObject({ status: 'rejected', elapsedMs: 3_000, ranks: null });
    expect(board.entries).toEqual([]);
  });

  it('flags a suspicious round (under 10 s) and keeps it off the public board', async () => {
    const { answered, session } = await playTen(7);
    const board = await (
      await app.routes.leaderboard(apiRequest('/api/leaderboards/t10'), 't10')
    ).json();
    const mine = await (
      await app.routes.myStanding(apiRequest('/api/leaderboards/t10/me', { session }), 't10')
    ).json();

    expect(answered.result).toEqual({ status: 'flagged', elapsedMs: 7_000 });
    expect(board.entries).toEqual([]);
    expect(mine).toEqual({ rank: null, total: 0, best: null });
  });

  it('flags a round whose client clock runs ahead of the server', async () => {
    const { body, session } = await startRound();
    await app.advance(40_000);
    const entries = tenClubs.map((text) => ({ text, clientMs: 90_000 }));
    const response = await app.routes.submitAnswers(
      apiRequest(`/api/rounds/${body.roundId}/answers`, { body: { seq: 0, entries }, session }),
      body.roundId,
    );

    expect((await response.json()).result).toEqual({ status: 'flagged', elapsedMs: 40_000 });
  });
});

describe('resuming and finishing', () => {
  it('resumes a round in play with the server clock', async () => {
    const { body, session } = await startRound();
    await answer(body.roundId, session, 0, [arsenalLike]);
    await app.advance(5_000);
    const resumed = await app.routes.resumeRound(
      apiRequest(`/api/rounds/${body.roundId}`, { session }),
      body.roundId,
    );

    expect(await resumed.json()).toMatchObject({
      roundId: body.roundId,
      mode: 't10',
      status: 'playing',
      phase: 'playing',
      startedAt: body.startedAt,
      serverNow: body.startedAt + 5_000,
      nextSeq: 1,
      elapsedMs: null,
    });
  });

  it('returns day, week and all-time ranks for a verified round, idempotently', async () => {
    const { body, session } = await playTen(30);
    const first = await (await finish(body.roundId, session)).json();
    const again = await (await finish(body.roundId, session)).json();
    const expected = {
      status: 'verified',
      elapsedMs: 30_000,
      ranks: { day: 1, week: 1, all: 1 },
      displayName: expect.stringMatching(nicknamePattern),
    };

    expect(first).toEqual(expected);
    expect(again).toEqual(expected);
  });

  it('abandons a round finished early, unranked', async () => {
    const { body, session } = await startRound();
    await answer(body.roundId, session, 0, [arsenalLike]);
    const finished = await (await finish(body.roundId, session)).json();
    const late = await answer(body.roundId, session, 1, [otherNames[0] ?? '']);

    expect(finished).toEqual({
      status: 'abandoned',
      elapsedMs: null,
      ranks: null,
      displayName: expect.stringMatching(nicknamePattern),
    });
    expect(late.status).toBe(409);
  });
});

describe("the owner's display name", () => {
  function resume(roundId: string, session: string, query = '') {
    return app.routes.resumeRound(
      apiRequest(`/api/rounds/${roundId}${query}`, { session }),
      roundId,
    );
  }

  function finishIn(roundId: string, session: string, lang: 'en' | 'ar') {
    return app.routes.finishRound(
      apiRequest(`/api/rounds/${roundId}/finish`, { body: { lang }, session }),
      roundId,
    );
  }

  it('names the player in the round language on start, and resume defaults to it', async () => {
    const started = await app.routes.startRound(
      apiRequest('/api/rounds', { body: { mode: 't10', lang: 'ar' } }),
    );
    const body = await started.json();
    const session = sessionFrom(started);
    const resumed = await (await resume(body.roundId, session)).json();

    expect(body.displayName).toMatch(arabicLetter);
    expect(body.displayName).toMatch(nicknamePattern);
    expect(resumed.displayName).toBe(body.displayName);
  });

  it('uses the requested language on resume and finish, with one shared tag', async () => {
    const { body, session } = await startRound();
    const english = await (await resume(body.roundId, session, '?lang=en')).json();
    const arabic = await (await resume(body.roundId, session, '?lang=ar')).json();
    const finished = await (await finishIn(body.roundId, session, 'ar')).json();
    const tag = (name: string) => name.slice(name.lastIndexOf('#'));

    expect(english.displayName).toBe(body.displayName);
    expect(english.displayName).not.toMatch(arabicLetter);
    expect(arabic.displayName).toMatch(arabicLetter);
    expect(tag(arabic.displayName)).toBe(tag(english.displayName));
    expect(finished.displayName).toBe(arabic.displayName);
  });

  it('rejects an unknown resume language with 400', async () => {
    const { body, session } = await startRound();
    const response = await resume(body.roundId, session, '?lang=fr');

    expect(response.status).toBe(400);
  });

  it('prefers a username over the nickname', async () => {
    const { body, session } = await startRound();
    await app.run(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const handleId = '0192a000-0000-7000-8000-000000000001';

        yield* sql`
          INSERT INTO handles (id, player_id, display, skeleton, created_at)
          SELECT ${handleId}::uuid, player_id, 'saeed', 'saeed', now() FROM rounds
          WHERE id = ${body.roundId}::uuid
        `;
        yield* sql`UPDATE players SET handle_id = ${handleId}::uuid`;
      }),
    );
    const resumed = await (await resume(body.roundId, session, '?lang=ar')).json();
    const finished = await (await finishIn(body.roundId, session, 'en')).json();

    expect(resumed.displayName).toBe('saeed');
    expect(finished.displayName).toBe('saeed');
  });

  it('keeps the name out of answers responses and is never cached', async () => {
    const { body, session } = await startRound();
    const answered = await answer(body.roundId, session, 0, [arsenalLike]);
    const resumed = await resume(body.roundId, session);

    expect(await answered.json()).not.toHaveProperty('displayName');
    expect(resumed.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe('captcha flag', () => {
  it('holds a completed round at complete until finish passes the captcha', async () => {
    await app.dispose();
    app = await makeTestApp({ captchaEnabled: true });
    const { answered, body, session } = await playTen(30);
    const finished = await (await finish(body.roundId, session)).json();

    expect(answered.result).toEqual({ status: 'complete', elapsedMs: 30_000 });
    expect(finished).toMatchObject({ status: 'verified', ranks: { day: 1 } });
  });
});

describe('public leaderboard', () => {
  it('is cacheable, shows nicknames, and never reads cookies', async () => {
    await playTen(30).then(({ body, session }) => finish(body.roundId, session));
    const request = apiRequest('/api/leaderboards/t10?period=week&lang=ar');
    const headers = new Proxy(request.headers, {
      get(target, property) {
        if (property === 'get' || property === 'has') {
          return (name: string) => {
            if (name.toLowerCase() === 'cookie') {
              throw new Error('The public board must not read cookies');
            }

            return target.get(name);
          };
        }

        return Reflect.get(target, property, target);
      },
    });
    Object.defineProperty(request, 'headers', { value: headers });

    const response = await app.routes.leaderboard(request, 't10');
    const board = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'public, s-maxage=30, stale-while-revalidate=60',
    );
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(board).toMatchObject({ mode: 't10', period: 'week' });
    expect(board.entries).toEqual([
      {
        rank: 1,
        name: expect.stringMatching(/^\S.* #[0-9A-Z]{4}$/),
        anonymous: true,
        elapsedMs: 30_000,
        achievedAt: '2026-10-14T12:00:30.000Z',
      },
    ]);
    expect(board.entries[0].name).toMatch(/[؀-ۿ]/);
  });

  it('returns 404 for an unknown mode and 400 for an unknown period', async () => {
    const unknownMode = await app.routes.leaderboard(apiRequest('/api/leaderboards/t20'), 't20');
    const unknownPeriod = await app.routes.leaderboard(
      apiRequest('/api/leaderboards/t10?period=month'),
      't10',
    );

    expect(unknownMode.status).toBe(404);
    expect(unknownPeriod.status).toBe(400);
  });

  it('returns my rank privately, and 401 without a session', async () => {
    const { body, session } = await playTen(30);
    await finish(body.roundId, session);
    const mine = await app.routes.myStanding(
      apiRequest('/api/leaderboards/t10/me?period=day', { session }),
      't10',
    );
    const anonymous = await app.routes.myStanding(apiRequest('/api/leaderboards/t10/me'), 't10');

    expect(mine.headers.get('cache-control')).toBe('private, no-store');
    expect(await mine.json()).toEqual({
      rank: 1,
      total: 1,
      best: { elapsedMs: 30_000, achievedAt: '2026-10-14T12:00:30.000Z' },
    });
    expect(anonymous.status).toBe(401);
  });
});

describe('health', () => {
  it('runs SELECT 1 through the runtime', async () => {
    const response = await app.routes.health();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ db: 'ok' });
  });
});
