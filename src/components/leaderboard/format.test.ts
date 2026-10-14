import { describe, expect, it } from 'vitest';
import { formatElapsed, formatRelative } from './format';

const now = Date.parse('2026-10-14T12:00:00.000Z');

function minutesAgo(minutes: number) {
  return new Date(now - minutes * 60_000).toISOString();
}

describe('formatElapsed', () => {
  it('formats mm:ss.t with tenths truncated', () => {
    expect(formatElapsed(72_400)).toBe('01:12.4');
    expect(formatElapsed(78_059)).toBe('01:18.0');
    expect(formatElapsed(0)).toBe('00:00.0');
  });

  it('lets minutes run past 59 for long rounds', () => {
    expect(formatElapsed((75 * 60 + 3) * 1000 + 200)).toBe('75:03.2');
  });
});

describe('formatRelative', () => {
  it('says "now" for a result that just landed', () => {
    expect(formatRelative(minutesAgo(0), now, 'en')).toBe('now');
  });

  it('uses the short English form for minutes, hours and days', () => {
    expect(formatRelative(minutesAgo(14), now, 'en')).toBe('14m ago');
    expect(formatRelative(minutesAgo(180), now, 'en')).toBe('3h ago');
    expect(formatRelative(minutesAgo(3 * 24 * 60), now, 'en')).toBe('3d ago');
  });

  it('is written in the page language', () => {
    const arabic = formatRelative(minutesAgo(14), now, 'ar');

    expect(arabic).not.toBe(formatRelative(minutesAgo(14), now, 'en'));
    expect(arabic).toMatch(/[\u0600-\u06FF]/);
  });
});
