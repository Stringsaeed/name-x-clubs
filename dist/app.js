import { clubs, countries, levels, challengesForLevel, durationForTarget, dailyStorageKey, scoreAnswers, dailyChallenge, dayKey, eligibleClubs, parseAnswers, remainingSeconds } from './engine.js';
const $ = id => document.getElementById(id);
const messages = {
en: {
  daily:'Daily challenge', practice:'Practice', eyebrow:'A DAILY KICK FOR YOUR FOOTBALL BRAIN', hero1:'Know your clubs?', hero2:'Prove it.',
  heroDescription:'10, 50 or 100 clubs. How far can you go?<br>A little football, a lot of bragging rights.', heroNote:'Free to play. No sign-up. Just football.', artCaption:'your football knowledge, on the pitch.',
  onTheClock:'on the clock', inputHint:'Man Utd or مانشستر يونايتد. We speak football.', rules:'Nicknames & little typos welcome', start:'Let’s play', finish:'Finish round',
  keepItGoing:'KEEP THE BALL ROLLING', practiceTitle:'Just one more?', practiceDescription:'No timer. No pressure.<br>Just you and your football brain.', playPractice:'Play practice',
  howTitle:'The game plan', step1Title:'Read the challenge', step1Body:'A country, a letter, a little twist.', step2Title:'Type it your way', step2Body:'English, Arabic, nicknames. All good.', step3Title:'Complete your list', step3Body:'Beat the clock. Share the glory.',
  bilingual:'English & Arabic', freshDaily:'A fresh challenge every day', footer:'Made for the love of the game.', howToPlay:'How to play',
  helpTitle:'How many clubs have you got?', helpIntro:'Pick a level: 10, 50 or 100 clubs. Daily rounds give you 1, 5 or 10 minutes. Practice is untimed. Each accepted club appears at the bottom of your list.', helpExampleTitle:'One club, many ways to say it',
  help1:'Use English or Arabic, with or without accents. Small spelling mistakes are fine when the club is clear.', help2:'Send one name at a time, or a list separated by commas, newlines, or “and”.', help3:'If a name could mean more than one club, add the city or country. Different names for the same club only count once.', help4:'Daily challenges reset at midnight UTC. Your round and results are saved on this browser.', helpFootnote:'This first edition includes a curated club collection, not every club in the world. If we miss one, try its full name.', gotIt:'Got it. Let’s play.',
  pickCategory:'Pick your pitch', surprise:'Surprise me', dailyLabel:'THE DAILY CHALLENGE', practiceLabel:'THE PRACTICE ROUND', easy:'A good warm-up', medium:'A little trickier', yourClubs:'YOUR CLUBS', placeholder:'Type a club name…', submit:'Submit answer', noClock:'no clock', untimed:'Untimed', dailyDetail:(n,m)=>`${n} different clubs. ${m} minute${m===1?'':'s'} on the clock.`, practiceDetail:n=>`${n} different clubs. Take your time.`, letterDetail:'Use the club’s common English name.',
  countryTitle:(country,n)=>`Name ${n} clubs<br>from <span class="country-name">${country}.</span>`, worldTitle:n=>`Name <span class="country-name">${n} clubs.</span>`, letterTitle:(letter,n)=>`Name ${n} clubs<br>starting with <span class="country-name">${letter.toUpperCase()}.</span>`, regionTitle:(region,n)=>`Name ${n} clubs<br>from <span class="country-name">${region}.</span>`,
  regions:{europe:'Europe',asia:'Asia',africa:'Africa',americas:'the Americas'}, allClubs:'Anywhere in the world', surpriseCategory:'A random challenge',
  accepted:name=>`${name}. That’s one!`, duplicate:name=>`${name} is already on your list. Try another club.`, wrong:name=>`${name} is a club, but doesn’t fit this challenge.`, ambiguous:input=>`“${input}” could mean more than one club. Try the full name.`, unknown:input=>`We couldn’t match “${input}”. Try the full name or another spelling.`,
  winTitle:'You know ball.', winBody:(seconds,n)=>`${n} out of ${n}. ${seconds} seconds to spare.`, practiceWinBody:n=>`${n} out of ${n}. Nicely played.`, endTitle:'Good shift.', endBody:(count,n)=>`${count} out of ${n}. There’s always the next match.`, share:'Share result', again:'Another round', next:'Keep playing', moreAnswers:'A few you could have named', reset:'Next daily at 00:00 UTC', copied:'Result copied. Send it to your football friends.', copyManual:'Select and copy your result below.', shareTitle:'Name × Clubs', helpClose:'Close', inputLabel:'Type a club name in English or Arabic', roundFinished:'Round complete', practiceReady:'No clock, just football.', clubCount:count=>`${count} clubs and counting`, dailyChanged:'A new daily challenge is ready.', unsupportedStorage:'Your browser couldn’t save this round. Keep this tab open.',
},
ar: {
  daily:'تحدي اليوم', practice:'تدرّب', eyebrow:'جرعتك اليومية من كرة القدم', hero1:'تعرف الأندية؟', hero2:'ورّنا معرفتك.',
  heroDescription:'١٠، ٥٠ أو ١٠٠ نادٍ. وين توصل معرفتك؟<br>اختبر معلوماتك ونافس أصحابك.', heroNote:'مجاني. بدون تسجيل. كرة قدم وبس.', artCaption:'معلوماتك الكروية تنزل الملعب.',
  onTheClock:'الوقت المتبقي', inputHint:'مانشستر يونايتد أو Man Utd. نفهم لغة الكرة.', rules:'نقبل الاختصارات والأخطاء البسيطة', start:'يلا نلعب', finish:'إنهاء الجولة',
  keepItGoing:'خلّ الكرة تمشي', practiceTitle:'جولة زيادة؟', practiceDescription:'بدون مؤقت. بدون ضغط.<br>أنت ومعلوماتك الكروية وبس.', playPractice:'ابدأ التدريب',
  howTitle:'خطة اللعب', step1Title:'اقرأ التحدي', step1Body:'دولة، حرف، أو فكرة مختلفة.', step2Title:'اكتب بطريقتك', step2Body:'عربي، إنجليزي، أو اسم مختصر.', step3Title:'كمّل قائمتك', step3Body:'اسبق الوقت وشارك النتيجة.',
  bilingual:'بالعربية والإنجليزية', freshDaily:'تحدٍّ جديد كل يوم', footer:'صُنع من حبّ اللعبة.', howToPlay:'طريقة اللعب',
  helpTitle:'كم نادٍ تقدر تذكر؟', helpIntro:'اختر مستوى: ١٠، ٥٠ أو ١٠٠ نادٍ. تحدي اليوم يعطيك دقيقة، ٥ دقائق أو ١٠ دقائق حسب المستوى. التدريب بدون مؤقت. كل إجابة صحيحة تنضاف أسفل القائمة.', helpExampleTitle:'نادٍ واحد، بأكثر من طريقة',
  help1:'اكتب بالعربية أو الإنجليزية، بالتشكيل أو بدونه. نقبل الأخطاء الإملائية البسيطة إذا كان اسم النادي واضحًا.', help2:'اكتب اسمًا واحدًا كل مرة، أو عدة أسماء تفصل بينها فاصلة أو سطر جديد أو حرف الواو.', help3:'إذا كان الاسم يشير لأكثر من نادٍ، أضف المدينة أو الدولة. الأسماء المختلفة للنادي نفسه تُحسب مرة واحدة.', help4:'يتجدد تحدي اليوم عند منتصف الليل بتوقيت UTC. تُحفظ الجولة والنتيجة في هذا المتصفح.', helpFootnote:'هذه النسخة تضم مجموعة مختارة من الأندية، وليست كل أندية العالم. إذا لم نتعرف على اسم، جرّب الاسم الكامل.', gotIt:'فهمت. يلا نلعب.',
  pickCategory:'اختر ملعبك', surprise:'فاجئني', dailyLabel:'تحدي اليوم', practiceLabel:'جولة تدريب', easy:'إحماء خفيف', medium:'تحدي أصعب شوي', yourClubs:'قائمة أنديتك', placeholder:'اكتب اسم نادٍ…', submit:'إرسال الإجابة', noClock:'بدون وقت', untimed:'بدون مؤقت', dailyDetail:(n,m)=>`${n} ناديًا مختلفًا. الوقت: ${m===1?'دقيقة واحدة':`${m} دقائق`}.`, practiceDetail:n=>`${n} ناديًا مختلفًا. خذ راحتك.`, letterDetail:'نعتمد الاسم الإنجليزي الشائع للنادي.',
  countryTitle:(country,n)=>`اذكر ${n} ناديًا<br>من <span class="country-name">${country}.</span>`, worldTitle:n=>`اذكر <span class="country-name">${n} ناديًا.</span>`, letterTitle:(letter,n)=>`اذكر ${n} ناديًا<br>تبدأ بحرف <span class="country-name" dir="ltr">${letter.toUpperCase()}.</span>`, regionTitle:(region,n)=>`اذكر ${n} ناديًا<br>من <span class="country-name">${region}.</span>`,
  regions:{europe:'أوروبا',asia:'آسيا',africa:'أفريقيا',americas:'الأمريكتين'}, allClubs:'أي مكان في العالم', surpriseCategory:'تحدٍّ عشوائي',
  accepted:name=>`${name}. إجابة صحيحة!`, duplicate:name=>`${name} موجود في تشكيلتك. جرّب ناديًا ثانيًا.`, wrong:name=>`${name} نادٍ معروف، لكنه لا يناسب هذا التحدي.`, ambiguous:input=>`«${input}» ممكن يشير لأكثر من نادٍ. جرّب الاسم الكامل.`, unknown:input=>`ما تعرّفنا على «${input}». جرّب الاسم الكامل أو كتابة مختلفة.`,
  winTitle:'واضح إنك كروي!', winBody:(seconds,n)=>`${n} من ${n}. وباقي ${seconds} ثانية.`, practiceWinBody:n=>`${n} من ${n}. لعب نظيف!`, endTitle:'محاولة حلوة.', endBody:(count,n)=>`${count} من ${n}. الجاية أحلى.`, share:'شارك النتيجة', again:'جولة ثانية', next:'كمّل لعب', moreAnswers:'أندية كان ممكن تذكرها', reset:'التحدي القادم عند 00:00 UTC', copied:'نسخنا النتيجة. أرسلها لأصحابك الكرويين.', copyManual:'حدد النتيجة وانسخها من المربع.', shareTitle:'Name × Clubs', helpClose:'إغلاق', inputLabel:'اكتب اسم نادٍ بالعربية أو الإنجليزية', roundFinished:'انتهت الجولة', practiceReady:'بدون مؤقت، كرة وبس.', clubCount:count=>`${count} ناديًا وأكثر`, dailyChanged:'تحدي اليوم الجديد جاهز.', unsupportedStorage:'المتصفح لم يتمكن من حفظ الجولة. اترك هذه الصفحة مفتوحة.',
}
};
function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
let storageWarned = false;
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { if (!storageWarned) { storageWarned = true; showToast(t().unsupportedStorage); } } }
let lang = read('nxc-language') === 'ar' ? 'ar' : 'en';
const t = () => messages[lang];
let mode = 'daily';
let level = levels.includes(read('nxc-level')) ? read('nxc-level') : 10;
let challenge = dailyChallenge(new Date(), level);
function emptyState() { return { phase:'idle', found:[], deadline:null, remaining:durationForTarget(level) }; }
function loadDaily() {
  challenge = dailyChallenge(new Date(), level);
  const saved = read(dailyStorageKey(challenge));
  const ids = new Set(eligibleClubs(challenge).map(c => c.id));
  if (!saved || !['idle','playing','complete'].includes(saved.phase) || !Array.isArray(saved.found) || saved.found.length > level || new Set(saved.found).size !== saved.found.length || saved.found.some(id => !ids.has(id)) || !Number.isFinite(saved.remaining) || saved.remaining < 0 || saved.remaining > durationForTarget(level) || (saved.phase === 'playing' && !Number.isFinite(saved.deadline))) return emptyState();
  return saved;
}
let state = loadDaily();
let practiceCategory = 'world';
let feedback = [];
let feedbackError = false;
let toastTimer;
function persist() { if (mode === 'daily') save(dailyStorageKey(challenge), state); }
function clubName(club) { return lang === 'ar' ? club.arabic : club.name; }
function icon(name, cls = '') { return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`; }
function showToast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000); }
function escape(text) { return String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }
function timeLabel(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`; }
function title() {
  if (challenge.country) return t().countryTitle(countries[challenge.country][lang], level);
  if (challenge.letter) return t().letterTitle(challenge.letter, level);
  if (challenge.region) return t().regionTitle(t().regions[challenge.region], level);
  return t().worldTitle(level);
}
function applyLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const value = t()[el.dataset.i18n];
    if (typeof value === 'string') el.innerHTML = value;
  });
  $('language-button').querySelector('span').textContent = lang === 'en' ? 'العربية' : 'English';
  $('language-button').querySelector('span').lang = lang === 'en' ? 'ar' : 'en';
  $('language-button').setAttribute('aria-label', lang === 'en' ? 'Switch to Arabic' : 'Switch to English');
  $('help-button').setAttribute('aria-label', t().howToPlay);
  $('close-help').setAttribute('aria-label', t().helpClose);
  $('club-input').placeholder = t().placeholder;
  $('club-input').setAttribute('aria-label', t().inputLabel);
  $('submit-answer').setAttribute('aria-label', t().submit);
  $('practice-category').setAttribute('aria-label', t().pickCategory);
  $('club-count').textContent = t().clubCount(clubs.length);
  renderPracticeOptions();
  render();
}
function challengeName(c) {
  return c.country ? countries[c.country][lang] : c.region ? t().regions[c.region] : c.letter ? (lang === 'ar' ? `حرف ${c.letter.toUpperCase()}` : `Starting with ${c.letter.toUpperCase()}`) : t().allClubs;
}
function renderPracticeOptions() {
  const options = challengesForLevel(level).map(c => ({id:c.id,name:challengeName(c)}));
  options.push({id:'random',name:t().surpriseCategory});
  if (!options.some(c => c.id === practiceCategory)) practiceCategory = 'world';
  $('practice-category').innerHTML = options.map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('');
  $('practice-category').value = practiceCategory;
}
function renderLevels() {
  $('level-picker').setAttribute('aria-label',lang === 'ar' ? 'اختر المستوى' : 'Choose a level');
  $('level-picker').innerHTML = levels.map((n,i) => `<button type="button" class="level-button ${n===level?'active':''}" data-level="${n}" aria-pressed="${n===level}"><span class="level-kicker">${lang==='ar'?'المستوى':'LEVEL'} ${String(i+1).padStart(2,'0')}</span><strong>${lang==='ar'?`اذكر ${n} ناديًا`:`Name ${n} clubs`}</strong></button>`).join('');
}
function renderAnswers() {
  const list = $('answer-list');
  const rows = Array.from(list.children);
  if (list.dataset.language !== lang || rows.length > state.found.length || rows.some((row,i) => row.dataset.clubId !== state.found[i])) list.replaceChildren();
  list.dataset.language = lang;
  const added = state.found.length > list.children.length;
  const colors = ['#b57763','#71916b','#6587a7','#bca05e','#9a7b9d','#759c94'];
  for (let i = list.children.length; i < state.found.length; i++) {
    const club = clubs.find(c => c.id === state.found[i]);
    const initials = club.name.replace(/^(AC |AS |Al |FC |RB )/,'').split(' ').map(s => s[0]).slice(0,2).join('');
    const hash = club.name.split('').reduce((n,c) => n+c.charCodeAt(0),0);
    const row = document.createElement('li');
    row.className = 'answer-message'; row.dataset.clubId = club.id;
    row.innerHTML = `<span class="answer-index">${String(i+1).padStart(2,'0')}</span><span class="club-crest" style="--club-color:${colors[hash%colors.length]}" aria-hidden="true">${initials}</span><span class="answer-name"><strong lang="${lang}">${escape(clubName(club))}</strong><small>${escape(countries[club.country][lang])}</small></span><span class="answer-tick">${icon('check')}</span>`;
    list.append(row);
  }
  $('found-count').textContent = state.found.length;
  $('target-count').textContent = ` / ${level}`;
  $('round-progress').max = level; $('round-progress').value = state.found.length;
  $('answer-list').setAttribute('aria-label',t().yourClubs);
  $('round-progress').setAttribute('aria-label',t().yourClubs);
  $('chat-empty').hidden = state.found.length > 0 || state.phase === 'complete';
  $('empty-title').textContent = lang === 'ar' ? 'الملعب لك.' : 'The pitch is yours.';
  $('empty-description').textContent = state.phase === 'idle' ? (lang==='ar'?'ابدأ الجولة، ثم اكتب أول نادٍ.':'Start the round, then send your first club.') : (lang==='ar'?'ابدأ بأي نادٍ تعرفه. إجاباتك تنضاف هنا.':'Start with a club you know. Your answers appear here.');
  if (added) $('conversation').scrollTop = $('conversation').scrollHeight;
}
function renderTimer() {
  const seconds = state.phase === 'playing' && mode === 'daily' ? remainingSeconds(state.deadline) : state.remaining;
  $('timer-text').textContent = mode === 'practice' ? '∞' : timeLabel(seconds);
  $('timer-caption').textContent = mode === 'practice' ? t().noClock : t().onTheClock;
  $('timer').classList.toggle('running', state.phase === 'playing' && mode === 'daily');
  $('timer').classList.toggle('urgent', seconds <= 10 && state.phase === 'playing' && mode === 'daily');
  $('timer').setAttribute('aria-label', mode === 'practice' ? t().untimed : `${seconds} ${lang === 'ar' ? 'ثانية متبقية' : 'seconds remaining'}`);
}
function renderFeedback() {
  $('answer-feedback').replaceChildren();
  feedback.forEach(f => { const line = document.createElement('div'); line.className = 'feedback-line'; line.textContent = f; $('answer-feedback').append(line); });
  $('answer-feedback').classList.toggle('error', feedbackError);
}
function render() {
  const practice = mode === 'practice';
  $('nav-daily').classList.toggle('active', !practice);
  $('nav-practice').classList.toggle('active', practice);
  $('nav-daily').setAttribute('aria-current', practice ? 'false' : 'page');
  $('nav-practice').setAttribute('aria-current', practice ? 'page' : 'false');
  $('mode-icon').setAttribute('href', practice ? '#i-shuffle' : '#i-sun');
  $('mode-label').textContent = practice ? t().practiceLabel : t().dailyLabel;
  $('challenge-number').textContent = practice ? '' : `#${String(challenge.number).padStart(3,'0')}`;
  $('date-label').textContent = practice ? t().untimed : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day:'numeric', month:'short', timeZone:'UTC' }).format(new Date(`${challenge.key}T12:00:00Z`));
  $('practice-controls').hidden = !practice;
  $('difficulty-text').textContent = challenge.difficulty === 'medium' ? t().medium : t().easy;
  $('challenge-title').innerHTML = title();
  $('challenge-detail').textContent = (practice ? t().practiceDetail(level) : t().dailyDetail(level,durationForTarget(level)/60)) + (challenge.letter ? ` ${t().letterDetail}` : '');
  $('progress-label').textContent = t().yourClubs;
  renderLevels();
  document.body.classList.toggle('round-active',state.phase === 'playing');
  updateViewport();
  const playing = state.phase === 'playing';
  $('club-input').disabled = !playing;
  $('submit-answer').disabled = !playing;
  $('club-input').closest('.input-wrapper').classList.toggle('inactive', !playing);
  $('answer-form').hidden = state.phase === 'complete';
  $('answer-composer').hidden = state.phase === 'complete';
  $('start-button').hidden = state.phase !== 'idle';
  $('finish-button').hidden = !playing;
  $('result-panel').hidden = state.phase !== 'complete';
  renderAnswers(); renderTimer(); renderFeedback();
  if (state.phase === 'complete') renderResult();
}
function renderResult() {
  const won = state.found.length === level;
  const spare = state.remaining;
  const others = eligibleClubs(challenge).filter(c => !state.found.includes(c.id)).slice(0,6);
  $('result-panel').innerHTML = `<div class="result-header"><span class="result-icon ${won ? 'celebrate' : ''}">${icon(won ? 'trophy' : 'ball')}</span><div><h3>${won ? t().winTitle : t().endTitle}</h3><p>${escape(won ? mode === 'practice' ? t().practiceWinBody(level) : t().winBody(spare,level) : t().endBody(state.found.length,level))}</p></div></div>${!won && others.length ? `<div class="missed-answers"><strong>${t().moreAnswers}</strong><div class="missed-list">${others.map(c => `<span>${escape(clubName(c))}</span>`).join('')}</div></div>` : ''}<div class="result-actions"><button class="button button-primary" id="share-button" type="button">${icon('share')}<span>${t().share}</span></button><button class="button button-outline" id="next-button" type="button"><span>${mode === 'practice' ? t().again : t().next}</span>${icon('arrow')}</button></div>${mode === 'daily' ? `<div class="next-reset">${icon('sun')}<span>${t().reset}</span></div>` : ''}`;
  $('share-button').addEventListener('click', shareResult);
  $('next-button').addEventListener('click', () => { if (mode === 'daily') switchPractice(); else newPractice(practiceCategory); });
}
function startRound() {
  if (state.phase !== 'idle') return;
  state.phase = 'playing';
  state.deadline = mode === 'daily' ? Date.now()+durationForTarget(level)*1000 : null;
  feedback = []; persist(); render(); $('club-input').focus();
}
function finishRound() {
  if (state.phase !== 'playing') return;
  state.remaining = mode === 'daily' ? remainingSeconds(state.deadline) : durationForTarget(level);
  state.phase = 'complete';
  feedback = [];
  persist(); render();
  $('club-input').blur();
  $('share-button')?.focus({ preventScroll:true });
  scrollToGame();
}
function submitAnswer(event) {
  event.preventDefault();
  if (state.phase !== 'playing') return;
  if (mode === 'daily' && !remainingSeconds(state.deadline)) { finishRound(); return; }
  const value = $('club-input').value.trim();
  if (!value) return;
  const scored = scoreAnswers(state.found, parseAnswers(value, challenge), level);
  state.found = scored.found;
  const anyAccepted = scored.events.some(e => e.kind === 'accepted');
  feedbackError = scored.events.some(e => e.kind !== 'accepted');
  // Accepted names live in the conversation. Keep the composer feedback brief.
  feedback = scored.events.filter(e => e.kind !== 'accepted').slice(-3).map(e => e.kind === 'duplicate' ? t().duplicate(clubName(e.club)) : e.kind === 'wrong-category' ? t().wrong(clubName(e.club)) : e.kind === 'ambiguous' ? t().ambiguous(e.input) : t().unknown(e.input));
  if (anyAccepted) $('club-input').value = '';
  else $('club-input').select();
  if (state.found.length === level) { finishRound(); return; }
  persist(); renderAnswers(); renderFeedback(); $('club-input').focus();
}
function scrollToGame() { if (window.matchMedia('(max-width: 760px)').matches) $('game-card').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'}); }
function switchDaily() { if (mode === 'daily') return; mode = 'daily'; state = loadDaily(); feedback = []; feedbackError = false; $('club-input').value = ''; render(); tick(); scrollToGame(); }
function newPractice(category = practiceCategory) {
  renderPracticeOptions();
  const pool = challengesForLevel(level);
  practiceCategory = pool.some(c => c.id === category) || category === 'random' ? category : 'world';
  if (practiceCategory === 'random') {
    const alternatives = pool.filter(c => c.id !== challenge.id);
    challenge = { ...alternatives[Math.floor(Math.random()*alternatives.length)] };
  } else challenge = { ...pool.find(c => c.id === practiceCategory) };
  state = emptyState(); feedback = []; feedbackError = false; $('club-input').value = '';
  $('practice-category').value = practiceCategory;
  render();
  scrollToGame();
}
function changeLevel(next) {
  if (!levels.includes(next) || next === level) return;
  persist(); level = next; save('nxc-level',level);
  feedback = []; feedbackError = false; $('club-input').value = '';
  if (mode === 'daily') { state = loadDaily(); render(); tick(); }
  else newPractice(practiceCategory);
  scrollToGame();
}
function switchPractice() { if (mode === 'practice') { scrollToGame(); return; } persist(); mode = 'practice'; newPractice(practiceCategory); scrollToGame(); }
function tick() {
  if (mode !== 'daily') return;
  if (challenge.key !== dayKey()) { state = loadDaily(); feedback = []; render(); showToast(t().dailyChanged); }
  if (state.phase === 'playing') { if (!remainingSeconds(state.deadline)) finishRound(); else renderTimer(); }
}
async function shareResult() {
  const filled = Math.round(state.found.length / level * 10);
  const squares = '🟩'.repeat(filled)+'⬜'.repeat(10-filled);
  const heading = $('challenge-title').innerText.replace(/\s+/g,' ').trim();
  const url = location.origin;
  const text = `name × clubs. ${mode === 'daily' ? `#${String(challenge.number).padStart(3,'0')} · ${challenge.key}` : t().practice}\n${heading}\n${squares} ${state.found.length}/${level}${mode === 'daily' && state.found.length === level ? ` · ${durationForTarget(level)-state.remaining}s` : ''}\n${url}`;
  try {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) { await navigator.share({title:t().shareTitle,text}); return; }
    if (!navigator.clipboard) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text); showToast(t().copied);
  } catch (error) {
    if (error.name === 'AbortError') return;
    let box = $('share-copy-box');
    if (!box) { box = document.createElement('textarea'); box.id = 'share-copy-box'; box.className = 'copy-box'; box.readOnly = true; box.rows = 5; box.setAttribute('aria-label',t().share); $('result-panel').append(box); }
    box.value = text; box.focus(); box.select(); showToast(t().copyManual);
  }
}
function openHelp() { $('help-dialog').showModal(); }
$('language-button').addEventListener('click', () => { lang = lang === 'en' ? 'ar' : 'en'; save('nxc-language',lang); feedback = []; applyLanguage(); });
$('nav-daily').addEventListener('click',switchDaily);
$('nav-practice').addEventListener('click',switchPractice);
$('practice-cta').addEventListener('click',switchPractice);
$('level-picker').addEventListener('click',event => { const button = event.target.closest('[data-level]'); if (button) changeLevel(Number(button.dataset.level)); });
$('practice-category').addEventListener('change',event => newPractice(event.target.value));
$('shuffle-button').addEventListener('click',() => newPractice('random'));
$('start-button').addEventListener('click',startRound);
$('finish-button').addEventListener('click',finishRound);
$('answer-form').addEventListener('submit',submitAnswer);
$('help-button').addEventListener('click',openHelp);
$('footer-help').addEventListener('click',openHelp);
$('close-help').addEventListener('click',() => $('help-dialog').close());
$('help-done').addEventListener('click',() => $('help-dialog').close());
$('help-dialog').addEventListener('click',event => { if (event.target === $('help-dialog')) { const r = $('help-dialog').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('help-dialog').close(); } });
document.addEventListener('visibilitychange',() => { if (!document.hidden) tick(); });
window.addEventListener('storage', event => { if (mode === 'daily' && event.key === dailyStorageKey(challenge)) { state = loadDaily(); feedback = []; render(); tick(); } });
function updateViewport() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--play-height',`${height}px`);
  document.body.classList.toggle('keyboard-open',state.phase === 'playing' && height < window.innerHeight - 100);
}
window.visualViewport?.addEventListener('resize',updateViewport);
window.addEventListener('resize',updateViewport);
applyLanguage(); tick(); setInterval(tick,250);
