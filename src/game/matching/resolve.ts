import type { Club } from '../../content/catalog';
import { clubsNamedExactly } from './aliases';
import { clubsNamedApproximately } from './fuzzy';
import { lookupKeys, normalize, stripClubNoise } from './normalize';
import { chooseInScope } from './scope';
import { type Resolution, type ScopedChallenge, worldChallenge } from './types';

/** The clubs a typed name spells exactly, trying each lookup key in turn, or `null`. */
function exactCandidates(value: string): readonly Club[] | null {
  for (const key of lookupKeys(value)) {
    const candidates = clubsNamedExactly(key);

    if (candidates) {
      return candidates;
    }
  }

  return null;
}

/** Resolves a name by exact spelling only. Typos are left to `resolveClub`. */
export function resolveExactly(
  value: string,
  challenge: ScopedChallenge = worldChallenge,
): Resolution {
  const candidates = exactCandidates(value);

  if (!candidates) {
    return { kind: 'unknown' };
  }

  return chooseInScope(candidates, challenge);
}

/** Resolves one typed club name, forgiving small typos in longer names. */
export function resolveClub(
  value: string,
  challenge: ScopedChallenge = worldChallenge,
): Resolution {
  const exact = resolveExactly(value, challenge);

  if (exact.kind !== 'unknown') {
    return exact;
  }

  const approximate = clubsNamedApproximately(stripClubNoise(normalize(value)));

  if (approximate.length === 0) {
    return { kind: 'unknown' };
  }

  return chooseInScope(approximate, challenge);
}
