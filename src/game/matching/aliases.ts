import { ambiguousTerms, type Club, clubById, clubs } from '../../content/catalog';
import { normalize } from './normalize';

/** One spelling of a club name, split into words for typo matching. */
export type IndexedAlias = Readonly<{ words: readonly string[]; clubs: readonly Club[] }>;

function namesOf(club: Club) {
  return [club.name, club.arabic, ...club.aliases];
}

function buildAliasIndex() {
  const index = new Map<string, Club[]>();

  for (const club of clubs) {
    for (const name of namesOf(club)) {
      const key = normalize(name);
      const matches = index.get(key) ?? [];

      if (!matches.includes(club)) {
        matches.push(club);
      }

      index.set(key, matches);
    }
  }

  return index;
}

function buildAmbiguityIndex() {
  const index = new Map<string, Club[]>();

  for (const { terms, candidates } of ambiguousTerms) {
    const candidateClubs = candidates.flatMap((id) => clubById.get(id) ?? []);

    for (const term of terms) {
      index.set(normalize(term), candidateClubs);
    }
  }

  return index;
}

function groupByWordCount(index: ReadonlyMap<string, readonly Club[]>) {
  const groups = new Map<number, IndexedAlias[]>();

  for (const [key, matches] of index) {
    const words = key.split(' ');
    const group = groups.get(words.length) ?? [];
    group.push({ words, clubs: matches });
    groups.set(words.length, group);
  }

  return groups;
}

/** Normalized name → every club that uses it. */
const clubsByAlias: ReadonlyMap<string, readonly Club[]> = buildAliasIndex();

/** Normalized shared name → the catalog clubs it could mean. */
const clubsByAmbiguousTerm: ReadonlyMap<string, readonly Club[]> = buildAmbiguityIndex();

/** Every known name. A shared name replaces an alias it collides with, even a canonical name. */
const clubsByName: ReadonlyMap<string, readonly Club[]> = new Map([
  ...clubsByAlias,
  ...clubsByAmbiguousTerm,
]);

const namesByWordCount = groupByWordCount(clubsByName);

/** Every word used in a club name. A word from this set is a real name, never a typo. */
const catalogWords: ReadonlySet<string> = new Set(
  [...clubsByName.keys()].flatMap((key) => key.split(' ')),
);

/**
 * The clubs a normalized key names exactly, or `null` if it names none. A shared name returns
 * all its candidates, even when one of them also uses it as an alias.
 */
export function clubsNamedExactly(key: string): readonly Club[] | null {
  return clubsByName.get(key) ?? null;
}

/** Every known name with this many words, for typo matching. */
export function namesWithWordCount(count: number): readonly IndexedAlias[] {
  return namesByWordCount.get(count) ?? [];
}

export function isCatalogWord(word: string) {
  return catalogWords.has(word);
}
