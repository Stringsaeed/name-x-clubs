import { readFileSync } from 'node:fs';
import { normalize } from '../../src/game/matching/normalize.ts';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const out = read('./out/clubs.json');
const countries = read('./out/countries.json');
const ambiguous = read('./out/ambiguous.json');
const src = read('../../src/content/clubs.json');
const srcCountries = read('../../src/content/countries.json');
const curatedAmbiguous = read('./curated-ambiguous.json');
const coreIds = read('./core-ids.json');
const problems = [];
const byId = new Map(out.map((club) => [club.id, club]));

for (const club of src) {
  const next = byId.get(club.id);

  if (!next) {
    problems.push(`missing ${club.id}`);
    continue;
  }

  for (const key of ['name', 'arabic', 'country', 'region']) {
    if (next[key] !== club[key]) {
      problems.push(`${club.id} ${key} changed: ${club[key]} -> ${next[key]}`);
    }
  }

  const have = new Set(next.aliases.map(normalize));
  const lost = club.aliases.filter(
    (alias) => !have.has(normalize(alias)) && normalize(alias) !== normalize(club.name),
  );

  if (lost.length > 0 && !lost.every((a) => normalize(a) === normalize(club.arabic))) {
    problems.push(`${club.id} lost aliases: ${lost.join(', ')}`);
  }
}

for (const [id, entry] of Object.entries(srcCountries)) {
  if (JSON.stringify(countries[id]) !== JSON.stringify(entry)) {
    problems.push(`country ${id} changed`);
  }
}

for (const club of out) {
  if (!club.name || !club.arabic || !countries[club.country]) {
    problems.push(`${club.id} incomplete`);
  }

  if (club.region !== countries[club.country]?.region) {
    problems.push(`${club.id} region mismatch`);
  }
}

for (const id of coreIds) {
  if (!byId.has(id)) {
    problems.push(`core club ${id} missing from the generated catalog`);
  }
}

for (const group of curatedAmbiguous) {
  const next = ambiguous.find((entry) => entry.terms[0] === group.terms[0]);
  const ok =
    next &&
    group.terms.every((t) => next.terms.includes(t)) &&
    group.candidates.every((id) => next.candidates.includes(id));

  if (!ok) {
    problems.push(`curated ambiguity lost: ${group.terms[0]}`);
  }
}

for (const group of ambiguous) {
  for (const id of group.candidates) {
    if (!byId.has(id)) {
      problems.push(`ambiguity candidate ${id} unknown`);
    }
  }
}

const terms = ambiguous.flatMap((group) => group.terms.map(normalize));
for (const banned of ['al ahly', 'al nassr']) {
  if (terms.includes(banned)) {
    problems.push(`${banned} must not be ambiguous`);
  }
}
for (const required of ['الاهلي', 'النصر', 'الاتحاد']) {
  if (!terms.includes(required)) {
    problems.push(`${required} must stay ambiguous`);
  }
}

console.log(problems.length === 0 ? 'OK' : problems.join('\n'));
