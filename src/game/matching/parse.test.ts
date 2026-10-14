import { expect, test } from 'vitest';
import type { Scope } from '../model';
import { MAX_ANSWERS_PER_SUBMIT, parseAnswers } from './parse';
import type { ParsedAnswer } from './types';

function country(name: string): { scope: Scope } {
  return { scope: { kind: 'country', country: name } };
}

function describe(answers: readonly ParsedAnswer[]) {
  return answers.map((answer) => {
    if (answer.kind === 'match' || answer.kind === 'wrong-category') {
      return `${answer.kind}: ${answer.club.name}`;
    }

    return `${answer.kind}: ${answer.input}`;
  });
}

for (const [input, expected] of [
  ['Real Mallorca', 'match: Mallorca'],
  ['Sporting Braga', 'match: Braga'],
  ['Racing Strasbourg', 'match: Strasbourg'],
  ['Real Valladolid', 'unknown: Real Valladolid'],
  ['Arsenal de Sarandi', 'unknown: Arsenal de Sarandi'],
  ['Atletico Nacional', 'unknown: Atletico Nacional'],
  ['الوحدة السعودي', 'unknown: الوحدة السعودي'],
  ['الهلال السوداني', 'unknown: الهلال السوداني'],
] as const) {
  test(`"${input}" is one answer, not split into other clubs (H1)`, () => {
    expect(describe(parseAnswers(input))).toEqual([expected]);
  });
}

test('club names typed without commas are still a list', () => {
  expect(describe(parseAnswers('Arsenal Chelsea Liverpool'))).toEqual([
    'match: Arsenal',
    'match: Chelsea',
    'match: Liverpool',
  ]);
  expect(describe(parseAnswers('Arsenal and Chelsea'))).toEqual([
    'match: Arsenal',
    'match: Chelsea',
  ]);
  expect(describe(parseAnswers('برشلونة وريال مدريد'))).toEqual([
    'match: Barcelona',
    'match: Real Madrid',
  ]);
  expect(describe(parseAnswers('Arsenal Chelsea Juventus', country('england')))).toEqual([
    'match: Arsenal',
    'match: Chelsea',
    'wrong-category: Juventus',
  ]);
});

test('a shared name inside a run of names counts only when the round narrows it', () => {
  expect(describe(parseAnswers('juve inter ac milan', country('italy')))).toEqual([
    'match: Juventus',
    'match: Inter Milan',
    'match: AC Milan',
  ]);
  expect(describe(parseAnswers('juve inter ac milan'))).toEqual(['unknown: juve inter ac milan']);
});

test('emoji-only and dash-only answers are dropped (L3)', () => {
  expect(describe(parseAnswers('🙂, ---, Arsenal, - , •'))).toEqual(['match: Arsenal']);
  expect(parseAnswers('🙂🔥')).toEqual([]);
});

test('"&" joins names like "and" does', () => {
  expect(describe(parseAnswers('Arsenal & Chelsea'))).toEqual(['match: Arsenal', 'match: Chelsea']);
  expect(describe(parseAnswers('Brighton & Hove Albion'))).toEqual([
    'match: Brighton & Hove Albion',
  ]);
});

test(`answers beyond ${MAX_ANSWERS_PER_SUBMIT} in one paste are ignored (M5)`, () => {
  const text = Array.from({ length: MAX_ANSWERS_PER_SUBMIT + 50 }, () => 'Arsenal').join(', ');

  expect(parseAnswers(text)).toHaveLength(MAX_ANSWERS_PER_SUBMIT);
});

function junkPaste(word: (index: number) => string) {
  const parts = Array.from({ length: 2000 }, (_, index) => word(index));

  return parts.join(', ').slice(0, 12_000);
}

function letter(index: number) {
  return String.fromCharCode(97 + (index % 26));
}

const junkPastes = {
  'ten-letter junk words': junkPaste((index) => `qwertyuio${letter(index)}`),
  'near misses of club names': junkPaste((index) => `manchestr unitex${letter(index)}`),
  'one line of junk words': junkPaste((index) => `zx${letter(index)}qv`).replaceAll(',', ''),
};

for (const [label, text] of Object.entries(junkPastes)) {
  test(`a 12k-character paste of ${label} parses in under 150 ms (M5)`, () => {
    parseAnswers(text);

    const started = performance.now();
    parseAnswers(text);
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(150);
  });
}
