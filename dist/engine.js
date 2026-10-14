import { clubs, countries } from './clubs.js';
export { clubs, countries };
export function normalize(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/['’]/g, '')
    .replace(/[.]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
const aliasMap = new Map();
for (const club of clubs) for (const name of [club.name, club.arabic, ...club.aliases]) {
  const key = normalize(name);
  const matches = aliasMap.get(key) || [];
  if (!matches.some(c => c.id === club.id)) matches.push(club);
  aliasMap.set(key, matches);
}
export function eligibleClubs(challenge) {
  return clubs.filter(c => challenge.country ? c.country === challenge.country : challenge.region ? c.region === challenge.region : challenge.letter ? c.name.toLowerCase().startsWith(challenge.letter) : true);
}
function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = next;
  }
  return prev[b.length];
}
function choose(matches, challenge, fuzzy = false) {
  const eligible = new Set(eligibleClubs(challenge).map(c => c.id));
  const inScope = matches.filter(c => eligible.has(c.id));
  if (inScope.length === 1) return { kind: 'match', club: inScope[0], fuzzy };
  if (inScope.length > 1 || matches.length > 1) return { kind: 'ambiguous' };
  if (matches.length === 1) return { kind: 'wrong-category', club: matches[0] };
  return { kind: 'unknown' };
}
export function resolveClub(value, challenge = {}) {
  let key = normalize(value).replace(/^(?:\p{N}+\s+|\p{N}+(?=\p{L}))/u, '').replace(/\b(?:football club|fc|afc|cf)\b/g, '').replace(/^نادي\s+/, '').trim().replace(/\s+/g, ' ');
  // Preserve official names containing FC while also accepting the common name.
  const exact = aliasMap.get(normalize(value)) || aliasMap.get(key) || (key.startsWith('و') ? aliasMap.get(key.slice(1)) : null);
  if (exact) return choose(exact, challenge);
  if (key.length < 5 || /^(united|city|real|al|manchester|athletic|inter|الاتحاد|النصر|الاهلي)$/.test(key)) return { kind: ['united', 'city', 'manchester', 'الاتحاد', 'النصر', 'الاهلي'].includes(key) ? 'ambiguous' : 'unknown' };
  const threshold = key.length >= 9 ? 2 : 1;
  let best = threshold + 1;
  const found = new Map();
  for (const [alias, matches] of aliasMap) {
    if (alias.length < 5 || Math.abs(alias.length - key.length) > threshold) continue;
    const d = distance(key, alias);
    if (d > threshold || d > best) continue;
    if (d < best) { found.clear(); best = d; }
    for (const club of matches) found.set(club.id, club);
  }
  return choose([...found.values()], challenge, true);
}
export function parseAnswers(text, challenge = {}) {
  const parts = text.split(/[,،;؛\n]+/).map(p => p.trim().replace(/^\s*(?:[-*•]|\p{N}+[.)\-])\s*/u, '')).filter(Boolean);
  const output = [];
  for (const part of parts) {
    const direct = resolveClub(part, challenge);
    if (direct.kind !== 'unknown') { output.push({ input: part, ...direct }); continue; }
    const words = normalize(part).split(' ');
    let unknown = [];
    const flush = () => { if (unknown.length) { const input = unknown.join(' '); output.push({ input, ...resolveClub(input, challenge) }); unknown = []; } };
    for (let i = 0; i < words.length;) {
      if (['and', 'و', '&'].includes(words[i])) { flush(); i++; continue; }
      let matched = false;
      for (let n = Math.min(6, words.length - i); n > 0; n--) {
        let candidate = words.slice(i, i + n).join(' ');
        const key = aliasMap.has(candidate) ? candidate : candidate.startsWith('و') && aliasMap.has(candidate.slice(1)) ? candidate.slice(1) : null;
        if (key) { flush(); output.push({ input: candidate, ...choose(aliasMap.get(key), challenge) }); i += n; matched = true; break; }
      }
      if (!matched) { unknown.push(words[i]); i++; }
    }
    flush();
  }
  return output;
}
export const levels = [10, 50, 100];
export function durationForTarget(target) { return target * 6; }
export const challengePool = [
  { id: 'world', difficulty: 'easy' },
  ...Object.keys(countries).map(country => ({ id: country, country, difficulty: ['england', 'spain', 'italy', 'germany', 'france'].includes(country) ? 'easy' : 'medium' })),
  ...['b', 'a', 's', 'm', 'c'].map(letter => ({ id: `letter-${letter}`, letter, difficulty: 'medium' })),
  ...['europe', 'asia', 'africa', 'americas'].map(region => ({ id: region, region, difficulty: 'medium' })),
];
export function challengesForLevel(target) {
  return challengePool.filter(c => eligibleClubs(c).length >= target).map(c => ({ ...c, target }));
}
export function dayKey(now = new Date()) { return now.toISOString().slice(0, 10); }
export function dailyChallenge(now = new Date(), target = 10) {
  const day = Math.floor(Date.parse(dayKey(now)) / 86400000);
  const pool = challengesForLevel(target);
  const index = ((day - 20740) % pool.length + pool.length) % pool.length;
  return { ...pool[index], key: dayKey(now), number: Math.max(1, day - 20739) };
}
export function dailyStorageKey(challenge) { return `nxc-v2-daily-${challenge.key}-${challenge.target}`; }
export function scoreAnswers(found, results, target) {
  const next = [...found];
  const events = [];
  for (const result of results) {
    if (next.length >= target) break;
    if (result.kind !== 'match') events.push(result);
    else if (next.includes(result.club.id)) events.push({ ...result, kind: 'duplicate' });
    else { next.push(result.club.id); events.push({ ...result, kind: 'accepted' }); }
  }
  return { found: next, events };
}
export function remainingSeconds(deadline, now = Date.now()) { return Math.max(0, Math.ceil((deadline - now) / 1000)); }
