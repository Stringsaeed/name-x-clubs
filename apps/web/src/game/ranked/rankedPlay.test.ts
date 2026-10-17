import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { type ClubId, clubs } from '../../content/catalog';
import { createGameController, type GameView } from '../controller';
import { AnswerQueue, maxEntriesPerRequest, maxEntryLength } from './answerQueue';
import { formatRankedTime, roundMsAt, serverOffset } from './clock';
import { createFakeServer, memoryStorage } from './fakeServer';
import type { RankedSnapshot } from './RankedRound';
import { RankedPlay } from './rankedPlay';
import { rankedOutcome, rankedView } from './rankedView';
import { readStoredRound } from './storedRound';

const roundId = '0192f0a4-0000-7000-8000-000000000002';

const answersPath = `/api/rounds/${roundId}/answers`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 9, 15, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AnswerQueue', () => {
  test('numbers entries from 0 and sends at most ten per request', () => {
    const queue = new AnswerQueue();

    for (let index = 0; index < 12; index += 1) {
      queue.add(`club ${index}`, index);
    }

    expect(queue.nextBatch()?.entries).toHaveLength(maxEntriesPerRequest);
    queue.acknowledge(10);
    expect(queue.nextBatch()).toMatchObject({ seq: 10, entries: [{ seq: 10 }, { seq: 11 }] });
    queue.acknowledge(12);
    expect(queue.nextBatch()).toBeNull();
  });

  test('cuts entries to the server limit', () => {
    const queue = new AnswerQueue();

    expect(queue.add('x'.repeat(500), 0).text).toHaveLength(maxEntryLength);
  });

  test('rewinds to a known seq only', () => {
    const queue = new AnswerQueue();
    queue.add('Arsenal', 0);
    queue.acknowledge(1);

    expect(queue.rewind(0)).toBe(true);
    expect(queue.nextBatch()?.seq).toBe(0);
    expect(queue.rewind(5)).toBe(false);
  });

  test('restarts its numbering when the server is ahead of every known entry', () => {
    const queue = new AnswerQueue([{ seq: 0, text: 'Arsenal', enteredAt: 0 }]);
    queue.acknowledge(4);

    expect(queue.add('Chelsea', 1).seq).toBe(4);
  });
});

describe('clock', () => {
  test('splits the round trip evenly', () => {
    expect(serverOffset(10_500, 1_000, 2_000)).toBe(9_000);
  });

  test('never stamps an entry before the start', () => {
    expect(roundMsAt(1_000, 50_000, 0)).toBe(0);
    expect(roundMsAt(2_000, 10_000, 9_000)).toBe(1_000);
  });

  test('writes ranked times as mm:ss.t, truncating', () => {
    expect(formatRankedTime(102_399)).toBe('01:42.3');
    expect(formatRankedTime(9_999)).toBe('00:09.9');
    expect(formatRankedTime(3_600_000)).toBe('60:00.0');
  });
});

function playingView(found: ClubId[]): GameView {
  const controller = createGameController({ storage: null });
  controller.dispatch({ type: 'start' });
  const view = controller.getSnapshot();

  return {
    ...view,
    session: { ...view.session, round: { phase: 'playing', found, startedAt: 0 } },
  };
}

function liveSnapshot(patch: Partial<RankedSnapshot>): RankedSnapshot {
  return {
    status: 'live',
    mode: 't10',
    displayName: 'Ace',
    found: [],
    startedAt: 5_000,
    syncing: false,
    result: null,
    ...patch,
  };
}

const [first, second, third] = clubs.map((club) => club.id);

describe('rankedView', () => {
  test('shows unconfirmed local clubs after the server ones while answers are on their way', () => {
    const view = rankedView(
      playingView([first, second] as ClubId[]),
      liveSnapshot({ found: [third] as ClubId[], syncing: true }),
    );

    expect(view.session.round).toEqual({
      phase: 'playing',
      found: [third, first, second],
      startedAt: 5_000,
    });
  });

  test('shows only the server clubs once it has caught up', () => {
    const view = rankedView(
      playingView([first, second] as ClubId[]),
      liveSnapshot({ found: [first] as ClubId[] }),
    );

    expect(view.session.round.found).toEqual([first]);
  });

  test('ends the round with the server time', () => {
    const settled = liveSnapshot({
      status: 'settled',
      found: [first] as ClubId[],
      result: { status: 'verified', elapsedMs: 12_345, ranks: { day: 1, week: 1, all: 1 } },
    });
    const view = playingView([first] as ClubId[]);

    expect(rankedView(view, settled).session.round).toEqual({
      phase: 'complete',
      found: [first],
      elapsed: 12,
    });
    expect(rankedOutcome(view, settled)).toEqual({
      kind: 'verified',
      elapsedMs: 12_345,
      ranks: { day: 1, week: 1, all: 1 },
      displayName: 'Ace',
    });
  });

  test('leaves Practice alone', () => {
    const controller = createGameController({ storage: null });
    controller.dispatch({ type: 'mode', mode: 'practice' });
    controller.dispatch({ type: 'start' });
    const view = controller.getSnapshot();

    expect(rankedView(view, liveSnapshot({ found: [first] as ClubId[] }))).toBe(view);
  });
});

describe('RankedPlay', () => {
  function setup() {
    const server = createFakeServer();
    const storage = memoryStorage();
    const controller = createGameController({ storage: null });
    const play = new RankedPlay({ controller, api: server.api, storage, lang: 'ar' });

    return { server, storage, controller, play };
  }

  async function startRanked() {
    const context = setup();
    context.play.startRound();
    const now = Date.now();
    await context.server
      .take('/api/rounds')
      .respond(201, { roundId, startedAt: now, serverNow: now, displayName: 'Ace' });

    return context;
  }

  test('ranks Free time rounds at their level', async () => {
    const { server, play } = setup();
    play.changeLevel(50);
    play.startRound();

    expect(server.take('/api/rounds').body).toEqual({ mode: 't50', lang: 'ar' });
    expect(play.getSnapshot().ranked?.status).toBe('connecting');
  });

  test('keeps Practice local', () => {
    const { server, play } = setup();
    play.changeMode('practice');
    play.startRound();

    expect(server.requests).toHaveLength(0);
    expect(play.getSnapshot().ranked).toBeNull();
  });

  test('answers locally at once and sends every entry, accepted or not', async () => {
    const { server, play } = await startRanked();

    expect(play.submitAnswer('Arsenal')).toBe(true);
    expect(play.getSnapshot().view.session.round.found).toHaveLength(1);
    expect(play.submitAnswer('Not a club')).toBe(false);

    expect(server.take(answersPath).body).toMatchObject({ entries: [{ text: 'Arsenal' }] });
  });

  test('closes the ranked round when the player finishes early', async () => {
    const { server, play, storage } = await startRanked();

    play.finishRound();

    expect(server.take(`/api/rounds/${roundId}/finish`).body).toEqual({ lang: 'ar' });
    expect(play.getSnapshot().view.session.round.phase).toBe('complete');
    expect(readStoredRound(storage)).toBeNull();
  });

  test('forgets the ranked round on the next round', async () => {
    const { play, storage } = await startRanked();
    play.finishRound();
    play.nextRound();

    expect(play.getSnapshot().ranked).toBeNull();
    expect(readStoredRound(storage)).toBeNull();
  });

  test('plays exactly like today without an API', () => {
    const controller = createGameController({ storage: null });
    const play = new RankedPlay({ controller, api: null, storage: null, lang: 'en' });
    play.startRound();

    expect(play.submitAnswer('Arsenal')).toBe(true);
    expect(play.getSnapshot().view).toBe(controller.getSnapshot());
  });

  test('resumes the stored round when the page loads with it on screen', async () => {
    const { server, storage, controller } = await startRanked();
    const reloaded = new RankedPlay({ controller, api: server.api, storage, lang: 'en' });

    reloaded.connect(null);

    expect(server.take(`/api/rounds/${roundId}?lang=en`).method).toBe('GET');
  });
});
