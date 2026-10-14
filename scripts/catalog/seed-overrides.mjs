// One-off seeding of scripts/catalog/overrides.json from the reviewed 200-club catalog and the
// Wikidata probe's QID mapping. Safe to rerun: existing override entries are never overwritten.
// Usage: node scripts/catalog/seed-overrides.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import probe from '../../docs/research/wikidata-probe.json' with { type: 'json' };
import clubs from '../../src/content/clubs.json' with { type: 'json' };

const OVERRIDES = join(dirname(fileURLToPath(import.meta.url)), 'overrides.json');

/** Same-name duplicates the probe flagged (old/defunct items, duplicate items for one club). */
const EXCLUDED = {
  Q2494372: 'Crystal Palace F.C. (1861), a different, older club',
  Q2422417: 'Toulouse FC (old club that was dissolved in 2003)',
  Q115804941: 'Duplicate Wikidata item for Al Nassr (use Q482764)',
  Q123514942: 'Duplicate Wikidata item for Al Qadsiah (use Q286191)',
  Q956200: 'Old Seattle Sounders (USL), not the MLS club',
  Q2091731: 'Old Seattle Sounders (NASL), not the MLS club',
  Q1138386: 'Old Portland Timbers (USL), not the MLS club',
  Q16025275: 'Old Portland Timbers (NASL), not the MLS club',
};

async function readExisting() {
  try {
    return JSON.parse(await readFile(OVERRIDES, 'utf8'));
  } catch {
    return {};
  }
}

const existing = await readExisting();
const byId = new Map(clubs.map((club) => [club.id, club]));
const seeded = { ...existing };

for (const result of probe.results) {
  const club = byId.get(result.id);
  seeded[result.qid] ??= {
    id: club.id,
    name: club.name,
    arabic: club.arabic,
    country: club.country,
    aliases: club.aliases,
    removeAliases: [],
  };
}

for (const [qid, note] of Object.entries(EXCLUDED)) {
  seeded[qid] ??= { exclude: true, note };
}

const sorted = Object.fromEntries(Object.entries(seeded).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(OVERRIDES, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`overrides.json: ${Object.keys(sorted).length} entries`);
