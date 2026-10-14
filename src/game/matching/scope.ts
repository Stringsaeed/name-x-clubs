import { type Club, type ClubId, clubs } from '../../content/catalog';
import type { Scope } from '../model';
import type { Resolution, ScopedChallenge } from './types';

type EligiblePool = Readonly<{ clubs: readonly Club[]; ids: ReadonlySet<ClubId> }>;

/** Scopes are few and fixed, so each pool is built once and reused for every answer. */
const poolCache = new Map<string, EligiblePool>();

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

function fitsScope(club: Club, scope: Scope) {
  switch (scope.kind) {
    case 'world':
      return true;
    case 'country':
      return club.country === scope.country;
    case 'region':
      return club.region === scope.region;
    case 'letter':
      return club.name.toLowerCase().startsWith(scope.letter);
    default: {
      const exhaustive: never = scope;
      return exhaustive;
    }
  }
}

function eligiblePool(scope: Scope): EligiblePool {
  const key = scopeKey(scope);
  const cached = poolCache.get(key);

  if (cached) {
    return cached;
  }

  const eligible = clubs.filter((club) => fitsScope(club, scope));
  const pool = { clubs: eligible, ids: new Set(eligible.map((club) => club.id)) };
  poolCache.set(key, pool);

  return pool;
}

export function eligibleClubs({ scope }: ScopedChallenge): readonly Club[] {
  return eligiblePool(scope).clubs;
}

/**
 * Picks the club a name means in this round. The round narrows the candidates first, so "Inter"
 * is Inter Milan in Italy but needs clarifying worldwide. When none of the candidates fits the
 * round, the name is still a known club, just the wrong one here.
 */
export function chooseInScope(candidates: readonly Club[], { scope }: ScopedChallenge): Resolution {
  const { ids } = eligiblePool(scope);
  const inScope = candidates.filter((club) => ids.has(club.id));
  const [onlyMatch] = inScope;

  if (onlyMatch && inScope.length === 1) {
    return { kind: 'match', club: onlyMatch };
  }

  if (inScope.length > 1) {
    return { kind: 'ambiguous' };
  }

  const [outOfScope] = candidates;

  if (outOfScope) {
    return { kind: 'wrong-category', club: outOfScope };
  }

  return { kind: 'ambiguous' };
}
