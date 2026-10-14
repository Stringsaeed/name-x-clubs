import { afterEach, describe, expect, test } from 'vitest';
import { clubs } from '../content/catalog';
import { createGameController, elapsedSeconds, type StoragePort } from './controller';
import { levels } from './model';

class MemoryStorage implements StoragePort {
  values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const at = Date.parse('2026-10-14T12:00:00Z');

const day = 24 * 60 * 60 * 1000;

const disconnects: (() => void)[] = [];

afterEach(() => {
  for (const disconnect of disconnects.splice(0)) {
    disconnect();
  }
});

function fixture() {
  const storage = new MemoryStorage();
  let time = at;
  const create = () => createGameController({ storage, now: () => time, random: () => 0.99 });

  return {
    storage,
    create,
    setTime: (next: number) => {
      time = next;
    },
  };
}

/** A controller connected to the jsdom window, standing in for one browser tab. */
function connectedTab(create: () => ReturnType<typeof createGameController>) {
  const tab = create();
  disconnects.push(tab.connect(window));
  return tab;
}

/** Delivers what another tab wrote, the way the browser does: a storage event in this tab. */
function announce(storage: MemoryStorage, key: string, newValue = storage.getItem(key)) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

function savedRound(round: unknown, ids: { category?: string; challengeId?: string } = {}) {
  return JSON.stringify({
    version: 2,
    category: ids.category ?? 'world',
    challengeId: ids.challengeId ?? 'world',
    round,
  });
}

describe('saved game sessions', () => {
  test('shows one clear message for repeated unrecognized input', () => {
    const f = fixture();
    const game = f.create();

    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'answer', text: 'zzzzzzzzzz, zzzzzzzzzz' });

    expect(game.getSnapshot().feedback).toHaveLength(1);
    expect(game.getSnapshot().session.round.found).toHaveLength(0);
  });

  test('defaults to Free time and leaves disabled daily saves untouched', () => {
    const f = fixture();
    f.storage.setItem('nxc-mode', JSON.stringify('daily'));
    const saved = JSON.stringify({
      phase: 'playing',
      found: ['england-0'],
      deadline: at + 45000,
      remaining: 60,
    });
    f.storage.setItem('nxc-v2-daily-2026-10-14-10', saved);

    const game = f.create();

    expect(game.getSnapshot().mode).toBe('free');
    expect(game.getSnapshot().session.round).toEqual({ phase: 'idle', found: [] });

    game.dispatch({ type: 'start' });

    expect(f.storage.getItem('nxc-v2-daily-2026-10-14-10')).toBe(saved);
  });

  test('counts up across refresh and freezes only when the player finishes', () => {
    const f = fixture();
    const game = f.create();
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'answer', text: 'Arsenal' });
    f.setTime(at + 3615000);

    expect(game.getSnapshot().session.round.phase).toBe('playing');

    const restored = f.create();

    expect(elapsedSeconds(restored.getSnapshot().session, at + 3615000)).toBe(3615);

    restored.dispatch({ type: 'finish' });
    f.setTime(at + 7200000);

    expect(elapsedSeconds(f.create().getSnapshot().session, at + 7200000)).toBe(3615);

    restored.dispatch({ type: 'restart' });

    expect(restored.getSnapshot().session.round).toEqual({ phase: 'idle', found: [] });
  });

  test('restores practice mode, a random question and accepted order', () => {
    const f = fixture();
    const game = f.create();
    game.dispatch({ type: 'mode', mode: 'practice' });
    game.dispatch({ type: 'level', level: 50 });
    game.dispatch({ type: 'practice', category: 'random' });
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'answer', text: 'Arsenal, Man Utd, مانشستر يونايتد' });
    const before = game.getSnapshot();

    const restored = f.create().getSnapshot();

    expect(restored.mode).toBe('practice');
    expect(restored.level).toBe(50);
    expect(restored.session).toEqual(before.session);
    expect(restored.session.round.found).toEqual(['england-0', 'england-1']);
  });

  test('maintains separate progress and start times for every mode size', () => {
    const f = fixture();
    const game = f.create();

    for (const level of levels) {
      game.dispatch({ type: 'level', level });
      game.dispatch({ type: 'start' });
      game.dispatch({ type: 'answer', text: 'Arsenal' });

      expect(game.getSnapshot().session.round).toMatchObject({
        phase: 'playing',
        found: ['england-0'],
        startedAt: at,
      });
    }

    for (const level of levels) {
      game.dispatch({ type: 'level', level });

      expect(game.getSnapshot().session.round.found).toEqual(['england-0']);
    }
  });

  test('completes each level once and caps pasted answers', () => {
    for (const level of levels) {
      const f = fixture();
      const game = f.create();
      game.dispatch({ type: 'level', level });
      game.dispatch({ type: 'start' });
      game.dispatch({
        type: 'answer',
        text: clubs
          .slice(0, level + 3)
          .map((club) => club.name)
          .join(', '),
      });

      expect(game.getSnapshot().session.round).toMatchObject({ phase: 'complete', elapsed: 0 });
      expect(game.getSnapshot().session.round.found).toHaveLength(level);

      game.dispatch({ type: 'answer', text: 'Flamengo' });

      expect(game.getSnapshot().session.round.found).toHaveLength(level);
    }
  });

  test('rejects malformed, duplicate and unknown persisted answers without crashing', () => {
    const f = fixture();

    for (const value of [
      'not json',
      savedRound({ phase: 'playing', found: ['unknown'], startedAt: at }),
      savedRound({ phase: 'playing', found: ['england-0', 'england-0'], startedAt: at }),
    ]) {
      f.storage.setItem('nxc-v2-free-10', value);

      expect(f.create().getSnapshot().session.round).toEqual({ phase: 'idle', found: [] });
      expect(f.create().getSnapshot().storageAvailable).toBe(true);
    }
  });

  test('continues to play when browser storage is unavailable', () => {
    const storage: StoragePort = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    const game = createGameController({ storage, now: () => at });

    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'answer', text: 'Arsenal' });

    expect(game.getSnapshot().session.round.found).toEqual(['england-0']);
    expect(game.getSnapshot().storageAvailable).toBe(false);
  });

  test('starting again never resets elapsed time', () => {
    const f = fixture();
    const game = f.create();
    game.dispatch({ type: 'start' });
    const initial = game.getSnapshot().session.round;
    f.setTime(at + 20000);

    game.dispatch({ type: 'start' });

    expect(game.getSnapshot().session.round).toEqual(initial);
  });

  test('M7 (current behavior, product decision pending): the clock keeps running on another level', () => {
    const f = fixture();
    const game = f.create();
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'level', level: 50 });
    f.setTime(at + 60000);

    game.dispatch({ type: 'level', level: 10 });

    expect(elapsedSeconds(game.getSnapshot().session, at + 60000)).toBe(60);
  });

  test('shares the progress line as manual text when no browser is connected', async () => {
    const f = fixture();
    const game = f.create();
    game.dispatch({ type: 'start' });
    game.dispatch({ type: 'answer', text: 'Arsenal' });
    f.setTime(at + 65000);

    const outcome = await game.shareResult('en');

    expect(outcome).toEqual({
      kind: 'manual',
      text: expect.stringContaining('🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜ 1/10 · 01:05'),
    });
  });
});

describe('share title in Arabic', () => {
  test('uses the Arabic free time title', async () => {
    const game = fixture().create();
    game.dispatch({ type: 'start' });

    const outcome = await game.shareResult('ar');

    expect(outcome).toEqual({ kind: 'manual', text: expect.stringContaining('وقت حر') });
  });
});

describe('sessions changed by another tab', () => {
  test('H2: A visits 50 then 10, B saves 3 clubs on 50, A switches to 50 and sees them; Start keeps them', () => {
    const f = fixture();
    const tabA = connectedTab(f.create);
    tabA.dispatch({ type: 'level', level: 50 });
    tabA.dispatch({ type: 'level', level: 10 });

    const tabB = f.create();
    tabB.dispatch({ type: 'level', level: 50 });
    tabB.dispatch({ type: 'start' });
    tabB.dispatch({ type: 'answer', text: 'Arsenal, Chelsea, Liverpool' });
    announce(f.storage, 'nxc-v2-free-50');

    tabA.dispatch({ type: 'level', level: 50 });

    expect(tabA.getSnapshot().session.round.found).toHaveLength(3);

    tabA.dispatch({ type: 'start' });

    expect(tabA.getSnapshot().session.round.found).toHaveLength(3);
    expect(f.create().getSnapshot().session.round.found).toHaveLength(3);
  });

  test('a valid save on the visible level replaces the view', () => {
    const f = fixture();
    const tabA = connectedTab(f.create);
    const tabB = f.create();
    tabB.dispatch({ type: 'start' });
    tabB.dispatch({ type: 'answer', text: 'Arsenal' });

    announce(f.storage, 'nxc-v2-free-10');

    expect(tabA.getSnapshot().session.round.found).toEqual(['england-0']);
  });

  test('M4: garbage, future-schema or unknown-club values neither replace the view nor get saved over', () => {
    const f = fixture();
    const tabA = connectedTab(f.create);
    tabA.dispatch({ type: 'start' });
    tabA.dispatch({ type: 'answer', text: 'Arsenal' });
    const playing = tabA.getSnapshot().session;

    for (const value of [
      'not json',
      JSON.stringify({ version: 3, everything: 'new' }),
      savedRound({ phase: 'playing', found: ['unknown'], startedAt: at }),
    ]) {
      f.storage.setItem('nxc-v2-free-10', value);
      announce(f.storage, 'nxc-v2-free-10');

      expect(tabA.getSnapshot().session).toEqual(playing);

      tabA.dispatch({ type: 'level', level: 50 });
      tabA.dispatch({ type: 'level', level: 10 });

      expect(f.storage.getItem('nxc-v2-free-10')).toBe(value);
      expect(tabA.getSnapshot().session).toEqual(playing);
    }
  });

  test('ignores keys that are not session keys and removed keys', () => {
    const f = fixture();
    const tabA = connectedTab(f.create);
    tabA.dispatch({ type: 'start' });
    const playing = tabA.getSnapshot().session;

    announce(f.storage, 'nxc-v2-daily-2026-10-14-10', savedRound({ phase: 'idle', found: [] }));
    announce(f.storage, 'nxc-v2-free-10', null);

    expect(tabA.getSnapshot().session).toEqual(playing);
  });
});

describe('restoring saved values', () => {
  test('M3: a start time in the future (clock moved back) is clamped to now, not discarded', () => {
    const f = fixture();
    f.storage.setItem(
      'nxc-v2-free-10',
      savedRound({ phase: 'playing', found: ['england-0'], startedAt: at + 60000 }),
    );
    const game = f.create();

    expect(game.getSnapshot().session.round).toEqual({
      phase: 'playing',
      found: ['england-0'],
      startedAt: at,
    });

    game.dispatch({ type: 'start' });

    expect(f.create().getSnapshot().session.round.found).toEqual(['england-0']);
  });

  test('L1: an implausible elapsed time (1e15 seconds) is rejected', () => {
    const f = fixture();
    f.storage.setItem(
      'nxc-v2-free-10',
      savedRound({ phase: 'complete', found: ['england-0'], elapsed: 1e15 }),
    );

    expect(f.create().getSnapshot().session.round).toEqual({ phase: 'idle', found: [] });
  });

  test('L1: a round started over 30 days ago restores as idle and stays saved until the player acts', () => {
    const f = fixture();
    const stale = savedRound({ phase: 'playing', found: ['england-0'], startedAt: at - 31 * day });
    f.storage.setItem('nxc-v2-free-10', stale);
    const game = f.create();

    expect(game.getSnapshot().session.round).toEqual({ phase: 'idle', found: [] });

    game.dispatch({ type: 'level', level: 50 });
    game.dispatch({ type: 'level', level: 10 });

    expect(f.storage.getItem('nxc-v2-free-10')).toBe(stale);

    game.dispatch({ type: 'start' });

    expect(f.storage.getItem('nxc-v2-free-10')).not.toBe(stale);
  });

  test('L1: a practice record whose category differs from its challenge is rejected unless random', () => {
    const f = fixture();
    f.storage.setItem('nxc-mode', JSON.stringify('practice'));
    const round = { phase: 'playing', found: ['england-0'], startedAt: at };
    f.storage.setItem(
      'nxc-v2-practice-10',
      savedRound(round, { category: 'spain', challengeId: 'england' }),
    );

    expect(f.create().getSnapshot().session).toMatchObject({
      category: 'world',
      round: { phase: 'idle', found: [] },
    });

    f.storage.setItem(
      'nxc-v2-practice-10',
      savedRound(round, { category: 'random', challengeId: 'england' }),
    );

    expect(f.create().getSnapshot().session).toMatchObject({
      category: 'random',
      challenge: { id: 'england' },
      round,
    });
  });
});

describe('migrating v1 practice saves', () => {
  function saveLegacy(storage: MemoryStorage, record: object) {
    storage.setItem('nxc-mode', JSON.stringify('practice'));
    storage.setItem('nxc-v1-practice-10', JSON.stringify({ version: 1, ...record }));
  }

  test('migrates an existing practice list without inventing historical elapsed time', () => {
    const f = fixture();
    saveLegacy(f.storage, {
      category: 'world',
      challengeId: 'world',
      round: { phase: 'playing', found: ['england-0'], deadline: null, remaining: 60 },
    });
    const game = f.create();

    expect(game.getSnapshot().session.round).toEqual({
      phase: 'playing',
      found: ['england-0'],
      startedAt: at,
    });

    f.setTime(at + 23000);

    expect(elapsedSeconds(f.create().getSnapshot().session, at + 23000)).toBe(23);

    game.dispatch({ type: 'answer', text: 'Barcelona' });

    expect(elapsedSeconds(f.create().getSnapshot().session, at + 23000)).toBe(23);
  });

  test('L2: a completed v1 round keeps its clubs; its unknown elapsed time is stored as 0', () => {
    const f = fixture();
    saveLegacy(f.storage, {
      category: 'england',
      challengeId: 'england',
      round: { phase: 'complete', found: ['england-0', 'england-1'] },
    });

    expect(f.create().getSnapshot().session).toMatchObject({
      category: 'england',
      challenge: { id: 'england' },
      round: { phase: 'complete', found: ['england-0', 'england-1'], elapsed: 0 },
    });
  });

  test('L2: a v1 idle record that lists clubs becomes idle on its own category, not the world', () => {
    const f = fixture();
    saveLegacy(f.storage, {
      category: 'england',
      challengeId: 'england',
      round: { phase: 'idle', found: ['england-0'] },
    });

    expect(f.create().getSnapshot().session).toMatchObject({
      category: 'england',
      challenge: { id: 'england' },
      round: { phase: 'idle', found: [] },
    });
  });
});
