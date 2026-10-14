import { describe, expect, test } from 'vitest';
import { clubs } from '../content/catalog';
import { createGameController, type StoragePort } from './controller';
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
  test('keeps existing daily v2 saves and the original deadline', () => {
    const f = fixture();
    f.storage.setItem(
      'nxc-v2-daily-2026-10-14-10',
      JSON.stringify({
        phase: 'playing',
        found: ['england-0'],
        deadline: at + 45000,
        remaining: 60,
      }),
    );
    const game = f.create();
    expect(game.getSnapshot().session.round).toEqual({
      phase: 'playing',
      found: ['england-0'],
      deadline: at + 45000,
    });
    f.setTime(at + 47000);
    game.dispatch({ type: 'tick' });
    expect(game.getSnapshot().session.round).toEqual({
      phase: 'complete',
      found: ['england-0'],
      remaining: 0,
    });
    game.dispatch({ type: 'start' });
    expect(game.getSnapshot().session.round.phase).toBe('complete');
  });
  test('expires an inactive daily save immediately on opening', () => {
    const f = fixture();
    f.storage.setItem(
      'nxc-v2-daily-2026-10-14-10',
      JSON.stringify({
        phase: 'playing',
        found: ['england-0'],
        deadline: at - 1000,
        remaining: 60,
      }),
    );
    expect(f.create().getSnapshot().session.round).toEqual({
      phase: 'complete',
      found: ['england-0'],
      remaining: 0,
    });
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
  test('maintains separate progress and time limits for every level', () => {
    const f = fixture();
    const game = f.create();
    for (const level of levels) {
      game.dispatch({ type: 'level', level });
      game.dispatch({ type: 'start' });
      game.dispatch({ type: 'answer', text: 'Arsenal' });
      expect(game.getSnapshot().session.round).toMatchObject({
        phase: 'playing',
        found: ['england-0'],
        deadline: at + level * 6000,
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
        remaining: level * 6,
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
      JSON.stringify({ phase: 'playing', found: ['unknown'], deadline: at + 60000, remaining: 60 }),
      JSON.stringify({
        phase: 'playing',
        found: ['england-0', 'england-0'],
        deadline: at + 60000,
        remaining: 60,
      }),
    ]) {
      f.storage.setItem('nxc-v2-daily-2026-10-14-10', value);
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
  test('changes daily questions at UTC midnight, not local midnight', () => {
    const f = fixture();
    const game = f.create();
    game.dispatch({ type: 'start' });
    f.setTime(Date.parse('2026-10-15T00:00:00Z'));
    game.dispatch({ type: 'tick' });
    expect(game.getSnapshot().session).toMatchObject({
      kind: 'daily',
      day: '2026-10-15',
      round: { phase: 'idle', found: [] },
    });
  });
  test('starting again never extends an active deadline', () => {
    const f = fixture();
    const game = f.create();
    game.dispatch({ type: 'start' });
    const initial = game.getSnapshot().session.round;
    f.setTime(at + 20000);
    game.dispatch({ type: 'start' });
    expect(game.getSnapshot().session.round).toEqual(initial);
  });
});
