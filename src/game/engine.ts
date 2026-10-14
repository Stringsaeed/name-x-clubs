import { type Club, type ClubId, clubs, countries } from '../content/catalog';
import { type Challenge, type Level, levels, type Scope } from './model';

export { clubs, countries, levels };
export type Resolution =
  | { kind: 'match'; club: Club; fuzzy: boolean }
  | { kind: 'wrong-category'; club: Club }
  | { kind: 'ambiguous' }
  | { kind: 'unknown' };
export type ParsedAnswer = Resolution & { input: string };
export type AnswerEvent =
  | Exclude<ParsedAnswer, { kind: 'match' }>
  | { kind: 'accepted' | 'duplicate'; club: Club; input: string };
const world: Pick<Challenge, 'scope'> = { scope: { kind: 'world' } };
export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/['’]/g, '')
    .replace(/[.]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
const aliasMap = new Map<string, Club[]>();
for (const club of clubs) {
  for (const name of [club.name, club.arabic, ...club.aliases]) {
    const key = normalize(name);
    const matches = aliasMap.get(key) || [];
    if (!matches.some((c) => c.id === club.id)) {
      matches.push(club);
    }
    aliasMap.set(key, matches);
  }
}
export function eligibleClubs({ scope }: Pick<Challenge, 'scope'>) {
  return clubs.filter((club) => {
    switch (scope.kind) {
      case 'world':
        return true;
      case 'country':
        return club.country === scope.country;
      case 'region':
        return club.region === scope.region;
      case 'letter':
        return club.name.toLowerCase().startsWith(scope.letter);
      default: {
        const exhaustive: never = scope;
        return exhaustive;
      }
    }
  });
}
function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        (next[j - 1] ?? Infinity) + 1,
        (prev[j] ?? Infinity) + 1,
        (prev[j - 1] ?? Infinity) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = next;
  }
  return prev[b.length] ?? a.length + b.length;
}
function choose(matches: Club[], challenge: Pick<Challenge, 'scope'>, fuzzy = false): Resolution {
  const eligible = new Set(eligibleClubs(challenge).map((club) => club.id));
  const inScope = matches.filter((club) => eligible.has(club.id));
  const [match, ...rest] = inScope;
  if (match && rest.length === 0) {
    return { kind: 'match', club: match, fuzzy };
  }
  if (inScope.length > 1 || matches.length > 1) {
    return { kind: 'ambiguous' };
  }
  const [wrong] = matches;
  return wrong ? { kind: 'wrong-category', club: wrong } : { kind: 'unknown' };
}
export function resolveClub(
  value: string,
  challenge: Pick<Challenge, 'scope'> = world,
): Resolution {
  const key = normalize(value)
    .replace(/^(?:\p{N}+\s+|\p{N}+(?=\p{L}))/u, '')
    .replace(/\b(?:football club|fc|afc|cf)\b/g, '')
    .replace(/^نادي\s+/, '')
    .trim()
    .replace(/\s+/g, ' ');
  // Preserve official names containing FC while also accepting the common name.
  const exact =
    aliasMap.get(normalize(value)) ||
    aliasMap.get(key) ||
    (key.startsWith('و') ? aliasMap.get(key.slice(1)) : null);
  if (exact) {
    return choose(exact, challenge);
  }
  if (
    key.length < 5 ||
    /^(united|city|real|al|manchester|athletic|inter|الاتحاد|النصر|الاهلي)$/.test(key)
  ) {
    return {
      kind: ['united', 'city', 'manchester', 'الاتحاد', 'النصر', 'الاهلي'].includes(key)
        ? 'ambiguous'
        : 'unknown',
    };
  }
  const threshold = key.length >= 9 ? 2 : 1;
  let best = threshold + 1;
  const found = new Map<ClubId, Club>();
  for (const [alias, matches] of aliasMap) {
    if (alias.length < 5 || Math.abs(alias.length - key.length) > threshold) {
      continue;
    }
    const d = distance(key, alias);
    if (d > threshold || d > best) {
      continue;
    }
    if (d < best) {
      found.clear();
      best = d;
    }
    for (const club of matches) {
      found.set(club.id, club);
    }
  }
  return choose([...found.values()], challenge, true);
}
export function parseAnswers(
  text: string,
  challenge: Pick<Challenge, 'scope'> = world,
): ParsedAnswer[] {
  const parts = text
    .split(/[,،;؛\n]+/)
    .map((p) => p.trim().replace(/^\s*(?:[-*•]|\p{N}+[.)-])\s*/u, ''))
    .filter(Boolean);
  const output: ParsedAnswer[] = [];
  for (const part of parts) {
    const direct = resolveClub(part, challenge);
    if (direct.kind !== 'unknown') {
      output.push({ input: part, ...direct });
      continue;
    }
    const words = normalize(part).split(' ');
    let unknown: string[] = [];
    const flush = () => {
      if (unknown.length) {
        const input = unknown.join(' ');
        output.push({ input, ...resolveClub(input, challenge) });
        unknown = [];
      }
    };
    for (let i = 0; i < words.length; ) {
      if (['and', 'و', '&'].includes(words[i] ?? '')) {
        flush();
        i++;
        continue;
      }
      let matched = false;
      for (let n = Math.min(6, words.length - i); n > 0; n--) {
        const candidate = words.slice(i, i + n).join(' ');
        const key = resolveAliasKey(aliasMap, candidate);
        const matches = key ? aliasMap.get(key) : undefined;
        if (matches) {
          flush();
          output.push({ input: candidate, ...choose(matches, challenge) });
          i += n;
          matched = true;
          break;
        }
      }
      if (!matched) {
        unknown.push(words[i] ?? '');
        i++;
      }
    }
    flush();
  }
  return output;
}
export function durationForTarget(target: Level) {
  return target * 6;
}
const scopes: { id: string; scope: Scope; difficulty: 'easy' | 'medium' }[] = [
  ...Object.keys(countries).map(
    (country) =>
      ({
        id: country,
        scope: { kind: 'country', country } satisfies Scope,
        difficulty: ['england', 'spain', 'italy', 'germany', 'france'].includes(country)
          ? 'easy'
          : 'medium',
      }) satisfies { id: string; scope: Scope; difficulty: 'easy' | 'medium' },
  ),
  ...['b', 'a', 's', 'm', 'c'].map(
    (letter) =>
      ({
        id: `letter-${letter}`,
        scope: { kind: 'letter', letter } satisfies Scope,
        difficulty: 'medium',
      }) satisfies { id: string; scope: Scope; difficulty: 'medium' },
  ),
  ...(
    ['europe', 'asia', 'africa', 'americas'] satisfies ('europe' | 'asia' | 'africa' | 'americas')[]
  ).map(
    (region) =>
      ({
        id: region,
        scope: { kind: 'region', region } satisfies Scope,
        difficulty: 'medium',
      }) satisfies { id: string; scope: Scope; difficulty: 'medium' },
  ),
];
export function challengesForLevel(target: Level): [Challenge, ...Challenge[]] {
  return [
    { id: 'world', scope: { kind: 'world' }, difficulty: 'easy', target },
    ...scopes.filter((c) => eligibleClubs(c).length >= target).map((c) => ({ ...c, target })),
  ];
}
export function dayKey(now: Date) {
  return now.toISOString().slice(0, 10);
}
export function dailyChallenge(now: Date, target: Level = 10) {
  const day = Math.floor(Date.parse(dayKey(now)) / 86400000);
  const pool = challengesForLevel(target);
  const index = (((day - 20740) % pool.length) + pool.length) % pool.length;
  return { challenge: pool[index] ?? pool[0], key: dayKey(now), number: Math.max(1, day - 20739) };
}
export function dailyStorageKey(session: { day: string; challenge: Challenge }) {
  return `nxc-v2-daily-${session.day}-${session.challenge.target}`;
}
export function scoreAnswers(
  found: readonly ClubId[],
  results: readonly ParsedAnswer[],
  target: Level,
) {
  const next = [...found];
  const events: AnswerEvent[] = [];
  for (const result of results) {
    if (next.length >= target) {
      break;
    }
    if (result.kind !== 'match') {
      events.push(result);
    } else if (next.includes(result.club.id)) {
      events.push({ ...result, kind: 'duplicate' });
    } else {
      next.push(result.club.id);
      events.push({ ...result, kind: 'accepted' });
    }
  }
  return { found: next, events };
}
export function remainingSeconds(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function resolveAliasKey(aliasMap: Map<string, unknown>, candidate: string): string | null {
  if (aliasMap.has(candidate)) {
    return candidate;
  }
  if (candidate.startsWith('و') && aliasMap.has(candidate.slice(1))) {
    return candidate.slice(1);
  }
  return null;
}
