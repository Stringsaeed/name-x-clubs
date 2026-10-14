import { clubs, countries, challengePool, dailyChallenge, dayKey, eligibleClubs, parseAnswers, remainingSeconds } from './engine.js';
const $ = id => document.getElementById(id);
const messages = {
en: {
  daily:'Daily challenge', practice:'Practice', eyebrow:'A DAILY KICK FOR YOUR FOOTBALL BRAIN', hero1:'Know your clubs?', hero2:'Prove it.',
  heroDescription:'Five clubs. One minute. A fresh challenge every day.<br>A little football, a lot of bragging rights.', heroNote:'Free to play. No sign-up. Just football.', artCaption:'your football knowledge, on the pitch.',
  onTheClock:'on the clock', inputHint:'Man Utd or مانشستر يونايتد. We speak football.', rules:'Nicknames & little typos welcome', start:'Let’s play', finish:'Finish round',
  keepItGoing:'KEEP THE BALL ROLLING', practiceTitle:'Just one more?', practiceDescription:'No timer. No pressure.<br>Just you and your football brain.', playPractice:'Play practice',
  howTitle:'The game plan', step1Title:'Read the challenge', step1Body:'A country, a letter, a little twist.', step2Title:'Type it your way', step2Body:'English, Arabic, nicknames. All good.', step3Title:'Make it five', step3Body:'Beat the clock. Share the glory.',
  bilingual:'English & Arabic', freshDaily:'A fresh challenge every day', footer:'Made for the love of the game.', howToPlay:'How to play',
  helpTitle:'Football knowledge. Five at a time.', helpIntro:'Name five different clubs that fit the challenge. The daily round gives you 60 seconds. Practice is untimed.', helpExampleTitle:'One club, many ways to say it',
  help1:'Use English or Arabic, with or without accents. Small spelling mistakes are fine when the club is clear.', help2:'Send one name at a time, or a list separated by commas, newlines, or “and”.', help3:'If a name could mean more than one club, add the city or country. Different names for the same club only count once.', help4:'Daily challenges reset at midnight UTC. Your round and results are saved on this browser.', helpFootnote:'This first edition includes a curated club collection, not every club in the world. If we miss one, try its full name.', gotIt:'Got it. Let’s play.',
  pickCategory:'Pick your pitch', surprise:'Surprise me', dailyFive:'THE DAILY FIVE', practiceFive:'THE PRACTICE FIVE', easy:'A good warm-up', medium:'A little trickier', startingFive:'YOUR STARTING FIVE', yourFive:'YOUR FIVE CLUBS', placeholder:'Type a club name…', submit:'Submit answer', noClock:'no clock', untimed:'Untimed', dailyDetail:'Any five different clubs. You’ve got 60 seconds.', practiceDetail:'Any five different clubs. Take your time.', letterDetail:'Use the club’s common English name. Any five count.',
  countryTitle:country=>`Name 5 clubs<br>from <span class="country-name">${country}.</span>`, worldTitle:'Name <span class="country-name">any 5 clubs.</span>', letterTitle:letter=>`Name 5 clubs<br>starting with <span class="country-name">${letter.toUpperCase()}.</span>`, regionTitle:region=>`Name 5 clubs<br>from <span class="country-name">${region}.</span>`,
  regions:{europe:'Europe',asia:'Asia',africa:'Africa',americas:'the Americas'}, allClubs:'Anywhere in the world', surpriseCategory:'A random challenge',
  accepted:name=>`${name}. That’s one!`, duplicate:name=>`${name} is already in your five. Try another club.`, wrong:name=>`${name} is a club, but doesn’t fit this challenge.`, ambiguous:input=>`“${input}” could mean more than one club. Try the full name.`, unknown:input=>`We couldn’t match “${input}”. Try the full name or another spelling.`,
  winTitle:'You know ball.', winBody:seconds=>`Five out of five. ${seconds} seconds to spare.`, practiceWinBody:'Five out of five. Nicely played.', endTitle:'Good shift.', endBody:count=>`${count} out of 5. There’s always the next match.`, share:'Share result', again:'Another round', next:'Keep playing', moreAnswers:'A few you could have named', reset:'Next daily at 00:00 UTC', copied:'Result copied. Send it to your football friends.', copyManual:'Select and copy your result below.', shareTitle:'Name × Clubs', helpClose:'Close', inputLabel:'Type a club name in English or Arabic', roundFinished:'Round complete', practiceReady:'No clock, just football.', clubCount:count=>`${count} clubs and counting`, dailyChanged:'A new daily challenge is ready.', unsupportedStorage:'Your browser couldn’t save this round. Keep this tab open.',
},
ar: {
  daily:'تحدي اليوم', practice:'تدرّب', eyebrow:'جرعتك اليومية من كرة القدم', hero1:'تعرف الأندية؟', hero2:'ورّنا معرفتك.',
  heroDescription:'خمسة أندية. دقيقة واحدة. تحدٍّ جديد كل يوم.<br>اختبر معلوماتك ونافس أصحابك.', heroNote:'مجاني. بدون تسجيل. كرة قدم وبس.', artCaption:'معلوماتك الكروية تنزل الملعب.',
  onTheClock:'الوقت المتبقي', inputHint:'مانشستر يونايتد أو Man Utd. نفهم لغة الكرة.', rules:'نقبل الاختصارات والأخطاء البسيطة', start:'يلا نلعب', finish:'إنهاء الجولة',
  keepItGoing:'خلّ الكرة تمشي', practiceTitle:'جولة زيادة؟', practiceDescription:'بدون مؤقت. بدون ضغط.<br>أنت ومعلوماتك الكروية وبس.', playPractice:'ابدأ التدريب',
  howTitle:'خطة اللعب', step1Title:'اقرأ التحدي', step1Body:'دولة، حرف، أو فكرة مختلفة.', step2Title:'اكتب بطريقتك', step2Body:'عربي، إنجليزي، أو اسم مختصر.', step3Title:'كمّل الخمسة', step3Body:'اسبق الوقت وشارك النتيجة.',
  bilingual:'بالعربية والإنجليزية', freshDaily:'تحدٍّ جديد كل يوم', footer:'صُنع من حبّ اللعبة.', howToPlay:'طريقة اللعب',
  helpTitle:'معلوماتك الكروية. خمسة أندية كل مرة.', helpIntro:'اذكر خمسة أندية مختلفة تناسب التحدي. عندك ٦٠ ثانية في تحدي اليوم، والتدريب بدون مؤقت.', helpExampleTitle:'نادٍ واحد، بأكثر من طريقة',
  help1:'اكتب بالعربية أو الإنجليزية، بالتشكيل أو بدونه. نقبل الأخطاء الإملائية البسيطة إذا كان اسم النادي واضحًا.', help2:'اكتب اسمًا واحدًا كل مرة، أو عدة أسماء تفصل بينها فاصلة أو سطر جديد أو حرف الواو.', help3:'إذا كان الاسم يشير لأكثر من نادٍ، أضف المدينة أو الدولة. الأسماء المختلفة للنادي نفسه تُحسب مرة واحدة.', help4:'يتجدد تحدي اليوم عند منتصف الليل بتوقيت UTC. تُحفظ الجولة والنتيجة في هذا المتصفح.', helpFootnote:'هذه النسخة تضم مجموعة مختارة من الأندية، وليست كل أندية العالم. إذا لم نتعرف على اسم، جرّب الاسم الكامل.', gotIt:'فهمت. يلا نلعب.',
  pickCategory:'اختر ملعبك', surprise:'فاجئني', dailyFive:'خمسة اليوم', practiceFive:'خمسة للتدريب', easy:'إحماء خفيف', medium:'تحدي أصعب شوي', startingFive:'تشكيلتك الخماسية', yourFive:'أنديتك الخمسة', placeholder:'اكتب اسم نادٍ…', submit:'إرسال الإجابة', noClock:'بدون وقت', untimed:'بدون مؤقت', dailyDetail:'خمسة أندية مختلفة. عندك ٦٠ ثانية.', practiceDetail:'خمسة أندية مختلفة. خذ راحتك.', letterDetail:'نعتمد الاسم الإنجليزي الشائع للنادي. اذكر أي خمسة.',
  countryTitle:country=>`اذكر ٥ أندية<br>من <span class="country-name">${country}.</span>`, worldTitle:'اذكر <span class="country-name">أي ٥ أندية.</span>', letterTitle:letter=>`اذكر ٥ أندية<br>تبدأ بحرف <span class="country-name" dir="ltr">${letter.toUpperCase()}.</span>`, regionTitle:region=>`اذكر ٥ أندية<br>من <span class="country-name">${region}.</span>`,
  regions:{europe:'أوروبا',asia:'آسيا',africa:'أفريقيا',americas:'الأمريكتين'}, allClubs:'أي مكان في العالم', surpriseCategory:'تحدٍّ عشوائي',
  accepted:name=>`${name}. إجابة صحيحة!`, duplicate:name=>`${name} موجود في تشكيلتك. جرّب ناديًا ثانيًا.`, wrong:name=>`${name} نادٍ معروف، لكنه لا يناسب هذا التحدي.`, ambiguous:input=>`«${input}» ممكن يشير لأكثر من نادٍ. جرّب الاسم الكامل.`, unknown:input=>`ما تعرّفنا على «${input}». جرّب الاسم الكامل أو كتابة مختلفة.`,
  winTitle:'واضح إنك كروي!', winBody:seconds=>`خمسة من خمسة. وباقي ${seconds} ثانية.`, practiceWinBody:'خمسة من خمسة. لعب نظيف!', endTitle:'محاولة حلوة.', endBody:count=>`${count} من ٥. الجاية أحلى.`, share:'شارك النتيجة', again:'جولة ثانية', next:'كمّل لعب', moreAnswers:'أندية كان ممكن تذكرها', reset:'التحدي القادم عند 00:00 UTC', copied:'نسخنا النتيجة. أرسلها لأصحابك الكرويين.', copyManual:'حدد النتيجة وانسخها من المربع.', shareTitle:'Name × Clubs', helpClose:'إغلاق', inputLabel:'اكتب اسم نادٍ بالعربية أو الإنجليزية', roundFinished:'انتهت الجولة', practiceReady:'بدون مؤقت، كرة وبس.', clubCount:count=>`${count} ناديًا وأكثر`, dailyChanged:'تحدي اليوم الجديد جاهز.', unsupportedStorage:'المتصفح لم يتمكن من حفظ الجولة. اترك هذه الصفحة مفتوحة.',
}
};
function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
let storageWarned = false;
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { if (!storageWarned) { storageWarned = true; showToast(t().unsupportedStorage); } } }
let lang = read('nxc-language') === 'ar' ? 'ar' : 'en';
const t = () => messages[lang];
let mode = 'daily';
let challenge = dailyChallenge();
function emptyState() { return { phase:'idle', found:[], deadline:null, remaining:60 }; }
function loadDaily() {
  challenge = dailyChallenge();
  const saved = read(`nxc-daily-${challenge.key}`);
  const ids = new Set(eligibleClubs(challenge).map(c => c.id));
  if (!saved || !['idle','playing','complete'].includes(saved.phase) || !Array.isArray(saved.found) || saved.found.length > 5 || new Set(saved.found).size !== saved.found.length || saved.found.some(id => !ids.has(id)) || !Number.isFinite(saved.remaining) || saved.remaining < 0 || saved.remaining > 60 || (saved.phase === 'playing' && !Number.isFinite(saved.deadline))) return emptyState();
  return saved;
}
let state = loadDaily();
let practiceCategory = 'world';
let feedback = [];
let feedbackError = false;
let toastTimer;
function persist() { if (mode === 'daily') save(`nxc-daily-${challenge.key}`, state); }
function clubName(club) { return lang === 'ar' ? club.arabic : club.name; }
function icon(name, cls = '') { return `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`; }
function showToast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000); }
function escape(text) { return String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }
function timeLabel(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`; }
function title() {
  if (challenge.country) return t().countryTitle(countries[challenge.country][lang]);
  if (challenge.letter) return t().letterTitle(challenge.letter);
  if (challenge.region) return t().regionTitle(t().regions[challenge.region]);
  return t().worldTitle;
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
  const categoryOptions = [{id:'world', name:t().allClubs}, ...Object.entries(countries).map(([id,c]) => ({id, name:c[lang]})), {id:'random',name:t().surpriseCategory}];
  $('practice-category').innerHTML = categoryOptions.map(c => `<option value="${c.id}">${escape(c.name)}</option>`).join('');
  $('practice-category').value = practiceCategory;
  render();
}
function renderSlots() {
  const colors = ['#b57763','#71916b','#6587a7','#bca05e','#9a7b9d','#759c94'];
  $('answer-slots').innerHTML = Array.from({length:5}, (_,i) => {
    const club = clubs.find(c => c.id === state.found[i]);
    if (!club) return `<div class="answer-slot" aria-label="${lang === 'ar' ? 'مكان فارغ' : 'Empty answer'} ${i+1}"><span class="slot-number">${String(i+1).padStart(2,'0')}</span></div>`;
    const initials = club.name.replace(/^(AC |AS |Al |FC |RB )/,'').split(' ').map(s => s[0]).slice(0,2).join('');
    const hash = club.name.split('').reduce((n,c) => n+c.charCodeAt(0),0);
    return `<div class="answer-slot filled">${icon('check','slot-check')}<span class="club-crest" style="--club-color:${colors[hash%colors.length]}" aria-hidden="true">${initials}</span><span class="slot-name" lang="${lang}" title="${escape(clubName(club))}">${escape(clubName(club))}</span></div>`;
  }).join('');
  $('found-count').textContent = state.found.length;
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
  $('mode-label').textContent = practice ? t().practiceFive : t().dailyFive;
  $('challenge-number').textContent = practice ? '' : `#${String(challenge.number).padStart(3,'0')}`;
  $('date-label').textContent = practice ? t().untimed : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-AE' : 'en-GB', { day:'numeric', month:'short', timeZone:'UTC' }).format(new Date(`${challenge.key}T12:00:00Z`));
  $('practice-controls').hidden = !practice;
  $('difficulty-text').textContent = challenge.difficulty === 'medium' ? t().medium : t().easy;
  $('challenge-title').innerHTML = title();
  $('challenge-detail').textContent = challenge.letter ? t().letterDetail : practice ? t().practiceDetail : t().dailyDetail;
  $('progress-label').textContent = state.phase === 'complete' ? t().yourFive : t().startingFive;
  const playing = state.phase === 'playing';
  $('club-input').disabled = !playing;
  $('submit-answer').disabled = !playing;
  $('club-input').closest('.input-wrapper').classList.toggle('inactive', !playing);
  $('answer-form').hidden = state.phase === 'complete';
  $('game-bottom').hidden = state.phase === 'complete';
  $('start-button').hidden = state.phase !== 'idle';
  $('finish-button').hidden = !playing;
  $('game-rules').querySelector('span').textContent = playing && practice ? t().practiceReady : t().rules;
  $('result-panel').hidden = state.phase !== 'complete';
  renderSlots(); renderTimer(); renderFeedback();
  if (state.phase === 'complete') renderResult();
}
function renderResult() {
  const won = state.found.length === 5;
  const spare = state.remaining;
  const others = eligibleClubs(challenge).filter(c => !state.found.includes(c.id)).slice(0,6);
  $('result-panel').innerHTML = `<div class="result-header"><span class="result-icon ${won ? 'celebrate' : ''}">${icon(won ? 'trophy' : 'ball')}</span><div><h3>${won ? t().winTitle : t().endTitle}</h3><p>${escape(won ? mode === 'practice' ? t().practiceWinBody : t().winBody(spare) : t().endBody(state.found.length))}</p></div></div>${!won && others.length ? `<div class="missed-answers"><strong>${t().moreAnswers}</strong><div class="missed-list">${others.map(c => `<span>${escape(clubName(c))}</span>`).join('')}</div></div>` : ''}<div class="result-actions"><button class="button button-primary" id="share-button" type="button">${icon('share')}<span>${t().share}</span></button><button class="button button-outline" id="next-button" type="button"><span>${mode === 'practice' ? t().again : t().next}</span>${icon('arrow')}</button></div>${mode === 'daily' ? `<div class="next-reset">${icon('sun')}<span>${t().reset}</span></div>` : ''}`;
  $('share-button').addEventListener('click', shareResult);
  $('next-button').addEventListener('click', () => { if (mode === 'daily') switchPractice(); else newPractice(practiceCategory); });
}
function startRound() {
  if (state.phase !== 'idle') return;
  state.phase = 'playing';
  state.deadline = mode === 'daily' ? Date.now()+60000 : null;
  feedback = []; persist(); render(); $('club-input').focus();
}
function finishRound() {
  if (state.phase !== 'playing') return;
  state.remaining = mode === 'daily' ? remainingSeconds(state.deadline) : 60;
  state.phase = 'complete';
  feedback = [];
  persist(); render();
  $('club-input').blur();
  $('share-button')?.focus({ preventScroll:true });
}
function submitAnswer(event) {
  event.preventDefault();
  if (state.phase !== 'playing') return;
  if (mode === 'daily' && !remainingSeconds(state.deadline)) { finishRound(); return; }
  const value = $('club-input').value.trim();
  if (!value) return;
  const results = parseAnswers(value, challenge);
  feedback = []; feedbackError = false;
  let anyAccepted = false;
  for (const result of results) {
    if (state.found.length === 5) break;
    if (result.kind === 'match') {
      if (state.found.includes(result.club.id)) { feedback.push(t().duplicate(clubName(result.club))); feedbackError = true; }
      else { state.found.push(result.club.id); feedback.push(t().accepted(clubName(result.club))); anyAccepted = true; }
    } else {
      feedbackError = true;
      feedback.push(result.kind === 'wrong-category' ? t().wrong(clubName(result.club)) : result.kind === 'ambiguous' ? t().ambiguous(result.input) : t().unknown(result.input));
    }
  }
  if (anyAccepted) $('club-input').value = '';
  else $('club-input').select();
  if (state.found.length === 5) { finishRound(); return; }
  persist(); renderSlots(); renderFeedback(); $('club-input').focus();
}
function scrollToGame() { if (window.matchMedia('(max-width: 760px)').matches) $('game-card').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'}); }
function switchDaily() { if (mode === 'daily') return; mode = 'daily'; state = loadDaily(); feedback = []; feedbackError = false; $('club-input').value = ''; render(); tick(); scrollToGame(); }
function newPractice(category = practiceCategory) {
  practiceCategory = category;
  if (category === 'random') {
    const pool = challengePool.filter(c => c.id !== challenge.id);
    challenge = { ...pool[Math.floor(Math.random()*pool.length)] };
  } else challenge = category === 'world' ? {id:'world',target:5,difficulty:'easy'} : {...challengePool.find(c => c.country === category)};
  state = emptyState(); feedback = []; feedbackError = false; $('club-input').value = '';
  $('practice-category').value = category;
  render();
}
function switchPractice() { if (mode === 'practice') { scrollToGame(); return; } persist(); mode = 'practice'; newPractice(practiceCategory); scrollToGame(); }
function tick() {
  if (mode !== 'daily') return;
  if (challenge.key !== dayKey()) { state = loadDaily(); feedback = []; render(); showToast(t().dailyChanged); }
  if (state.phase === 'playing') { if (!remainingSeconds(state.deadline)) finishRound(); else renderTimer(); }
}
async function shareResult() {
  const squares = '🟩'.repeat(state.found.length)+'⬜'.repeat(5-state.found.length);
  const heading = $('challenge-title').innerText.replace(/\s+/g,' ').trim();
  const url = location.origin;
  const text = `name × clubs. ${mode === 'daily' ? `#${String(challenge.number).padStart(3,'0')} · ${challenge.key}` : t().practice}\n${heading}\n${squares} ${state.found.length}/5${mode === 'daily' && state.found.length === 5 ? ` · ${60-state.remaining}s` : ''}\n${url}`;
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
window.addEventListener('storage', event => { if (mode === 'daily' && event.key === `nxc-daily-${challenge.key}`) { state = loadDaily(); feedback = []; render(); tick(); } });
applyLanguage(); tick(); setInterval(tick,250);
