// Country resolution: Wikidata P17 -> our country ids, names, flags and regions.
import rules from '../rules.json' with { type: 'json' };

const ID_BY_QID = new Map(Object.entries(rules.countryQids).map(([id, qid]) => [qid, id]));
const UK_PARTS = ['Q21', 'Q22', 'Q25', 'Q26'];
const REGIONAL_INDICATOR_A = 0x1f1e6;

export const slugify = (label) =>
  label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** QIDs of every country a candidate club can map to (for label/continent lookups). */
export function countryQidsOf(factsList, ukParts) {
  const qids = new Set(UK_PARTS);

  for (const facts of factsList) {
    for (const qid of facts.countries) {
      qids.add(qid);
    }
  }

  for (const parts of ukParts.values()) {
    for (const qid of parts) {
      qids.add(qid);
    }
  }

  qids.delete(rules.unitedKingdomQid);

  return [...qids];
}

/** A P17 value we accept as a country: a state with an ISO code, or one of our own ids. */
export function isValidCountry(qid, countryFacts) {
  if (qid === rules.unitedKingdomQid || rules.historicalCountries.includes(qid)) {
    return false;
  }

  return ID_BY_QID.has(qid) || Boolean(countryFacts.get(qid)?.iso);
}

/** The country QID a club belongs to. UK clubs resolve to England/Scotland/Wales/N. Ireland. */
export function countryQidOf(qid, facts, ukParts, isValid) {
  const direct = [...facts.countries]
    .filter(isValid)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  if (direct.length > 0) {
    return direct[0];
  }

  if (!facts.countries.has(rules.unitedKingdomQid)) {
    return null;
  }

  return [...(ukParts.get(qid) ?? [])].find((part) => UK_PARTS.includes(part)) ?? 'Q21';
}

/** Whether a UK club had no usable P131 chain and fell back to England. */
export function ukFallback(qid, facts, ukParts) {
  return (
    facts.countries.has(rules.unitedKingdomQid) &&
    facts.countries.size === 1 &&
    !(ukParts.get(qid)?.size > 0)
  );
}

export function flagFromIso(iso) {
  if (!/^[A-Z]{2}$/.test(iso ?? '')) {
    return null;
  }

  return String.fromCodePoint(
    ...[...iso].map((char) => REGIONAL_INDICATOR_A + char.charCodeAt(0) - 65),
  );
}

function regionOf(qid, continents) {
  if (rules.regionOverrides[qid]) {
    return rules.regionOverrides[qid];
  }

  const regions = [...continents].map((c) => rules.continentRegions[c]).filter(Boolean);

  return regions.includes('europe') ? 'europe' : (regions[0] ?? null);
}

/** Builds the countries record. Curated countries (the original 16) keep their reviewed values. */
export function buildCountries({ usedQids, terms, countryFacts, curated }) {
  const countries = {};
  const idByQid = new Map();
  const problems = [];

  for (const qid of [...usedQids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) {
    const override = rules.countryOverrides[qid];
    const label = override?.en ?? terms.get(qid)?.en;
    const id = override?.id ?? ID_BY_QID.get(qid) ?? slugify(label ?? qid);
    const facts = countryFacts.get(qid);
    const entry = curated[id] ?? {
      en: label,
      ar: override?.ar ?? terms.get(qid)?.ar,
      flag: rules.countryFlags[id] ?? flagFromIso(facts?.iso),
      region: regionOf(qid, facts?.continents ?? []),
    };

    if (!entry.en || !entry.ar || !entry.flag || !entry.region) {
      problems.push(`${qid} ${id}: incomplete country entry ${JSON.stringify(entry)}`);
    }

    idByQid.set(qid, id);
    countries[id] = entry;
  }

  return { countries, idByQid, problems };
}
