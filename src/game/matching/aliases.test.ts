import { expect, test } from 'vitest';
import { ambiguousTerms, clubs } from '../../content/catalog';
import { clubsNamedExactly } from './aliases';
import { normalize } from './normalize';

const ambiguousKeys = ambiguousTerms.flatMap((entry) => entry.terms.map(normalize));

test('each shared name is listed once', () => {
  const repeated = ambiguousKeys.filter((key, index) => ambiguousKeys.indexOf(key) !== index);

  expect(repeated).toEqual([]);
});

test('no club alias is hidden by a shared name, only official names can be', () => {
  const ambiguous = new Set(ambiguousKeys);
  const hiddenAliases = clubs.flatMap((club) =>
    club.aliases
      .filter((alias) => ambiguous.has(normalize(alias)))
      .map((alias) => `${club.id}: ${alias}`),
  );

  expect(hiddenAliases).toEqual([]);
});

test('a shared name returns all its candidates even when it is an official name', () => {
  const names = clubsNamedExactly('al nasr')?.map((club) => club.name);

  expect(names).toEqual(['Al Nassr', 'Al Nasr Dubai']);
});
