import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { coreClubIds } from '../test/coreClubIds';
import {
  ambiguousTerms,
  catalogVersion,
  clubById,
  clubs,
  countries,
  regionSchema,
} from './catalog';

const ARABIC_LETTER = /\p{Script=Arabic}/u;

test('every club has an English and an Arabic name', () => {
  const missing = clubs.filter(
    (club) => club.name.trim() === '' || !ARABIC_LETTER.test(club.arabic),
  );

  expect(missing.map((club) => club.id)).toEqual([]);
});

test('club ids and Wikidata ids are unique', () => {
  expect(new Set(clubs.map((club) => club.id)).size).toBe(clubs.length);
  expect(new Set(clubs.map((club) => club.wikidata)).size).toBe(clubs.length);
});

test('every ambiguous candidate is a club in the catalog', () => {
  const unknown = ambiguousTerms.flatMap((entry) =>
    entry.candidates.filter((id) => !clubById.has(id)),
  );

  expect(unknown).toEqual([]);
});

test('the 200 core clubs keep their ids and order, because saved rounds store them', () => {
  expect(clubs.slice(0, coreClubIds.length).map((club) => club.id)).toEqual([...coreClubIds]);
  expect(coreClubIds).toHaveLength(200);
});

test('every club sits in the region of its country, and oceania has clubs', () => {
  const mismatched = clubs.filter((club) => countries[club.country]?.region !== club.region);

  expect(mismatched.map((club) => club.id)).toEqual([]);
  expect(clubs.some((club) => club.region === 'oceania')).toBe(true);
  expect(regionSchema.options).toContain('oceania');
});

test('the catalog is the 1,500-club Wikidata list with the countries it uses', () => {
  expect(clubs).toHaveLength(1500);
  expect(Object.keys(countries).length).toBeGreaterThanOrEqual(115);
  expect(clubs.every((club) => /^Q\d+$/.test(club.wikidata))).toBe(true);
});

test('catalogVersion changes whenever clubs.json does (run pnpm catalog:apply)', () => {
  const clubsFile = readFileSync(resolve('src/content/clubs.json'), 'utf8');
  const hash = createHash('sha256').update(clubsFile).digest('hex').slice(0, 8);

  expect(catalogVersion).toBe(`wd-${clubs.length}-${hash}`);
});
