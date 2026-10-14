// Build-time catalog ingest: ~1,500 bilingual football clubs keyed by Wikidata QID.
// Usage: pnpm catalog:ingest [--refresh]   (--refresh bypasses scripts/catalog/.cache)
// Reads Wikidata (cached), src/content/*.json (curated core) and scripts/catalog/{rules,overrides}.json.
// Writes scripts/catalog/out/{clubs,countries,ambiguous.json} and report.md. Never touches src/.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import curatedAmbiguous from '../../src/content/ambiguous.json' with { type: 'json' };
import coreClubs from '../../src/content/clubs.json' with { type: 'json' };
import curatedCountries from '../../src/content/countries.json' with { type: 'json' };
import { buildAliases, displayNames } from './lib/aliases.mjs';
import { detectSharedTerms, mergeAmbiguity } from './lib/ambiguity.mjs';
import { normalize } from './lib/clean.mjs';
import {
  buildCountries,
  countryQidOf,
  countryQidsOf,
  isValidCountry,
  ukFallback,
} from './lib/countries.mjs';
import { stats as httpStats } from './lib/http.mjs';
import { buildReport } from './lib/report.mjs';
import {
  byPopularity,
  dedupeByName,
  factRejection,
  labelRejection,
  parentsOf,
  parentsViaChildren,
} from './lib/select.mjs';
import {
  fetchArwikiRedirects,
  fetchClubCandidates,
  fetchCountryFacts,
  fetchFacts,
  fetchMultisportCandidates,
  fetchTerms,
  fetchUkParts,
} from './lib/wikidata.mjs';
import overrides from './overrides.json' with { type: 'json' };
import rules from './rules.json' with { type: 'json' };

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const log = (message) => console.log(`[catalog] ${message}`);
const byQid = (a, b) => Number(a.slice(1)) - Number(b.slice(1));

/** Why candidates were dropped: reason -> QIDs. Printed in the report. */
const rejections = {};
const reject = (reason, qid) => {
  rejections[reason] ??= [];
  rejections[reason].push(qid);
};

const coreQids = Object.entries(overrides)
  .filter(([, entry]) => entry.id)
  .map(([qid]) => qid);

/** Candidate QIDs (clubs + multisport fallback + the curated core) with their Wikidata facts. */
async function selectCandidates() {
  const clubs = await fetchClubCandidates(rules.minSitelinks);
  const multisport = await fetchMultisportCandidates(rules.minSitelinks);
  const qids = [...new Set([...clubs.keys(), ...multisport.keys(), ...coreQids])].sort(byQid);
  log(`${clubs.size} club + ${multisport.size} multisport candidates, ${qids.length} with core`);

  return {
    facts: await fetchFacts(qids),
    clubIds: new Set(clubs.keys()),
    multisportIds: new Set(multisport.keys()),
  };
}

/** Facts-only filtering: classes, country, reserve sides, multisport umbrellas. */
function filterByFacts({ facts, clubIds, multisportIds }) {
  const multisportFacts = [...multisportIds].map((qid) => [qid, facts.get(qid)]);
  const parentsOfClubs = new Set([
    ...parentsOf([...clubIds].map((qid) => facts.get(qid))),
    ...parentsViaChildren(multisportFacts, clubIds),
  ]);
  const ctx = { overrides, clubIds, multisportIds, parentsOfClubs };
  const survivors = [];

  for (const [qid, qidFacts] of facts) {
    const reason = overrides[qid]?.id ? null : factRejection(qid, qidFacts, ctx);

    if (reason) {
      reject(reason, qid);
    } else {
      survivors.push(qid);
    }
  }

  return survivors;
}

/** Fetches labels, drops clubs without usable en/ar names, and resolves UK sub-countries. */
async function attachLabels(survivors, facts) {
  const terms = await fetchTerms(survivors);
  const kept = survivors.filter((qid) => {
    const reason = labelRejection(qid, terms.get(qid), { overrides });

    if (reason) {
      reject(reason, qid);
    }

    return !reason;
  });
  const uk = kept.filter((qid) => facts.get(qid).countries.has(rules.unitedKingdomQid));

  return { terms, kept, ukParts: await fetchUkParts(uk) };
}

/** Country labels, ISO codes and continents for every P17 value among the kept clubs. */
async function loadCountryData({ kept, facts, terms, ukParts }) {
  const qids = [
    ...new Set([
      ...Object.values(rules.countryQids),
      ...countryQidsOf(
        kept.map((qid) => facts.get(qid)),
        ukParts,
      ),
    ]),
  ];
  const labels = await fetchTerms(qids.filter((qid) => !terms.has(qid)));

  for (const [qid, entry] of labels) {
    terms.set(qid, entry);
  }

  return fetchCountryFacts(qids);
}

function makeRecord(qid, ctx) {
  const { facts, terms, ukParts, isValid, countryFacts } = ctx;
  const override = overrides[qid];
  const names = displayNames(terms.get(qid), override);
  const countryQid = override?.country
    ? rules.countryQids[override.country]
    : countryQidOf(qid, facts.get(qid), ukParts, isValid);

  const links = facts.get(qid).links;
  const iso = countryFacts.get(countryQid)?.iso;

  return {
    qid,
    links,
    score: links + (rules.arabWorldIso.includes(iso) ? rules.arabWorldBoost : 0),
    core: Boolean(override?.id),
    override,
    names,
    name: names.name,
    arabic: names.arabic,
    countryQid,
    ukFallback: ukFallback(qid, facts.get(qid), ukParts),
    id: override?.id ?? `wd-${qid.slice(1)}`,
  };
}

/** All core clubs plus the most popular others, `rules.target` clubs in all. */
function pickTop(records) {
  const core = records.filter((record) => record.core);
  const others = records.filter((record) => !record.core).sort(byPopularity);
  const room = Math.max(0, rules.target - core.length);

  return {
    core,
    chosen: others.slice(0, room),
    cutoff: others[room - 1]?.score ?? 0,
    belowCut: Math.max(0, others.length - room),
  };
}

function assertUniqueIds(records) {
  const seen = new Set();

  for (const record of records) {
    if (seen.has(record.id)) {
      throw new Error(`duplicate club id ${record.id}`);
    }

    seen.add(record.id);
  }

  for (const club of coreClubs) {
    if (!seen.has(club.id)) {
      throw new Error(`core club ${club.id} missing from the catalog`);
    }
  }
}

function toClub(record, ctx) {
  const { facts, terms, redirects, blocked } = ctx;
  const { aliases, stats } = buildAliases({
    names: record.names,
    terms: terms.get(record.qid),
    facts: facts.get(record.qid),
    override: record.override,
    redirects: record.core ? (redirects.get(terms.get(record.qid)?.arwiki) ?? []) : [],
    blocked,
  });

  return { ...record, aliases, aliasStats: stats };
}

function serializeClub(club, countries) {
  return {
    id: club.id,
    country: club.countryId,
    name: club.name,
    arabic: club.arabic,
    aliases: club.aliases.map((alias) => alias.text),
    region: countries[club.countryId].region,
    wikidata: club.qid,
    sitelinks: club.links,
  };
}

const writeJson = (name, value) =>
  writeFile(join(OUT, name), `${JSON.stringify(value, null, 2)}\n`);

/** Core clubs first in their original order, then the new clubs by popularity. */
function orderClubs(clubs) {
  const coreOrder = new Map(coreClubs.map((club, index) => [club.id, index]));
  const core = clubs
    .filter((club) => club.core)
    .sort((a, b) => coreOrder.get(a.id) - coreOrder.get(b.id));

  return [...core, ...clubs.filter((club) => !club.core).sort(byPopularity)];
}

async function buildRecords() {
  const candidates = await selectCandidates();
  const { facts } = candidates;
  const survivors = filterByFacts(candidates);
  const { terms, kept, ukParts } = await attachLabels(survivors, facts);
  log(`${survivors.length} after fact filters, ${kept.length} with usable en/ar names`);

  const countryFacts = await loadCountryData({ kept, facts, terms, ukParts });
  const isValid = (qid) => isValidCountry(qid, countryFacts);
  const records = [];

  for (const qid of kept) {
    const record = makeRecord(qid, { facts, terms, ukParts, isValid, countryFacts });

    if (record.countryQid) {
      records.push({ ...record, countryId: record.countryQid });
    } else {
      reject('no-valid-country', qid);
    }
  }

  const deduped = dedupeByName(records);

  for (const record of deduped.dropped) {
    reject('duplicate-name-in-country', record.qid);
  }

  return { facts, terms, countryFacts, kept: deduped.kept };
}

async function main() {
  const started = Date.now();
  await mkdir(OUT, { recursive: true });
  const { facts, terms, countryFacts, kept } = await buildRecords();
  const top = pickTop(kept);
  const chosen = [...top.core, ...top.chosen];
  const built = buildCountries({
    usedQids: new Set(chosen.map((record) => record.countryQid)),
    terms,
    countryFacts,
    curated: curatedCountries,
  });
  const placed = chosen.map((record) => ({
    ...record,
    countryId: built.idByQid.get(record.countryQid),
  }));
  assertUniqueIds(placed);

  const arwikiTitles = placed.filter((r) => r.core).map((r) => terms.get(r.qid)?.arwiki);
  const redirects = await fetchArwikiRedirects(arwikiTitles.filter(Boolean));
  const blocked = new Set([
    ...curatedAmbiguous.flatMap((group) => group.terms.map(normalize)),
    ...Object.keys(rules.pinnedTerms).map(normalize),
    ...Object.values(built.countries).flatMap((country) => [
      normalize(country.en),
      normalize(country.ar),
    ]),
  ]);
  const clubs = orderClubs(
    placed.map((record) => toClub(record, { facts, terms, redirects, blocked })),
  );
  const { shared, stats: ambiguityStats } = detectSharedTerms(clubs, rules.pinnedTerms);
  const ambiguous = mergeAmbiguity({
    curated: curatedAmbiguous,
    shared,
    pinned: rules.pinnedTerms,
  });
  const output = clubs.map((club) => serializeClub(club, built.countries));

  await writeJson('clubs.json', output);
  await writeJson('countries.json', built.countries);
  await writeJson('ambiguous.json', ambiguous);
  await writeFile(
    join(OUT, 'report.md'),
    buildReport({
      output,
      clubs,
      countries: built.countries,
      countryProblems: built.problems,
      ambiguous,
      shared,
      ambiguityStats,
      rejections,
      top,
      terms,
      facts,
      curatedAmbiguous,
      curatedAmbiguousCount: curatedAmbiguous.length,
      http: httpStats,
      seconds: Math.round((Date.now() - started) / 1000),
    }),
  );
  log(`wrote ${output.length} clubs, ${Object.keys(built.countries).length} countries`);
}

await main();
