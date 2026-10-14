import { describe, expect, test } from 'vitest';
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
    game.dispatch({ type: 'tick' });
    expect(game.getSnapshot().session.round.phase).toBe('playing');
    const restored = f.create();
    expect(elapsedSeconds(restored.getSnapshot().session, at + 3615000)).toBe(3615);
    restored.dispatch({ type: 'finish' });
    f.setTime(at + 7200000);
    expect(elapsedSeconds(f.create().getSnapshot().session, at + 7200000)).toBe(3615);
    restored.dispatch({ type: 'restart' });
    expect(restored.getSnapshot().session.round).toEqual({ phase: 'idle', found: [] });
  });
  test('migrates an existing practice list without inventing historical elapsed time', () => {
    const f = fixture();
    f.storage.setItem('nxc-mode', JSON.stringify('practice'));
    f.storage.setItem(
      'nxc-v1-practice-10',
      JSON.stringify({
        version: 1,
        category: 'world',
        challengeId: 'world',
        round: { phase: 'playing', found: ['england-0'], deadline: null, remaining: 60 },
      }),
    );
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
          .map((c) => c.name)
          .join(', '),
      });
      expect(game.getSnapshot().session.round).toMatchObject({
        phase: 'complete',
        elapsed: 0,
      });
      expect(game.getSnapshot().session.round.found).toHaveLength(level);
      game.dispatch({ type: 'answer', text: 'Flamengo' });
      expect(game.getSnapshot().session.round.found).toHaveLength(level);
    }
  });
  test('rejects malformed, duplicate and unknown persisted answers without crashing', () => {
    const f = fixture();
    for (const value of [
      'not json',
      JSON.stringify({
        version: 2,
        category: 'world',
        challengeId: 'world',
        round: { phase: 'playing', found: ['unknown'], startedAt: at },
      }),
      JSON.stringify({
        version: 2,
        category: 'world',
        challengeId: 'world',
        round: { phase: 'playing', found: ['england-0', 'england-0'], startedAt: at },
      }),
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
});
