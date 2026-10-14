import test from 'node:test';
import assert from 'node:assert/strict';
import { clubs, normalize, resolveClub, parseAnswers, levels, challengesForLevel, durationForTarget, dailyStorageKey, scoreAnswers, eligibleClubs, dailyChallenge, dayKey, remainingSeconds } from '../dist/engine.js';
test('English aliases, punctuation and Arabic spellings resolve to one club', () => {
  for (const input of ['Manchester United', 'MAN UTD!!!', 'Man U', 'Manchester United FC', 'Manchester United Football Club', 'M.U.F.C.', 'مانشستر يونايتد', 'مَانْشِسْتَر يُونَايْتِد', 'مانشستر يونيتد', 'نادي مانشستر يونايتد']) assert.equal(resolveClub(input).club?.name, 'Manchester United', input);
});
test('Arabic normalization handles diacritics, hamza, tatweel and Arabic ya', () => {
  assert.equal(normalize('أَهْلِــي'), 'اهلي');
  assert.equal(normalize('تشيلسى'), 'تشيلسي');
  assert.equal(resolveClub('إشْبِيلِيَّة').club?.name, 'Sevilla');
});
test('small, clear typos are tolerated and short guesses are not', () => {
  assert.equal(resolveClub('manchster united').club?.name, 'Manchester United');
  assert.equal(resolveClub('arsenl').club?.name, 'Arsenal');
  assert.equal(resolveClub('برشلونه').club?.name, 'Barcelona');
  assert.equal(resolveClub('ps').kind, 'unknown');
  assert.equal(resolveClub('zzzzzzzzzz').kind, 'unknown');
});
test('shared Arabic names require clarification outside a specific country', () => {
  assert.equal(resolveClub('الأهلي').kind, 'ambiguous');
  assert.equal(resolveClub('الأهلي', {country:'egypt'}).club?.name, 'Al Ahly');
  assert.equal(resolveClub('الأهلي', {country:'saudi'}).club?.name, 'Al Ahli Saudi');
  assert.equal(resolveClub('النصر').kind, 'ambiguous');
  assert.equal(resolveClub('النصر', {country:'uae'}).club?.name, 'Al Nasr Dubai');
  assert.equal(resolveClub('united', {country:'england'}).kind, 'ambiguous');
});
test('known clubs from the wrong country do not count', () => {
  assert.equal(resolveClub('Juventus',{country:'england'}).kind,'wrong-category');
  assert.equal(resolveClub('الزمالك',{country:'saudi'}).kind,'wrong-category');
});
test('comma, newline, numbered and bilingual lists match actual club identities', () => {
  const inputs = ['juve, inter and ac milan','1. juve\n2. inter\n3. ac milan','يوفنتوس، إنتر ميلان، ميلان','juve inter ac milan'];
  for (const input of inputs) assert.deepEqual(parseAnswers(input,{country:'italy'}).map(r => r.club?.name),['Juventus','Inter Milan','AC Milan'],input);
  assert.deepEqual(parseAnswers('ارسنال وتشيلسي وليفربول',{country:'england'}).map(r=>r.club?.name),['Arsenal','Chelsea','Liverpool']);
  assert.deepEqual(parseAnswers('١. أرسنال\n٢. تشيلسي',{country:'england'}).map(r=>r.club?.name),['Arsenal','Chelsea']);
});
test('an official name containing and remains one answer', () => {
  assert.deepEqual(parseAnswers('Brighton and Hove Albion').map(r=>r.club?.name),['Brighton & Hove Albion']);
});
test('duplicate aliases retain the same ID for deduplication', () => {
  assert.equal(new Set(parseAnswers('man utd, مانشستر يونايتد, man u').map(r=>r.club.id)).size,1);
});
test('every selectable challenge has enough clubs to finish its level', () => {
  assert.deepEqual(levels,[10,50,100]);
  for (const target of levels) {
    const pool = challengesForLevel(target);
    assert.ok(pool.length > 1);
    for (const c of pool) assert.ok(eligibleClubs(c).length >= target,`${target}: ${c.id}`);
  }
  assert.ok(!challengesForLevel(100).some(c=>c.country));
  assert.equal(new Set(clubs.map(c=>c.id)).size,clubs.length);
  assert.ok(clubs.length>=200);
  assert.ok(clubs.every(c=>c.name && c.arabic && c.country));
});
test('every canonical club name resolves in its own country in both languages', () => {
  for (const c of clubs) for (const name of [c.name,c.arabic]) assert.equal(resolveClub(name,{country:c.country}).club?.id,c.id,name);
});
test('daily challenge is stable across time zones and changes at UTC midnight', () => {
  assert.equal(dayKey(new Date('2026-10-14T03:00:00+04:00')),'2026-10-13');
  assert.equal(dailyChallenge(new Date('2026-10-14T00:01:00Z')).id,dailyChallenge(new Date('2026-10-14T23:59:59Z')).id);
  assert.notEqual(dailyChallenge(new Date('2026-10-14T23:59:59Z')).id,dailyChallenge(new Date('2026-10-15T00:00:00Z')).id);
});
test('deadline uses wall-clock time and expires even while the tab is inactive', () => {
  assert.equal(remainingSeconds(61000,1000),60);
  assert.equal(remainingSeconds(61000,60501),1);
  assert.equal(remainingSeconds(61000,61000),0);
  assert.equal(remainingSeconds(61000,90000),0);
});
for (const target of [10,50,100]) test(`the ${target}-club level counts unique answers in order and caps bulk submissions`, () => {
  const input = clubs.slice(0,target+3).map(c=>c.name).join(', ');
  const results = parseAnswers(input);
  const scored = scoreAnswers([],results,target);
  assert.deepEqual(scored.found,clubs.slice(0,target).map(c=>c.id));
  assert.equal(scored.events.filter(e=>e.kind==='accepted').length,target);
  const repeated = scoreAnswers(scored.found.slice(0,-1),parseAnswers(`${clubs[0].arabic}, ${clubs[target-1].arabic}`),target);
  assert.deepEqual(repeated.found,scored.found);
  assert.deepEqual(repeated.events.map(e=>e.kind),['duplicate','accepted']);
});
test('daily rounds have separate storage and sensible deadlines for each level', () => {
  assert.deepEqual(levels.map(durationForTarget),[60,300,600]);
  const now = new Date('2026-10-14T00:01:00Z');
  const daily = levels.map(n=>dailyChallenge(now,n));
  assert.deepEqual(daily.map(c=>c.target),[10,50,100]);
  assert.equal(new Set(daily.map(dailyStorageKey)).size,3);
  for (const n of levels) for (let day=1;day<=31;day++) {
    const challenge = dailyChallenge(new Date(`2026-10-${String(day).padStart(2,'0')}T12:00:00Z`),n);
    assert.ok(eligibleClubs(challenge).length>=n);
  }
});
