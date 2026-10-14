// Human-readable report.md for reviewing an ingest run.
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { normalize } from './clean.mjs';

const SAMPLE_SIZE = 30;
const SAMPLE_SEED = 20261014;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** Deterministic PRNG so the spot-check sample is stable between runs. */
function mulberry32(seed) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(items, count) {
  const random = mulberry32(SAMPLE_SEED);
  const pool = [...items];
  const out = [];

  while (out.length < count && pool.length > 0) {
    out.push(...pool.splice(Math.floor(random() * pool.length), 1));
  }

  return out;
}

const table = (header, rows) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

function countBy(items, keyOf) {
  const counts = new Map();

  for (const item of items) {
    counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  }

  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function sizeSection(output) {
  const pretty = JSON.stringify(output, null, 2);
  const compact = JSON.stringify(output);

  return [
    `- pretty-printed: ${kb(Buffer.byteLength(pretty))}`,
    `- minified: ${kb(Buffer.byteLength(compact))}`,
    `- gzip (minified): ${kb(gzipSync(compact).length)}`,
    `- brotli (minified): ${kb(brotliCompressSync(compact).length)}`,
  ].join('\n');
}

function countrySection(output, countries) {
  const byCountry = countBy(output, (club) => club.country).map(([id, count]) => [
    id,
    countries[id].en,
    String(count),
    countries[id].region,
  ]);
  const byRegion = countBy(output, (club) => club.region).map(([id, count]) => [id, String(count)]);

  return [
    table(['region', 'clubs'], byRegion),
    '',
    `${byCountry.length} countries (top 40 by club count):`,
    '',
    table(['id', 'name', 'clubs', 'region'], byCountry.slice(0, 40)),
  ].join('\n');
}

function arabicSection(clubs, rejections, facts, terms) {
  const sources = countBy(clubs, (club) => club.names.arabicFrom).map(([name, count]) => [
    name,
    String(count),
  ]);
  const lacking = (rejections['no-arabic'] ?? [])
    .map((qid) => ({ qid, links: facts.get(qid)?.links ?? 0, en: terms.get(qid)?.en }))
    .sort((a, b) => b.links - a.links);

  return [
    table(['Arabic name source', 'clubs'], sources),
    '',
    `Excluded for lacking any Arabic label/arwiki title: ${lacking.length}. Top 25 by sitelinks:`,
    '',
    lacking
      .slice(0, 25)
      .map((entry) => `- ${entry.qid} ${entry.en} (${entry.links})`)
      .join('\n'),
  ].join('\n');
}

function ambiguitySection({ ambiguous, shared, ambiguityStats, clubs, curatedCount }) {
  const clubById = new Map(clubs.map((club) => [club.id, club]));
  const top = [...ambiguous]
    .sort((a, b) => b.candidates.length - a.candidates.length)
    .slice(0, 25)
    .map((group) => [
      group.terms.slice(0, 4).join(', '),
      String(group.candidates.length),
      group.candidates
        .slice(0, 4)
        .map((id) => clubById.get(id)?.name)
        .join('; '),
    ]);

  return [
    `- groups: ${ambiguous.length} (${curatedCount} curated), shared terms detected: ${shared.size}`,
    `- Wikidata aliases dropped: ${ambiguityStats.droppedAsCollision} collided with a real name, ${ambiguityStats.droppedAsShared} shared only by aliases`,
    `- pinned terms removed from other clubs: ${ambiguityStats.pinnedRemoved}`,
    `- pinned terms that equal another club's display name: ${ambiguityStats.pinnedNameConflicts.join(' | ') || 'none'}`,
    '',
    table(['terms', 'candidates', 'first candidates'], top),
  ].join('\n');
}

function coreSection(clubs, curatedAmbiguous) {
  const curatedKeys = new Set(curatedAmbiguous.flatMap((group) => group.terms.map(normalize)));
  const core = clubs.filter((club) => club.core);
  const gained = core.reduce(
    (sum, club) => sum + club.aliases.filter((a) => a.level === 'wd').length,
    0,
  );

  return [
    `- core clubs: ${core.length}, new Wikidata aliases added to them: ${gained}`,
    `- curated ambiguous terms: ${curatedKeys.size}`,
  ].join('\n');
}

function aliasFilterSection(clubs) {
  const totals = new Map();

  for (const club of clubs) {
    for (const [reason, count] of Object.entries(club.aliasStats.rejected)) {
      totals.set(reason, (totals.get(reason) ?? 0) + count);
    }
  }

  return table(
    ['alias rejected as', 'candidates'],
    [...totals].sort((a, b) => b[1] - a[1]).map(([reason, count]) => [reason, String(count)]),
  );
}

function mismatchSection(clubs) {
  const rows = clubs.filter((club) => club.names.labelMismatch);

  return rows.length === 0
    ? 'none'
    : rows
        .map((club) => `- ${club.id} ${club.names.labelMismatch} (name: "${club.name}")`)
        .join('\n');
}

function sampleSection(output) {
  const fresh = output.filter((club) => club.id.startsWith('wd-'));

  return sample(fresh, SAMPLE_SIZE)
    .map(
      (club) =>
        `- ${club.id} ${club.wikidata} [${club.country}] "${club.name}" / "${club.arabic}" (${club.sitelinks}) aliases: ${club.aliases.join(', ') || '-'}`,
    )
    .join('\n');
}

export function buildReport(input) {
  const { output, clubs, countries, rejections, facts, terms, top, http, seconds } = input;
  const aliasCount = output.reduce((sum, club) => sum + club.aliases.length, 0);
  const rejectionRows = Object.entries(rejections)
    .map(([reason, qids]) => [reason, String(qids.length)])
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  return [
    '# Catalog ingest report',
    '',
    `Generated by scripts/catalog/ingest.mjs in ${seconds}s. Network requests: ${http.network}, cache hits: ${http.cached}, retries: ${http.retries}.`,
    '',
    '## Totals',
    '',
    `- clubs: ${output.length} (${clubs.filter((c) => c.core).length} core, ${output.filter((c) => c.id.startsWith('wd-')).length} new)`,
    `- countries: ${Object.keys(countries).length}`,
    `- aliases: ${aliasCount} total, ${(aliasCount / output.length).toFixed(1)} per club`,
    `- popularity-score cutoff for new clubs (sitelinks + Arab-world boost): ${top.cutoff} (${top.belowCut} more eligible clubs fell below the cut)`,
    '',
    '## Size of clubs.json',
    '',
    sizeSection(output),
    '',
    '## Clubs by region and country',
    '',
    countrySection(output, countries),
    '',
    input.countryProblems.length > 0
      ? `Country problems: ${input.countryProblems.join('; ')}\n`
      : '',
    '## Arabic coverage',
    '',
    arabicSection(clubs, rejections, facts, terms),
    '',
    '## Filter rejections (candidates removed, by reason)',
    '',
    table(['reason', 'items'], rejectionRows),
    '',
    '## English label vs enwiki title mismatches (label kept as the name, enwiki title kept as an alias; check these)',
    '',
    mismatchSection(clubs),
    '',
    '## Alias filter (Wikidata/arwiki alias candidates dropped, by reason)',
    '',
    aliasFilterSection(clubs),
    '',
    '## Ambiguity',
    '',
    ambiguitySection({ ...input, curatedCount: input.curatedAmbiguousCount }),
    '',
    '## Core clubs',
    '',
    coreSection(clubs, input.curatedAmbiguous),
    '',
    `## ${SAMPLE_SIZE} random new entries (spot-check)`,
    '',
    sampleSection(output),
    '',
  ].join('\n');
}
