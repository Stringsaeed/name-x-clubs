import { describe, expect, it } from '@effect/vitest';
import { uniqueClubNames } from '../testing/clubNames';
import { batchFlags, paceVerdict } from './pace';
import { maxAcceptedPerEntry, replayEntries, replayEntry } from './replay';

const names = uniqueClubNames(12);

describe('pace policy', () => {
  it.each([
    ['t10', 4_999, 'impossible'],
    ['t10', 5_000, 'suspicious'],
    ['t10', 10_000, 'ok'],
    ['t50', 29_999, 'impossible'],
    ['t50', 59_999, 'suspicious'],
    ['t100', 59_999, 'impossible'],
    ['t100', 120_000, 'ok'],
  ] as const)('%s in %i ms is %s', (mode, elapsedMs, verdict) => {
    expect(paceVerdict(mode, elapsedMs, []).verdict).toBe(verdict);
  });

  it('turns any flag into suspicious, but never rescues an impossible time', () => {
    expect(paceVerdict('t10', 60_000, ['client-clock-ahead'])).toEqual({
      verdict: 'suspicious',
      flags: ['client-clock-ahead'],
    });
    expect(paceVerdict('t10', 1_000, []).verdict).toBe('impossible');
  });

  it('flags client times ahead of the server receive time beyond the tolerance', () => {
    expect(batchFlags({ receivedMs: 10_000, clientMs: [9_000, 15_000] })).toEqual([]);
    expect(batchFlags({ receivedMs: 10_000, clientMs: [15_001] })).toEqual(['client-clock-ahead']);
  });
});

describe('ranked replay', () => {
  it(`credits at most ${maxAcceptedPerEntry} new clubs per entry`, () => {
    const outcome = replayEntry([], names.slice(0, 5).join(', '), 10);

    expect(outcome.accepted).toHaveLength(maxAcceptedPerEntry);
    expect(outcome.events.filter((event) => event.kind === 'over-limit')).toHaveLength(2);
  });

  it('does not count a duplicate toward the cap', () => {
    const [first = ''] = names;
    const found = replayEntry([], first, 10).accepted;
    const outcome = replayEntry(found, [first, ...names.slice(1, 4)].join(', '), 10);

    expect(outcome.accepted).toHaveLength(3);
    expect(outcome.events[0]?.kind).toBe('duplicate');
  });

  it('stops scoring at the entry that reaches the target', () => {
    const result = replayEntries([], names.slice(0, 12), 10);

    expect(result.found).toHaveLength(10);
    expect(result.completedAt).toBe(9);
    expect(result.outcomes[10]).toEqual({ accepted: [], events: [] });
  });
});
