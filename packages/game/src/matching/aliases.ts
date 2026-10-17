import { ambiguousTerms, type Club, clubById, clubs } from '../content/catalog';
import { normalize, stripClubNoise } from './normalize';

/** One spelling of a club name, split into words for typo matching. */
export type IndexedAlias = Readonly<{ words: readonly string[]; clubs: readonly Club[] }>;

function namesOf(club: Club) {
  return [club.name, club.arabic, ...club.aliases];
}

function addClub(index: Map<string, Club[]>, key: string, club: Club) {
  if (!key) {
    return;
  }

  const matches = index.get(key) ?? [];

  if (!matches.includes(club)) {
    matches.push(club);
  }

  index.set(key, matches);
}

function buildAliasIndex() {
  const index = new Map<string, Club[]>();

  for (const club of clubs) {
    for (const name of namesOf(club)) {
      addClub(index, normalize(name), club);
    }
  }

  // "Barcelona S.C." also answers to "Barcelona" when another club is exactly that shorter name.
  for (const club of clubs) {
    for (const name of namesOf(club)) {
      const key = normalize(name);
      const shorter = stripClubNoise(key);

      if (shorter !== key && index.has(shorter)) {
        addClub(index, shorter, club);
      }
    }
  }

  return index;
}

/**
 * A club whose own name or Arabic name is a shared term always counts as one of its candidates,
 * even when the catalog's candidate list was written without it.
 */
const curatedAmbiguousKeys = new Set(
  ambiguousTerms
    .filter((group) => group.curated)
    .flatMap((group) => group.terms.map((term) => normalize(term))),
);

/** A hand-reviewed shared name, such as الأهلي. Popularity never picks a winner for these. */
export function isCuratedAmbiguousTerm(key: string) {
  return curatedAmbiguousKeys.has(key);
}

function buildAmbiguityIndex(aliasIndex: ReadonlyMap<string, readonly Club[]>) {
  const index = new Map<string, Club[]>();

  for (const { terms, candidates } of ambiguousTerms) {
    const listedClubs = candidates.flatMap((id) => clubById.get(id) ?? []);

    for (const term of terms) {
      const key = normalize(term);
      const namedClubs = (aliasIndex.get(key) ?? []).filter(
        (club) => normalize(club.name) === key || normalize(club.arabic) === key,
      );

      index.set(key, [...new Set([...listedClubs, ...namedClubs])]);
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

type NameIndex = Readonly<{
  /** Every known name. A shared name replaces an alias it collides with, even a canonical name. */
  clubsByName: ReadonlyMap<string, readonly Club[]>;
  namesByWordCount: ReadonlyMap<number, readonly IndexedAlias[]>;
  /** Every word used in a club name. A word from this set is a real name, never a typo. */
  catalogWords: ReadonlySet<string>;
}>;

function buildNameIndex(): NameIndex {
  const clubsByAlias = buildAliasIndex();
  const clubsByAmbiguousTerm = buildAmbiguityIndex(clubsByAlias);
  const clubsByName = new Map([...clubsByAlias, ...clubsByAmbiguousTerm]);

  return {
    clubsByName,
    namesByWordCount: groupByWordCount(clubsByName),
    catalogWords: new Set([...clubsByName.keys()].flatMap((key) => key.split(' '))),
  };
}

let nameIndex: NameIndex | undefined;

/**
 * Building the index normalizes every name in the catalog, so it waits for the first answer
 * instead of slowing the page load.
 */
function getNameIndex(): NameIndex {
  nameIndex ??= buildNameIndex();

  return nameIndex;
}

/**
 * The clubs a normalized key names exactly, or `null` if it names none. A shared name returns
 * all its candidates, even when one of them also uses it as an alias.
 */
export function clubsNamedExactly(key: string): readonly Club[] | null {
  return getNameIndex().clubsByName.get(key) ?? null;
}

/** Every known name with this many words, for typo matching. */
export function namesWithWordCount(count: number): readonly IndexedAlias[] {
  return getNameIndex().namesByWordCount.get(count) ?? [];
}

export function isCatalogWord(word: string) {
  return getNameIndex().catalogWords.has(word);
}
