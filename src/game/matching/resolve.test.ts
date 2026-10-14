import { expect, test } from 'vitest';
import type { Scope } from '../model';
import { resolveClub } from './resolve';
import type { Resolution } from './types';

function country(name: string): { scope: Scope } {
  return { scope: { kind: 'country', country: name } };
}

function describe(resolution: Resolution) {
  if (resolution.kind === 'match' || resolution.kind === 'wrong-category') {
    return `${resolution.kind}: ${resolution.club.name}`;
  }

  return resolution.kind;
}

const sharedNames = [
  'Real',
  'Inter',
  'Atletico',
  'Madrid',
  'Manchester',
  'United',
  'City',
  'Sheffield',
  'Borussia',
  'Los Angeles',
  'New York',
  'Al Ahli',
  'Al Ittihad',
  'Al Nasr',
  'الاتحاد',
  'النصر',
  'الأهلي',
  'ريال',
  'انتر',
];

const distinctiveSpellings: readonly (readonly [string, string])[] = [
  ['Al Ahly', 'Al Ahly'],
  ['Al Nassr', 'Al Nassr'],
];

for (const [input, club] of distinctiveSpellings) {
  test(`the distinctive English spelling "${input}" picks ${club} worldwide`, () => {
    expect(describe(resolveClub(input))).toBe(`match: ${club}`);
  });
}

for (const input of sharedNames) {
  test(`"${input}" asks for clarification worldwide instead of picking one club (M1, M2)`, () => {
    expect(describe(resolveClub(input))).toBe('ambiguous');
  });
}

test('English and Arabic shared names agree (M2)', () => {
  const pairs = [
    ['Al Ittihad', 'الاتحاد'],
    ['Al Nasr', 'النصر'],
    ['Al Ahli', 'الأهلي'],
    ['Real', 'ريال'],
    ['Inter', 'انتر'],
  ] as const;

  for (const [english, arabic] of pairs) {
    for (const scope of [undefined, country('saudi'), country('egypt'), country('uae')]) {
      expect(describe(resolveClub(english, scope)), english).toBe(
        describe(resolveClub(arabic, scope)),
      );
    }
  }
});

test('the round narrows a shared name to its only candidate in scope (M1)', () => {
  expect(describe(resolveClub('Inter', country('italy')))).toBe('match: Inter Milan');
  expect(describe(resolveClub('Inter', country('brazil')))).toBe('match: Internacional');
  expect(describe(resolveClub('Inter', country('usa')))).toBe('match: Inter Miami');
  expect(describe(resolveClub('Al Ittihad', country('egypt')))).toBe(
    'match: Al Ittihad Alexandria',
  );
  expect(describe(resolveClub('Al Ittihad', country('saudi')))).toBe('match: Al Ittihad');
  expect(describe(resolveClub('Al Nassr', country('saudi')))).toBe('match: Al Nassr');
  expect(describe(resolveClub('Atletico', country('brazil')))).toBe('match: Atlético Mineiro');
  expect(describe(resolveClub('Sheffield', country('england')))).toBe('ambiguous');
  expect(describe(resolveClub('Real', country('spain')))).toBe('ambiguous');
});

test('qualified forms of shared names name one club', () => {
  expect(describe(resolveClub('Al Ahly Egypt'))).toBe('match: Al Ahly');
  expect(describe(resolveClub('Al Ahli Jeddah'))).toBe('match: Al Ahli Saudi');
  expect(describe(resolveClub('Al Nasr Dubai'))).toBe('match: Al Nasr Dubai');
  expect(describe(resolveClub('Al Ittihad Jeddah'))).toBe('match: Al Ittihad');
  expect(describe(resolveClub('الأهلي المصري'))).toBe('match: Al Ahly');
  expect(describe(resolveClub('Real Madrid'))).toBe('match: Real Madrid');
  expect(describe(resolveClub('Inter Milan'))).toBe('match: Inter Milan');
});

test('wrong-scope "النصر" in England is the wrong category, not ambiguous (L3)', () => {
  expect(describe(resolveClub('النصر', country('england')))).toBe('wrong-category: Al Nassr');
  expect(describe(resolveClub('Inter', country('england')))).toBe('wrong-category: Inter Milan');
});

test('"Arsenal123" matches like "123Arsenal" (L3)', () => {
  expect(describe(resolveClub('Arsenal123'))).toBe('match: Arsenal');
  expect(describe(resolveClub('123Arsenal'))).toBe('match: Arsenal');
});

test('official names with FC or a number still match exactly', () => {
  expect(describe(resolveClub('Los Angeles FC'))).toBe('match: Los Angeles FC');
  expect(describe(resolveClub('Schalke 04'))).toBe('match: Schalke 04');
  expect(describe(resolveClub('Como 1907'))).toBe('match: Como');
});

for (const [input, expected] of [
  ['Bayer', 'unknown'],
  ['Bayer Munich', 'unknown'],
  ['Angers', 'unknown'],
  ['Randers', 'unknown'],
  ['Juventude', 'unknown'],
  ['الاهلي القطري', 'unknown'],
  ['Barcelonna', 'match: Barcelona'],
  ['Liverpol', 'match: Liverpool'],
  ['Mancester United', 'match: Manchester United'],
] as const) {
  test(`fuzzy matching: "${input}" → ${expected} (H3)`, () => {
    expect(describe(resolveClub(input))).toBe(expected);
  });
}
