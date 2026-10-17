import { expect, test } from 'vitest';
import { challengesForLevel } from '../game/engine';
import type { Challenge } from '../game/model';
import { getI18nFor } from '../i18n/instances';
import {
  categoryLabel,
  challengeLabel,
  clubCountNoun,
  regionLabel,
  sortChallengesForPicker,
  splitFocus,
} from './labels';

const worldChallenge = (target: 10 | 50 | 100): Challenge =>
  ({ id: `world-${target}`, target, scope: { kind: 'world' } }) as Challenge;

test('English club counts pluralise with Western digits', () => {
  const en = getI18nFor('en');

  expect(clubCountNoun(en, 1)).toBe('1 club');
  expect(clubCountNoun(en, 10)).toBe('10 clubs');
});

test('Arabic club counts follow CLDR plural categories and keep Western digits', () => {
  const ar = getI18nFor('ar');

  expect(clubCountNoun(ar, 10)).toBe('10 أندية');
  expect(clubCountNoun(ar, 50)).toBe('50 ناديًا');
  expect(clubCountNoun(ar, 100)).toBe('100 نادٍ');
});

test('challengeLabel renders plain text without the focus tag', () => {
  expect(challengeLabel(worldChallenge(10), 'en')).toBe('Name 10 clubs.');
  expect(challengeLabel(worldChallenge(10), 'ar')).toBe('اذكر 10 أندية.');
});

test('splitFocus separates the highlighted part of the sentence', () => {
  expect(splitFocus('Name 10 from <focus>Egypt.</focus>')).toEqual({
    before: 'Name 10 from ',
    focus: 'Egypt.',
    after: '',
  });
});

test('Oceania has its own region name in both languages', () => {
  expect(regionLabel(getI18nFor('en'), 'oceania')).toBe('Oceania');
  expect(regionLabel(getI18nFor('ar'), 'oceania')).toBe('أوقيانوسيا');
});

for (const language of ['en', 'ar'] as const) {
  test(`practice categories sort as World, regions, countries by ${language} name, then letters`, () => {
    const i18n = getI18nFor(language);
    const sorted = sortChallengesForPicker(challengesForLevel(10), language);
    const kinds = sorted.map((challenge) => challenge.scope.kind);
    const countryNames = sorted
      .filter((challenge) => challenge.scope.kind === 'country')
      .map((challenge) => categoryLabel(i18n, challenge));

    expect(kinds[0]).toBe('world');
    expect(kinds).toEqual([...kinds].sort((a, b) => kindRank(a) - kindRank(b)));
    expect(countryNames.length).toBeGreaterThan(40);
    expect(countryNames).toEqual([...countryNames].sort(new Intl.Collator(language).compare));
  });
}

function kindRank(kind: Challenge['scope']['kind']) {
  return ['world', 'region', 'country', 'letter'].indexOf(kind);
}
