import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Resolution } from './engine';
import {
  challengesForLevel,
  clubs,
  eligibleClubs,
  levels,
  normalize,
  parseAnswers,
  resolveClub,
  scoreAnswers,
} from './engine';
import { clubsNamedExactly } from './matching/aliases';

/** A shared name such as "Sheffield" cannot pick one club by itself, even inside its own country. */
function isSharedNameOf(name: string, clubId: string) {
  const namedClubs = clubsNamedExactly(normalize(name)) ?? [];

  return namedClubs.length > 1 && namedClubs.some((club) => club.id === clubId);
}

function matchClub(result: Resolution) {
  assert.ok(result.kind === 'match');
  return result.club;
}

test('English aliases, punctuation and Arabic spellings resolve to one club', () => {
  for (const input of [
    'Manchester United',
    'MAN UTD!!!',
    'Man U',
    'Manchester United FC',
    'Manchester United Football Club',
    'M.U.F.C.',
    'مانشستر يونايتد',
    'مَانْشِسْتَر يُونَايْتِد',
    'مانشستر يونيتد',
    'نادي مانشستر يونايتد',
  ]) {
    assert.equal(matchClub(resolveClub(input)).name, 'Manchester United', input);
  }
});

test('Arabic normalization handles diacritics, hamza, tatweel and Arabic ya', () => {
  assert.equal(normalize('أَهْلِــي'), 'اهلي');
  assert.equal(normalize('تشيلسى'), 'تشيلسي');
  assert.equal(matchClub(resolveClub('إشْبِيلِيَّة')).name, 'Sevilla');
});

test('small, clear typos are tolerated and short guesses are not', () => {
  assert.equal(matchClub(resolveClub('manchster united')).name, 'Manchester United');
  assert.equal(matchClub(resolveClub('arsenl')).name, 'Arsenal');
  assert.equal(
    matchClub(resolveClub('برشلونه', { scope: { kind: 'country', country: 'spain' } })).name,
    'Barcelona',
  );
  assert.equal(resolveClub('ps').kind, 'unknown');
  assert.equal(resolveClub('zzzzzzzzzz').kind, 'unknown');
});

test('shared Arabic names require clarification outside a specific country', () => {
  assert.equal(resolveClub('الأهلي').kind, 'ambiguous');
  assert.equal(
    matchClub(resolveClub('الأهلي', { scope: { kind: 'country', country: 'egypt' } })).name,
    'Al Ahly',
  );
  assert.equal(
    matchClub(resolveClub('الأهلي', { scope: { kind: 'country', country: 'saudi' } })).name,
    'Al Ahli Saudi',
  );
  assert.equal(resolveClub('النصر').kind, 'ambiguous');
  assert.equal(
    matchClub(resolveClub('النصر', { scope: { kind: 'country', country: 'uae' } })).name,
    'Al Nasr Dubai',
  );
  assert.equal(
    resolveClub('united', { scope: { kind: 'country', country: 'england' } }).kind,
    'ambiguous',
  );
});

test('known clubs from the wrong country do not count', () => {
  assert.equal(
    resolveClub('Juventus', { scope: { kind: 'country', country: 'england' } }).kind,
    'wrong-category',
  );
  assert.equal(
    resolveClub('الزمالك', { scope: { kind: 'country', country: 'saudi' } }).kind,
    'wrong-category',
  );
});

test('comma, newline, numbered and bilingual lists match actual club identities', () => {
  const inputs = [
    'juve, inter and ac milan',
    '1. juve\n2. inter\n3. ac milan',
    'يوفنتوس، إنتر ميلان، ميلان',
    'juve inter ac milan',
  ];
  for (const input of inputs) {
    assert.deepEqual(
      parseAnswers(input, { scope: { kind: 'country', country: 'italy' } }).map(
        (result) => matchClub(result).name,
      ),
      ['Juventus', 'Inter Milan', 'AC Milan'],
      input,
    );
  }
  assert.deepEqual(
    parseAnswers('ارسنال وتشيلسي وليفربول', { scope: { kind: 'country', country: 'england' } }).map(
      (result) => matchClub(result).name,
    ),
    ['Arsenal', 'Chelsea', 'Liverpool'],
  );
  assert.deepEqual(
    parseAnswers('١. أرسنال\n٢. تشيلسي', { scope: { kind: 'country', country: 'england' } }).map(
      (result) => matchClub(result).name,
    ),
    ['Arsenal', 'Chelsea'],
  );
});

test('an official name containing and remains one answer', () => {
  assert.deepEqual(
    parseAnswers('Brighton and Hove Albion').map((result) => matchClub(result).name),
    ['Brighton & Hove Albion'],
  );
});

test('duplicate aliases retain the same ID for deduplication', () => {
  assert.equal(
    new Set(parseAnswers('man utd, مانشستر يونايتد, man u').map((result) => matchClub(result).id))
      .size,
    1,
  );
});

test('every selectable challenge has enough clubs to finish its level', () => {
  assert.deepEqual(levels, [10, 50, 100]);
  for (const target of levels) {
    const pool = challengesForLevel(target);
    assert.ok(pool.length > 1);
    for (const challenge of pool) {
      assert.ok(eligibleClubs(challenge).length >= target, `${target}: ${challenge.id}`);
    }
  }
});

test('country challenges exist exactly for countries with enough clubs for the level', () => {
  const clubCounts = new Map<string, number>();

  for (const club of clubs) {
    clubCounts.set(club.country, (clubCounts.get(club.country) ?? 0) + 1);
  }

  for (const target of levels) {
    const offered = challengesForLevel(target)
      .flatMap((challenge) => (challenge.scope.kind === 'country' ? challenge.scope.country : []))
      .sort();
    const expected = [...clubCounts]
      .filter(([, clubCount]) => clubCount >= target)
      .map(([country]) => country)
      .sort();

    assert.deepEqual(offered, expected, `level ${target}`);
  }
});

test('every canonical club name resolves in its own country in both languages', () => {
  for (const club of clubs) {
    for (const name of [club.name, club.arabic]) {
      const result = resolveClub(name, { scope: { kind: 'country', country: club.country } });
      const isSharedName = result.kind === 'ambiguous' && isSharedNameOf(name, club.id);

      assert.ok(isSharedName || ('club' in result && result.club.id === club.id), name);
    }
  }
});

/** Clubs whose English and Arabic names each mean only them anywhere in the world. */
const unambiguousClubs = clubs.filter((club) =>
  [club.name, club.arabic].every((name) => {
    const result = resolveClub(name);

    return result.kind === 'match' && result.club.id === club.id;
  }),
);

for (const target of levels) {
  test(`the ${target}-club level counts unique answers in order and caps bulk submissions`, () => {
    const input = unambiguousClubs
      .slice(0, target + 3)
      .map((club) => club.name)
      .join(', ');
    const results = parseAnswers(input);
    const scored = scoreAnswers([], results, target);
    assert.deepEqual(
      scored.found,
      unambiguousClubs.slice(0, target).map((club) => club.id),
    );
    assert.equal(scored.events.filter((event) => event.kind === 'accepted').length, target);
    const first = unambiguousClubs[0];
    const last = unambiguousClubs[target - 1];
    assert.ok(first && last);
    const repeated = scoreAnswers(
      scored.found.slice(0, -1),
      parseAnswers(`${first.arabic}, ${last.arabic}`),
      target,
    );
    assert.deepEqual(repeated.found, scored.found);
    assert.deepEqual(
      repeated.events.map((event) => event.kind),
      ['duplicate', 'accepted'],
    );
  });
}
