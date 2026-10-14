import { describe, expect, it } from '@effect/vitest';
import { nicknameFor } from './Nicknames';
import { adjectives, nouns } from './words';

const playerId = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

describe('generated nicknames', () => {
  it('are the same every time for the same player id', () => {
    expect(nicknameFor(playerId)).toEqual(nicknameFor(playerId));
  });

  it('differ between players', () => {
    const names = new Set(
      Array.from({ length: 200 }, (_, index) => nicknameFor(`player-${index}`).en),
    );

    expect(names.size).toBe(200);
  });

  it('come in English and Arabic with the same words and tag', () => {
    const { en, ar } = nicknameFor(playerId);
    const [adjective, noun, enTag] = en.split(' ');
    const english = { adjective, noun };
    const pair = {
      adjective: adjectives.find((word) => word.en === english.adjective),
      noun: nouns.find((word) => word.en === english.noun),
    };

    expect(en).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ #[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(ar).toBe(`${pair.noun?.ar} ${pair.adjective?.ar} ${enTag}`);
    expect(ar).toMatch(/[؀-ۿ]/);
  });

  it('draw from aligned lists of about 40 words each', () => {
    expect(adjectives.length).toBeGreaterThanOrEqual(40);
    expect(nouns.length).toBeGreaterThanOrEqual(40);

    for (const word of [...adjectives, ...nouns]) {
      expect(word.en).toMatch(/^[A-Z][a-z]+$/);
      expect(word.ar).toMatch(/^[؀-ۿ ]+$/);
    }

    expect(new Set(adjectives.map((word) => word.en)).size).toBe(adjectives.length);
    expect(new Set(nouns.map((word) => word.en)).size).toBe(nouns.length);
  });
});
