import type { Club } from '../../content/catalog';
import { clubsNamedExactly } from './aliases';
import { clubsNamedApproximately } from './fuzzy';
import { lookupKeys, normalize, stripClubNoise } from './normalize';
import { chooseInScope } from './scope';
import { type Resolution, type ScopedChallenge, worldChallenge } from './types';

/** The clubs a typed name spells exactly, with the key that found them, or `null`. */
function exactHit(value: string): { key: string; candidates: readonly Club[] } | null {
  for (const key of lookupKeys(value)) {
    const candidates = clubsNamedExactly(key);

    if (candidates) {
      return { key, candidates };
    }
  }

  return null;
}

/** Resolves a name by exact spelling only. Typos are left to `resolveClub`. */
export function resolveExactly(
  value: string,
  challenge: ScopedChallenge = worldChallenge,
): Resolution {
  const hit = exactHit(value);

  if (!hit) {
    return { kind: 'unknown' };
  }

  return chooseInScope(hit.candidates, challenge, hit.key);
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

  const key = stripClubNoise(normalize(value));
  const approximate = clubsNamedApproximately(key);

  if (approximate.length === 0) {
    return { kind: 'unknown' };
  }

  return chooseInScope(approximate, challenge, key);
}
