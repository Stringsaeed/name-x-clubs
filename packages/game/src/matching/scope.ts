import { type Club, type ClubId, clubs } from '../content/catalog';
import { startingLetters } from '../content/clubNames';
import type { Scope } from '../model';
import { isCuratedAmbiguousTerm } from './aliases';
import type { Resolution, ScopedChallenge } from './types';

/**
 * One club is the name worldwide when it has at least three times as many Wikipedia language
 * editions as the next club that shares the name. Curated groups never use this rule.
 */
const DOMINANCE_RATIO = 3;

type EligiblePool = Readonly<{ clubs: readonly Club[]; ids: ReadonlySet<ClubId> }>;

const EMPTY_POOL: EligiblePool = { clubs: [], ids: new Set() };

function scopeKey(scope: Scope) {
  switch (scope.kind) {
    case 'world':
      return 'world';
    case 'country':
      return `country:${scope.country}`;
    case 'region':
      return `region:${scope.region}`;
    case 'letter':
      return `letter:${scope.letter}`;
    default: {
      const exhaustive: never = scope;
      return exhaustive;
    }
  }
}

/** Every scope a club belongs to, so all pools can be filled in a single pass over the catalog. */
function scopeKeysOf(club: Club) {
  const letters = startingLetters(club.name).map((letter) => scopeKey({ kind: 'letter', letter }));

  return [
    scopeKey({ kind: 'world' }),
    scopeKey({ kind: 'country', country: club.country }),
    scopeKey({ kind: 'region', region: club.region }),
    ...letters,
  ];
}

function buildPools() {
  const clubsByScope = new Map<string, Club[]>();

  for (const club of clubs) {
    for (const key of scopeKeysOf(club)) {
      const scopeClubs = clubsByScope.get(key) ?? [];
      scopeClubs.push(club);
      clubsByScope.set(key, scopeClubs);
    }
  }

  return new Map(
    [...clubsByScope].map(([key, scopeClubs]) => [
      key,
      { clubs: scopeClubs, ids: new Set(scopeClubs.map((club) => club.id)) },
    ]),
  );
}

let pools: ReadonlyMap<string, EligiblePool> | undefined;

/** Scopes are few and fixed, so every pool is built once, on first use, and reused for each answer. */
function eligiblePool(scope: Scope): EligiblePool {
  pools ??= buildPools();

  return pools.get(scopeKey(scope)) ?? EMPTY_POOL;
}

export function eligibleClubs({ scope }: ScopedChallenge): readonly Club[] {
  return eligiblePool(scope).clubs;
}

/** The club players mean by a shared name, when one is far more widely covered than the rest. */
export function dominantClub(candidates: readonly Club[]): Club | undefined {
  const ranked = [...candidates].sort(
    (a, b) => b.sitelinks - a.sitelinks || a.id.localeCompare(b.id),
  );
  const [first, second] = ranked;

  if (!first || !second) {
    return first;
  }

  if (first.sitelinks > second.sitelinks && first.sitelinks >= DOMINANCE_RATIO * second.sitelinks) {
    return first;
  }

  return undefined;
}

/**
 * Picks the club a name means in this round. The round narrows the candidates first, so "Inter"
 * is Inter Milan in Italy and "Liverpool" is the Uruguayan club in Uruguay. Worldwide, a name
 * that one club dominates (Liverpool, Barcelona) means that club. A curated shared name still
 * asks. When none of the candidates fits the round, the name is a known club in the wrong place.
 */
export function chooseInScope(
  candidates: readonly Club[],
  { scope }: ScopedChallenge,
  key?: string,
): Resolution {
  const { ids } = eligiblePool(scope);
  const inScope = candidates.filter((club) => ids.has(club.id));
  const [onlyMatch] = inScope;

  if (onlyMatch && inScope.length === 1) {
    return { kind: 'match', club: onlyMatch };
  }

  if (inScope.length > 1) {
    const famous = key && isCuratedAmbiguousTerm(key) ? undefined : dominantClub(inScope);

    if (famous) {
      return { kind: 'match', club: famous };
    }

    return { kind: 'ambiguous' };
  }

  const [outOfScope] = candidates;

  if (outOfScope) {
    return { kind: 'wrong-category', club: outOfScope };
  }

  return { kind: 'ambiguous' };
}
