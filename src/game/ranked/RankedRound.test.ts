import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createFakeServer, flushPromises, memoryStorage } from './fakeServer';
import { connectionTimeoutMs, RankedRound } from './RankedRound';
import { readStoredRound } from './storedRound';

const roundId = '0192f0a4-0000-7000-8000-000000000001';

const roundPath = `/api/rounds/${roundId}`;

const answersPath = `${roundPath}/answers`;

const finishPath = `${roundPath}/finish`;

/** The client clock starts here; the server clock runs 60 s ahead of it. */
const clientStart = Date.UTC(2026, 9, 15, 12, 0, 0);

const serverAhead = 60_000;

function setup() {
  const server = createFakeServer();
  const storage = memoryStorage();
  const options = { api: server.api, storage, lang: 'en' as const, now: () => Date.now() };

  return { server, storage, options };
}

async function startLive() {
  const context = setup();
  const round = RankedRound.start('t10', context.options);
  const serverNow = Date.now() + serverAhead;

  await context.server.take('/api/rounds').respond(201, {
    roundId,
    startedAt: serverNow,
    serverNow,
    displayName: 'Swift Striker #4K2Q',
  });

  return { ...context, round };
}

function answered(nextSeq: number, found: string[], phase = 'playing', extra = {}) {
  return { nextSeq, found, events: [], phase, ...extra };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(clientStart);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('starting', () => {
  test('asks for the mode and language, then shows the server start on the client clock', async () => {
    const { server, options } = setup();
    const round = RankedRound.start('t50', options);
    const request = server.take('/api/rounds');

    expect(request.body).toEqual({ mode: 't50', lang: 'en' });
    expect(round.getSnapshot().status).toBe('connecting');

    // The server started the round 60 s ahead of this clock: the timer starts at our "now".
    vi.advanceTimersByTime(200);
    const serverNow = clientStart + serverAhead + 100;
    await request.respond(201, { roundId, startedAt: serverNow, serverNow, displayName: 'Ace' });

    expect(round.getSnapshot()).toMatchObject({
      status: 'live',
      displayName: 'Ace',
      startedAt: clientStart + 100,
    });
  });

  test('plays unranked when the server cannot be reached', async () => {
    const { server, options } = setup();
    const round = RankedRound.start('t10', options);

    await server.take('/api/rounds').failNetwork();

    expect(round.getSnapshot().status).toBe('unranked');
  });

  test('closes a round left open in another tab, then starts again', async () => {
    const { server, options } = setup();
    const round = RankedRound.start('t10', options);
    const staleRoundId = '0192f0a4-0000-7000-8000-0000000000ff';

    await server
      .take('/api/rounds')
      .respond(409, { error: 'RoundInProgress', roundId: staleRoundId, mode: 't50' });

    const abandon = server.take(`/api/rounds/${staleRoundId}/finish`);
    await abandon.respond(200, { status: 'abandoned', elapsedMs: null, ranks: null });

    const serverNow = Date.now();
    await server
      .take('/api/rounds')
      .respond(201, { roundId, startedAt: serverNow, serverNow, displayName: 'Ace' });

    expect(abandon.method).toBe('POST');
    expect(round.getSnapshot().status).toBe('live');
  });

  test('plays unranked when the open round is still there after closing it', async () => {
    const { server, options } = setup();
    const round = RankedRound.start('t10', options);
    const inProgress = { error: 'RoundInProgress', roundId, mode: 't10' };

    await server.take('/api/rounds').respond(409, inProgress);
    await server.take(finishPath).failNetwork();
    await server.take('/api/rounds').respond(409, inProgress);

    expect(round.getSnapshot().status).toBe('unranked');
    expect(server.requests).toHaveLength(0);
  });

  test('plays unranked when the start takes longer than the connection timeout', async () => {
    const { server, options } = setup();
    const round = RankedRound.start('t10', options);
    const request = server.take('/api/rounds');

    vi.advanceTimersByTime(connectionTimeoutMs);

    expect(round.getSnapshot().status).toBe('unranked');

    // A late start changes nothing here, and the round it created is closed.
    await request.respond(201, { roundId, startedAt: 0, serverNow: 0, displayName: 'Ace' });
    expect(round.getSnapshot().status).toBe('unranked');
    expect(server.take(finishPath).method).toBe('POST');
  });
});

describe('sending answers', () => {
  test('sends one request at a time and batches what was typed meanwhile', async () => {
    const { server, round } = await startLive();

    round.submit('Arsenal');
    const first = server.take(answersPath);
    round.submit('Chelsea');
    round.submit('Liverpool');

    expect(server.requests).toHaveLength(0);
    expect(first.body).toMatchObject({ seq: 0, entries: [{ text: 'Arsenal' }] });
    expect(round.getSnapshot().syncing).toBe(true);

    await first.respond(200, answered(1, ['arsenal']));
    const second = server.take(answersPath);

    expect(second.body).toMatchObject({
      seq: 1,
      entries: [{ text: 'Chelsea' }, { text: 'Liverpool' }],
    });

    await second.respond(200, answered(3, ['arsenal', 'chelsea', 'liverpool']));

    expect(server.requests).toHaveLength(0);
    expect(round.getSnapshot()).toMatchObject({
      syncing: false,
      found: ['arsenal', 'chelsea', 'liverpool'],
    });
  });

  test('queues answers typed before the round starts and sends them once it does', async () => {
    const { server, options } = setup();
    const round = RankedRound.start('t10', options);
    round.submit('Arsenal');
    const serverNow = Date.now() + serverAhead;

    await server
      .take('/api/rounds')
      .respond(201, { roundId, startedAt: serverNow, serverNow, displayName: 'Ace' });

    expect(server.take(answersPath).body).toMatchObject({ seq: 0, entries: [{ text: 'Arsenal' }] });
  });

  test('stamps entries with server-relative time from the clock offset', async () => {
    const { server, round } = await startLive();

    vi.advanceTimersByTime(4_000);
    round.submit('Arsenal');

    expect(server.take(answersPath).body).toEqual({
      seq: 0,
      entries: [{ text: 'Arsenal', clientMs: 4_000 }],
    });
  });

  test('adopts the server found list when it disagrees', async () => {
    const { server, round } = await startLive();

    round.submit('Arsenal, Chelsea, Liverpool, Everton');
    await server.take(answersPath).respond(200, answered(1, ['arsenal', 'chelsea', 'liverpool']));

    expect(round.getSnapshot().found).toEqual(['arsenal', 'chelsea', 'liverpool']);
  });

  test('resends from the expected seq after a seq gap', async () => {
    const { server, round } = await startLive();

    round.submit('Arsenal');
    await server.take(answersPath).respond(200, answered(1, ['arsenal']));
    round.submit('Chelsea');
    await server.take(answersPath).respond(409, { error: 'SeqGap', expectedSeq: 0 });

    expect(server.take(answersPath).body).toMatchObject({
      seq: 0,
      entries: [{ text: 'Arsenal' }, { text: 'Chelsea' }],
    });
  });

  test('retries with growing delays while the server is down', async () => {
    const { server, round } = await startLive();

    round.submit('Arsenal');
    await server.take(answersPath).respond(503, { error: 'Unavailable' });

    vi.advanceTimersByTime(499);
    expect(server.requests).toHaveLength(0);
    vi.advanceTimersByTime(1);
    await server.take(answersPath).failNetwork();

    vi.advanceTimersByTime(999);
    expect(server.requests).toHaveLength(0);
    vi.advanceTimersByTime(1);
    await server.take(answersPath).respond(200, answered(1, ['arsenal']));

    expect(round.getSnapshot()).toMatchObject({ status: 'live', found: ['arsenal'] });
  });

  test('goes unranked after 15 s without a successful response, and closes the round', async () => {
    const { server, round, storage } = await startLive();

    round.submit('Arsenal');
    server.take(answersPath);
    vi.advanceTimersByTime(connectionTimeoutMs - 1);
    expect(round.getSnapshot().status).toBe('live');

    vi.advanceTimersByTime(1);

    expect(round.getSnapshot()).toMatchObject({ status: 'unranked', syncing: false });
    expect(server.take(finishPath).body).toEqual({ lang: 'en' });
    expect(readStoredRound(storage)).toBeNull();

    // Later entries stay local.
    round.submit('Chelsea');
    expect(server.requests).toHaveLength(0);
  });

  test('a success restarts the connection clock', async () => {
    const { server, round } = await startLive();

    round.submit('Arsenal');
    vi.advanceTimersByTime(10_000);
    await server.take(answersPath).respond(200, answered(1, ['arsenal']));
    round.submit('Chelsea');
    server.take(answersPath);
    vi.advanceTimersByTime(10_000);

    expect(round.getSnapshot().status).toBe('live');
  });

  test('plays unranked when the session is gone', async () => {
    const { server, round } = await startLive();

    round.submit('Arsenal');
    await server.take(answersPath).respond(401, { error: 'NotSignedIn' });

    expect(round.getSnapshot().status).toBe('unranked');
  });
});

describe('finishing', () => {
  test('settles with the server time, ranks and name once the target is reached', async () => {
    const { server, round } = await startLive();

    round.submit('Ten clubs');
    await server
      .take(answersPath)
      .respond(
        200,
        answered(1, ['arsenal'], 'complete', { result: { status: 'verified', elapsedMs: 12_345 } }),
      );

    expect(round.getSnapshot()).toMatchObject({
      status: 'settling',
      result: { status: 'verified', elapsedMs: 12_345, ranks: null },
    });

    const ranks = { day: 1, week: 2, all: 3 };
    const finish = server.take(finishPath);
    expect(finish.body).toEqual({ lang: 'en' });
    await finish.respond(200, {
      status: 'verified',
      elapsedMs: 12_345,
      ranks,
      displayName: 'Swift Striker #4K2Q',
    });

    expect(round.getSnapshot()).toMatchObject({
      status: 'settled',
      displayName: 'Swift Striker #4K2Q',
      result: { status: 'verified', elapsedMs: 12_345, ranks },
    });
  });

  test('abandons the round on the server when the player finishes early', async () => {
    const { server, round, storage } = await startLive();

    round.abandon();

    expect(round.getSnapshot().status).toBe('abandoned');
    expect(server.take(finishPath).body).toEqual({ lang: 'en' });
    expect(readStoredRound(storage)).toBeNull();
  });
});

describe('resuming after a reload', () => {
  async function playedTwoAndReload() {
    const { server, round, storage, options } = await startLive();

    round.submit('Arsenal');
    await server.take(answersPath).respond(200, answered(1, ['arsenal']));
    round.submit('Chelsea');
    server.take(answersPath);
    round.dispose();

    const stored = readStoredRound(storage);

    if (stored === null) {
      throw new Error('The round was not stored');
    }

    return { server, stored, options };
  }

  test('restores found clubs and the timer, and resends what the server missed', async () => {
    const { server, stored, options } = await playedTwoAndReload();

    vi.advanceTimersByTime(30_000);
    const resumed = RankedRound.resume(stored, options);
    const resume = server.take(`${roundPath}?lang=en`);
    const serverNow = Date.now() + serverAhead;
    await resume.respond(200, {
      roundId,
      mode: 't10',
      status: 'playing',
      phase: 'playing',
      startedAt: clientStart + serverAhead,
      serverNow,
      nextSeq: 1,
      found: ['arsenal'],
      elapsedMs: null,
      displayName: 'Swift Striker #4K2Q',
    });

    expect(resumed.getSnapshot()).toMatchObject({
      status: 'live',
      found: ['arsenal'],
      startedAt: clientStart,
      syncing: true,
    });
    expect(server.take(answersPath).body).toMatchObject({
      seq: 1,
      entries: [{ text: 'Chelsea' }],
    });
  });

  test('keeps the clock offset measured at the start', async () => {
    const { server, stored, options } = await playedTwoAndReload();
    const resumed = RankedRound.resume(stored, options);

    // This response alone would put the start an hour off; the stored offset wins.
    await server.take(`${roundPath}?lang=en`).respond(200, {
      roundId,
      mode: 't10',
      status: 'playing',
      phase: 'playing',
      startedAt: clientStart + serverAhead,
      serverNow: Date.now() + serverAhead + 3_600_000,
      nextSeq: 2,
      found: ['arsenal', 'chelsea'],
      elapsedMs: null,
      displayName: 'Ace',
    });

    expect(resumed.getSnapshot()).toMatchObject({ startedAt: clientStart, syncing: false });
    await flushPromises();
    expect(server.requests).toHaveLength(0);
  });

  test('plays unranked when the round cannot be resumed', async () => {
    const { server, stored, options } = await playedTwoAndReload();
    const resumed = RankedRound.resume(stored, options);

    await server.take(`${roundPath}?lang=en`).respond(404, { error: 'RoundNotFound' });

    expect(resumed.getSnapshot().status).toBe('unranked');
  });

  test('shows the result of a round the server finished meanwhile', async () => {
    const { server, stored, options } = await playedTwoAndReload();
    const resumed = RankedRound.resume(stored, options);

    await server.take(`${roundPath}?lang=en`).respond(200, {
      roundId,
      mode: 't10',
      status: 'flagged',
      phase: 'complete',
      startedAt: clientStart + serverAhead,
      serverNow: Date.now() + serverAhead,
      nextSeq: 2,
      found: ['arsenal', 'chelsea'],
      elapsedMs: 9_000,
      displayName: 'Ace',
    });
    await server
      .take(finishPath)
      .respond(200, { status: 'flagged', elapsedMs: 9_000, ranks: null, displayName: 'Ace' });

    expect(resumed.getSnapshot()).toMatchObject({
      status: 'settled',
      result: { status: 'flagged', elapsedMs: 9_000 },
    });
  });
});
