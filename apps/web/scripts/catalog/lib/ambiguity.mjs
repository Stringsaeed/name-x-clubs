// Shared-name detection. A normalized term held by more than one club never resolves on its own:
// it becomes an ambiguity group listing its candidates. Wikidata-derived aliases that collide
// with a curated/real name are simply dropped.
import { normalize } from './clean.mjs';

const LEVEL_RANK = { name: 2, curated: 1, wd: 0 };

/** Term -> Map(club -> strongest level at which the club holds it). */
function indexHolders(clubs) {
  const holders = new Map();
  const hold = (term, club, level) => {
    const key = normalize(term);
    const byClub = holders.get(key) ?? new Map();

    if ((LEVEL_RANK[byClub.get(club)] ?? -1) < LEVEL_RANK[level]) {
      byClub.set(club, level);
    }

    holders.set(key, byClub);
  };

  for (const club of clubs) {
    hold(club.name, club, 'name');
    hold(club.arabic, club, 'name');

    for (const alias of club.aliases) {
      hold(alias.text, club, alias.level);
    }
  }

  return holders;
}

/** Removes `term` from a club's alias list; returns whether anything was removed. */
function dropAlias(club, term) {
  const before = club.aliases.length;
  club.aliases = club.aliases.filter((alias) => normalize(alias.text) !== term);

  return club.aliases.length !== before;
}

function applyPins(holders, pinned, stats) {
  for (const [term, ownerQid] of Object.entries(pinned)) {
    for (const [club, level] of holders.get(normalize(term)) ?? []) {
      if (club.qid === ownerQid) {
        continue;
      }

      if (level === 'name') {
        stats.pinnedNameConflicts.push(`${term}: ${club.id} ${club.name}`);
      } else if (dropAlias(club, normalize(term))) {
        stats.pinnedRemoved++;
      }
    }
  }
}

function resolveTerm(term, byClub, stats) {
  const strong = [...byClub].filter(([, level]) => level !== 'wd').map(([club]) => club);
  const weak = [...byClub].filter(([, level]) => level === 'wd').map(([club]) => club);

  if (strong.length > 0) {
    for (const club of weak) {
      stats.droppedAsCollision += dropAlias(club, term) ? 1 : 0;
    }

    return strong.length > 1 ? strong : null;
  }

  if (weak.length < 2) {
    return null;
  }

  for (const club of weak) {
    stats.droppedAsShared += dropAlias(club, term) ? 1 : 0;
  }

  return weak;
}

const byLinks = (a, b) => b.links - a.links || a.id.localeCompare(b.id);

/** Same rule as `dominantClub` in src/game/matching/scope.ts: 3× the next club's Wikipedia editions. */
const DOMINANCE_RATIO = 3;

function isDominant(candidates) {
  const ranked = [...candidates].sort(byLinks);
  const [first, second] = ranked;

  if (!first || !second) {
    return false;
  }

  return first.links > second.links && first.links >= DOMINANCE_RATIO * second.links;
}

/**
 * Mutates `clubs` (drops colliding Wikidata aliases) and returns Map(term -> candidate clubs)
 * for every term that more than one club legitimately holds.
 */
export function detectSharedTerms(clubs, pinned) {
  const stats = {
    pinnedRemoved: 0,
    pinnedNameConflicts: [],
    droppedAsCollision: 0,
    droppedAsShared: 0,
  };
  const holders = indexHolders(clubs);
  applyPins(holders, pinned, stats);
  const shared = new Map();

  for (const [term, byClub] of indexHolders(clubs)) {
    if (Object.hasOwn(pinned, term)) {
      continue;
    }

    const candidates = resolveTerm(term, byClub, stats);

    if (candidates) {
      shared.set(term, candidates.sort(byLinks));
    }
  }

  return { shared, stats };
}

/**
 * Merges auto-detected terms into the curated groups. Curated terms and candidates are kept as
 * reviewed; auto candidates are only appended to a curated group when they hold one of its terms.
 */
export function mergeAmbiguity({ curated, shared, pinned }) {
  const groups = curated.map((group) => ({
    terms: [...group.terms],
    candidates: [...group.candidates],
    curated: true,
  }));
  const curatedTerms = new Map();

  for (const group of groups) {
    for (const term of group.terms) {
      curatedTerms.set(normalize(term), group);
    }
  }

  const autoByCandidates = new Map();

  for (const [term, candidates] of shared) {
    const ids = candidates.map((club) => club.id);
    const group = curatedTerms.get(term);

    if (group) {
      group.candidates.push(...ids.filter((id) => !group.candidates.includes(id)));
    } else if (!Object.hasOwn(pinned, term) && !isDominant(candidates)) {
      const key = ids.join(',');
      const entry = autoByCandidates.get(key) ?? { terms: [], candidates: ids };
      entry.terms.push(term);
      autoByCandidates.set(key, entry);
    }
  }

  return [...groups, ...autoByCandidates.values()];
}
