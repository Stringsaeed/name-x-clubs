// Candidate filtering: which Wikidata items are first-team men's football clubs we want.
import rules from '../rules.json' with { type: 'json' };
import { isSquadLabel, normalize, stripBrackets } from './clean.mjs';

/** Direct P31 values that disqualify an item even if it is also a football club. */
const EXCLUDED_CLASSES = new Set([
  'Q51481377', // women's association football club
  'Q28140340', // women's association football team
  'Q6979593', // national association football team
  'Q135408445', // men's national association football team
  'Q134468886', // football academy / youth
  'Q1194951', // national sports team
  'Q94579592', // defunct association football club
]);

const intersects = (a, b) => [...a].some((item) => b.has(item));

/** Reasons that need only Wikidata facts (no labels): returns a reason string or null. */
export function factRejection(qid, facts, ctx) {
  if (ctx.overrides[qid]?.exclude) {
    return 'override-excluded';
  }

  if (intersects(facts.types, EXCLUDED_CLASSES)) {
    return 'excluded-class';
  }

  if (facts.countries.size === 0 && !ctx.overrides[qid]?.country) {
    return 'no-country';
  }

  if (ctx.multisportIds.has(qid) && ctx.parentsOfClubs.has(qid)) {
    return 'multisport-has-football-item';
  }

  if (intersects(facts.partOf, ctx.clubIds)) {
    return 'reserve-of-a-club';
  }

  return null;
}

/** Reasons that need labels. Core (curated) clubs are never dropped here. */
export function labelRejection(qid, terms, ctx) {
  if (ctx.overrides[qid]?.id) {
    return null;
  }

  if (!terms) {
    return 'no-labels';
  }

  if (!rules.squadLabelAllowQids.includes(qid) && isSquadLabel(terms.en, terms.ar)) {
    return 'squad-label';
  }

  if (!terms.en && !terms.enwiki) {
    return 'no-english';
  }

  return !terms.ar && !terms.arwiki ? 'no-arabic' : null;
}

/** A club shared as a parent by several football items is a multisport umbrella, not a team. */
export function parentsOf(clubFacts) {
  const parents = new Set();

  for (const facts of clubFacts) {
    for (const parent of facts.partOf) {
      parents.add(parent);
    }
  }

  return parents;
}

/** Items whose multisport parent lists them (P527/P1830) also count as having a football item. */
export function parentsViaChildren(multisportFacts, clubIds) {
  const parents = new Set();

  for (const [qid, facts] of multisportFacts) {
    if (intersects(facts.hasPart, clubIds) || intersects(facts.owns, clubIds)) {
      parents.add(qid);
    }
  }

  return parents;
}

/** Same name in the same country: keep the one with more sitelinks (curated clubs always win). */
export function dedupeByName(records) {
  const best = new Map();

  for (const record of [...records].sort(byPopularity)) {
    const key = `${record.countryId}|${normalize(stripBrackets(record.name))}`;
    const held = best.get(key);

    if (!held || (record.core && !held.core)) {
      best.set(key, record);
    }
  }

  return { kept: [...best.values()], dropped: records.filter((r) => !isKept(best, r)) };
}

function isKept(best, record) {
  return best.get(`${record.countryId}|${normalize(stripBrackets(record.name))}`) === record;
}

/** Most popular first: score (sitelinks plus the Arab-world audience boost), then QID. */
export function byPopularity(a, b) {
  return (
    (b.score ?? b.links) - (a.score ?? a.links) || Number(a.qid.slice(1)) - Number(b.qid.slice(1))
  );
}
