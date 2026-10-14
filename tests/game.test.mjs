import test from 'node:test';
import assert from 'node:assert/strict';
import { clubs, normalize, resolveClub, parseAnswers, challengePool, eligibleClubs, dailyChallenge, dayKey, remainingSeconds } from '../dist/engine.js';
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
test('every challenge has at least five distinct eligible clubs', () => {
  for (const c of challengePool) assert.ok(eligibleClubs(c).length>=5,c.id);
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
