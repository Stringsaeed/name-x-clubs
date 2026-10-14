import { expect, test } from 'vitest';
import { allowedEdits, clubsNamedApproximately, editDistance } from './fuzzy';
import { normalize } from './normalize';

function approximateNames(input: string) {
  return clubsNamedApproximately(normalize(input)).map((club) => club.name);
}

test('editDistance counts a missing, extra, wrong or swapped letter as one edit', () => {
  expect(editDistance('arsenal', 'arsenal')).toBe(0);
  expect(editDistance('arsenl', 'arsenal')).toBe(1);
  expect(editDistance('arsenall', 'arsenal')).toBe(1);
  expect(editDistance('arsenel', 'arsenal')).toBe(1);
  expect(editDistance('arsneal', 'arsenal')).toBe(1);
  expect(editDistance('', 'abc')).toBe(3);
  expect(editDistance('juventude', 'juventus')).toBe(2);
});

test('two edits are allowed only from 10 characters', () => {
  expect(allowedEdits(4)).toBe(0);
  expect(allowedEdits(5)).toBe(1);
  expect(allowedEdits(9)).toBe(1);
  expect(allowedEdits(10)).toBe(2);
});

test('genuine typos still find their club', () => {
  expect(approximateNames('Barcelonna')).toEqual(['Barcelona', 'Barcelona S.C.']);
  expect(approximateNames('Chelsae')).toEqual(['Chelsea']);
  expect(approximateNames('Mancester United')).toEqual(['Manchester United']);
  expect(approximateNames('manchster united')).toEqual(['Manchester United']);
  expect(approximateNames('arsenl')).toEqual(['Arsenal']);
  expect(approximateNames('Arsneal')).toEqual(['Arsenal']);
  expect(approximateNames('Tottenham Hotspru')).toEqual(['Tottenham Hotspur']);
});

test('a typo of a name two clubs share finds both of them', () => {
  expect(approximateNames('Liverpol')).toEqual(['Liverpool', 'Liverpool']);
});

for (const input of ['Bayer', 'Bayer Munich', 'Angers', 'Union Gent', 'الهلال الليبي']) {
  test(`"${input}" is not corrected to a different club (H3)`, () => {
    expect(approximateNames(input)).toEqual([]);
  });
}
