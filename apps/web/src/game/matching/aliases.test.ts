import { expect, test } from 'vitest';
import { ambiguousTerms, clubs } from '../../content/catalog';
import { clubsNamedExactly } from './aliases';
import { normalize } from './normalize';

const ambiguousKeys = ambiguousTerms.flatMap((entry) => entry.terms.map(normalize));

test('each shared name is listed once', () => {
  const repeated = ambiguousKeys.filter((key, index) => ambiguousKeys.indexOf(key) !== index);

  expect(repeated).toEqual([]);
});

test('a club alias that is a shared name lists that club among its candidates', () => {
  const candidatesByTerm = new Map(
    ambiguousTerms.flatMap((entry) =>
      entry.terms.map((term) => [normalize(term), entry.candidates] as const),
    ),
  );
  const strandedAliases = clubs.flatMap((club) =>
    club.aliases
      .filter(
        (alias) =>
          !candidatesByTerm.get(normalize(alias))?.includes(club.id) &&
          candidatesByTerm.has(normalize(alias)),
      )
      .map((alias) => `${club.id}: ${alias}`),
  );

  expect(strandedAliases).toEqual([]);
});

test('a club named exactly like a shared term is a candidate of it, even if the list omits it', () => {
  const omanNasr = clubsNamedExactly(normalize('النصر'))?.map((club) => club.id);

  expect(omanNasr).toContain('wd-2829388');
});

test('a shared name returns all its candidates even when it is an official name', () => {
  const names = clubsNamedExactly('al nasr')?.map((club) => club.name);

  expect(names).toEqual(['Al Nassr', 'Al Nasr Dubai']);
});
