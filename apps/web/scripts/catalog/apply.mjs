// Publishes the generated catalog: verifies scripts/catalog/out, then copies it into src/content.
// Usage: pnpm catalog:apply
//
// clubs.json is written one club per line so a catalog refresh reviews as a per-club diff
// instead of one 300 KB line (minified) or 4,000 lines of single aliases (2-space). The other
// two files are small and keep 2-space JSON. src/content/*.json is excluded from Biome.
// catalog-version.json holds the id the ranked backend stores with every round.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const outPath = (name) => fileURLToPath(new URL(`./out/${name}`, import.meta.url));
const contentPath = (name) => fileURLToPath(new URL(`../../src/content/${name}`, import.meta.url));
const readOut = (name) => JSON.parse(readFileSync(outPath(name), 'utf8'));
const twoSpaceJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

function verifyOrExit() {
  const verify = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./verify.mjs', import.meta.url))],
    {
      encoding: 'utf8',
    },
  );
  const report = `${verify.stdout}${verify.stderr}`.trim();

  if (verify.status !== 0 || report !== 'OK') {
    console.error(`catalog verify failed, nothing was written:\n${report}`);
    process.exit(1);
  }
}

function clubsJson(clubList) {
  const lines = clubList.map((club) => `  ${JSON.stringify(club)}`);

  return `[\n${lines.join(',\n')}\n]\n`;
}

/** `wd-<club count>-<first 8 hex of the sha-256 of the written clubs.json>`. */
function versionOf(clubList, text) {
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 8);

  return `wd-${clubList.length}-${hash}`;
}

verifyOrExit();

const clubs = readOut('clubs.json');
const clubsText = clubsJson(clubs);
const version = versionOf(clubs, clubsText);

writeFileSync(contentPath('clubs.json'), clubsText);
writeFileSync(contentPath('countries.json'), twoSpaceJson(readOut('countries.json')));
writeFileSync(contentPath('ambiguous.json'), twoSpaceJson(readOut('ambiguous.json')));
writeFileSync(contentPath('catalog-version.json'), twoSpaceJson({ version }));

console.log(`catalog applied: ${clubs.length} clubs, version ${version}`);
