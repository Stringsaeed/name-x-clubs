import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AnswerComposer } from '../components/AnswerComposer';
import { AnswerList } from '../components/AnswerList';
import { HelpDialog } from '../components/HelpDialog';
import { Icon } from '../components/Icon';
import { ResultPanel } from '../components/ResultPanel';
import { Timer } from '../components/Timer';
import { clubs } from '../content/catalog';
import { categoryLabel, challengeParts, clubCountNoun } from '../content/labels';
import { messages } from '../content/messages';
import { createGameController } from '../game/controller';
import { challengesForLevel, durationForTarget } from '../game/engine';
import { levels } from '../game/model';

function Lines({ text }: { text: string }) {
  return text.split('<br>').map((line, index) => (
    <Fragment key={line}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ));
}
export function GameApp() {
  const [controller] = useState(() => createGameController());
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const { session, language, mode, level } = view;
  const t = messages[language];
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState('');
  const card = useRef<HTMLElement>(null);
  const playing = session.round.phase === 'playing';
  const complete = session.round.phase === 'complete';
  const previousSelection = useRef({ mode, level, challenge: session.challenge.id, playing });
  useEffect(() => controller.connect(window), [controller]);
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
  useLayoutEffect(() => {
    document.body.classList.toggle('round-active', playing);
    const update = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--play-height', `${height}px`);
      document.body.classList.toggle('keyboard-open', playing && height < window.innerHeight - 100);
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      document.body.classList.remove('round-active', 'keyboard-open');
    };
  }, [playing]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const previous = previousSelection.current;
    const changed =
      previous.mode !== mode ||
      previous.level !== level ||
      previous.challenge !== session.challenge.id ||
      previous.playing;
    if (!playing && changed && window.matchMedia('(max-width:760px)').matches)
      card.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    previousSelection.current = { mode, level, challenge: session.challenge.id, playing };
  }, [mode, level, session.challenge.id, playing]);
  const parts = challengeParts(session.challenge, language);
  const category = session.kind === 'practice' ? session.category : 'world';
  const practice = () => controller.dispatch({ type: 'mode', mode: 'practice' });
  const empty = (
    <div className="chat-empty">
      <span className="empty-ball">
        <Icon name="ball" />
      </span>
      <h3>{language === 'en' ? 'The pitch is yours.' : 'الملعب لك.'}</h3>
      <p>
        {session.round.phase === 'idle'
          ? language === 'en'
            ? 'Start the round, then send your first club.'
            : 'ابدأ الجولة، ثم اكتب أول نادٍ.'
          : language === 'en'
            ? 'Start with a club you know. Your answers appear here.'
            : 'ابدأ بأي نادٍ تعرفه. إجاباتك تنضاف هنا.'}
      </p>
      {session.round.phase === 'idle' && (
        <button
          className="button button-primary"
          type="button"
          onClick={() => controller.dispatch({ type: 'start' })}
        >
          {t.start}
          <Icon name="arrow" />
        </button>
      )}
    </div>
  );
  return (
    <>
      <div className="site-shell">
        <header className="site-header">
          <a href="/" className="brand" aria-label="Name × Clubs home">
            <span className="brand-mark">
              <Icon name="ball" />
            </span>
            <span>
              name<span className="brand-x">×</span>clubs<span className="brand-period">.</span>
            </span>
          </a>
          <nav className="main-nav" aria-label={language === 'en' ? 'Game modes' : 'أوضاع اللعب'}>
            <button
              type="button"
              className={`nav-item ${mode === 'daily' ? 'active' : ''}`}
              aria-current={mode === 'daily' ? 'page' : undefined}
              onClick={() => controller.dispatch({ type: 'mode', mode: 'daily' })}
            >
              <Icon name="sun" />
              {t.daily}
            </button>
            <button
              type="button"
              className={`nav-item ${mode === 'practice' ? 'active' : ''}`}
              aria-current={mode === 'practice' ? 'page' : undefined}
              onClick={practice}
            >
              <Icon name="shuffle" />
              {t.practice}
            </button>
          </nav>
          <div className="header-actions">
            <button
              className="language-button"
              type="button"
              aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              onClick={() =>
                controller.dispatch({ type: 'language', language: language === 'en' ? 'ar' : 'en' })
              }
            >
              <Icon name="globe" />
              <span lang={language === 'en' ? 'ar' : 'en'}>
                {language === 'en' ? 'العربية' : 'English'}
              </span>
            </button>
            <button
              className="help-button"
              type="button"
              aria-label={t.howToPlay}
              onClick={() => setHelp(true)}
            >
              <Icon name="help" />
            </button>
          </div>
        </header>
        <main>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="tiny-ball">✦</span>
                {t.eyebrow}
              </div>
              <h1 id="hero-title">
                {t.hero1}
                <br />
                <span className="highlight">{t.hero2}</span>
                <svg className="hero-spark" viewBox="0 0 40 40" aria-hidden="true">
                  <path d="M20 2v10m0 16v10M2 20h10m16 0h10M7 7l7 7m12 12 7 7M7 33l7-7m12-12 7-7" />
                </svg>
              </h1>
              <p className="hero-description">
                <Lines text={t.heroDescription} />
              </p>
              <div className="hero-note">
                <span className="status-dot" />
                {t.heroNote}
              </div>
            </div>
            <div className="hero-art">
              <img
                src="/assets/pitch.svg"
                alt={
                  language === 'en'
                    ? 'An illustrated football pitch with shirts and a football'
                    : 'رسم لملعب كرة قدم مع قمصان وكرة'
                }
                width="560"
                height="360"
              />
              <span className="art-caption">{t.artCaption}</span>
            </div>
          </section>
          <div className="game-layout">
            <section
              className="game-card"
              id="game-card"
              aria-labelledby="challenge-title"
              ref={card}
            >
              <div className="game-topline">
                <div className="challenge-label">
                  <span className="label-icon">
                    <Icon name={mode === 'daily' ? 'sun' : 'shuffle'} />
                  </span>
                  <span>{mode === 'daily' ? t.dailyLabel : t.practiceLabel}</span>
                  {session.kind === 'daily' && (
                    <span className="challenge-number">
                      #{String(session.number).padStart(3, '0')}
                    </span>
                  )}
                </div>
                <span className="date-label">
                  {session.kind === 'daily'
                    ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'UTC',
                      }).format(new Date(`${session.day}T12:00:00Z`))
                    : t.untimed}
                </span>
              </div>
              <fieldset
                className="level-picker"
                aria-label={language === 'en' ? 'Choose a level' : 'اختر المستوى'}
              >
                {levels.map((target, index) => (
                  <button
                    className={`level-button ${level === target ? 'active' : ''}`}
                    type="button"
                    aria-pressed={target === level}
                    data-level={target}
                    key={target}
                    onClick={() => controller.dispatch({ type: 'level', level: target })}
                  >
                    <span className="level-kicker">
                      {language === 'en' ? 'LEVEL' : 'المستوى'} {String(index + 1).padStart(2, '0')}
                    </span>
                    <strong>
                      {language === 'en' ? 'Name ' : 'اذكر '}
                      {clubCountNoun(target, language)}
                    </strong>
                  </button>
                ))}
              </fieldset>
              {mode === 'practice' && (
                <div className="practice-controls">
                  <label htmlFor="practice-category">{t.pickCategory}</label>
                  <div className="category-row">
                    <select
                      id="practice-category"
                      aria-label={t.pickCategory}
                      value={category}
                      onChange={(event) =>
                        controller.dispatch({
                          type: 'practice',
                          category: event.currentTarget.value,
                        })
                      }
                    >
                      {challengesForLevel(level).map((challenge) => (
                        <option value={challenge.id} key={challenge.id}>
                          {categoryLabel(challenge, language)}
                        </option>
                      ))}
                      <option value="random">{t.surpriseCategory}</option>
                    </select>
                    <button
                      className="shuffle-button"
                      type="button"
                      onClick={() => controller.dispatch({ type: 'practice', category: 'random' })}
                    >
                      <Icon name="shuffle" />
                      {t.surprise}
                    </button>
                  </div>
                </div>
              )}
              <div className="challenge-heading">
                <div>
                  <div className="difficulty">
                    <span />
                    <span>{session.challenge.difficulty === 'medium' ? t.medium : t.easy}</span>
                  </div>
                  <h2 id="challenge-title">
                    {parts.prefix}
                    <span
                      className="country-name"
                      dir={session.challenge.scope.kind === 'letter' ? 'ltr' : undefined}
                    >
                      {parts.focus}
                      {parts.suffix}
                    </span>
                  </h2>
                  <p className="challenge-detail">
                    {mode === 'daily'
                      ? t.dailyDetail(level, durationForTarget(level) / 60)
                      : t.practiceDetail(level)}
                    {session.challenge.scope.kind === 'letter' ? ` ${t.letterDetail}` : ''}
                  </p>
                </div>
                <Timer session={session} language={language} />
              </div>
              <div className="progress-heading">
                <span>{t.yourClubs}</span>
                <div className="progress-actions">
                  {playing && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => controller.dispatch({ type: 'finish' })}
                    >
                      {t.finish}
                    </button>
                  )}
                  <span className="progress-count">
                    <strong id="found-count">{session.round.found.length}</strong>
                    <span id="target-count"> / {level}</span>
                  </span>
                </div>
              </div>
              <progress
                id="round-progress"
                max={level}
                value={session.round.found.length}
                aria-label={t.yourClubs}
              />
              <AnswerList
                found={session.round.found}
                language={language}
                empty={complete ? null : empty}
              />
              {!view.storageAvailable && (
                <p className="storage-notice" role="status">
                  {t.unsupportedStorage}
                </p>
              )}
              {complete ? (
                <ResultPanel
                  session={session}
                  language={language}
                  controller={controller}
                  notify={setToast}
                  onNext={() => {
                    if (mode === 'daily') practice();
                    else controller.dispatch({ type: 'practice', category });
                  }}
                />
              ) : (
                <AnswerComposer
                  key={`${session.kind}:${session.challenge.id}:${level}`}
                  session={session}
                  language={language}
                  feedback={view.feedback}
                  onSubmit={(text) => {
                    const before = controller.getSnapshot().session.round.found.length;
                    controller.dispatch({ type: 'answer', text });
                    return controller.getSnapshot().session.round.found.length > before;
                  }}
                />
              )}
            </section>
            <aside className="sidebar">
              <section className="practice-card">
                <div className="practice-card-top">
                  <span className="pill">{t.keepItGoing}</span>
                  <Icon name="shuffle" />
                </div>
                <h3>{t.practiceTitle}</h3>
                <p>
                  <Lines text={t.practiceDescription} />
                </p>
                <button className="button button-outline" type="button" onClick={practice}>
                  {t.playPractice}
                  <Icon name="arrow" />
                </button>
                <div className="practice-decoration" aria-hidden="true">
                  <span>∞</span>
                  <Icon name="ball" />
                </div>
              </section>
              <section className="how-card">
                <h3>
                  <Icon name="help" />
                  {t.howTitle}
                </h3>
                <ol>
                  {[
                    { title: t.step1Title, body: t.step1Body },
                    { title: t.step2Title, body: t.step2Body },
                    { title: t.step3Title, body: t.step3Body },
                  ].map((step, index) => (
                    <li key={step.title}>
                      <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <span>{step.body}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </aside>
          </div>
          <section
            className="trust-strip"
            aria-label={language === 'en' ? 'Game features' : 'مميزات اللعبة'}
          >
            <span>
              <Icon name="globe" />
              {t.bilingual}
            </span>
            <span className="strip-dot">·</span>
            <span>
              <Icon name="ball" />
              {t.clubCount(clubs.length)}
            </span>
            <span className="strip-dot">·</span>
            <span>
              <Icon name="sun" />
              {t.freshDaily}
            </span>
          </section>
        </main>
        <footer className="site-footer">
          <span>{t.footer}</span>
          <span className="footer-center">
            name × clubs<span className="brand-period">.</span>
          </span>
          <button className="text-button" type="button" onClick={() => setHelp(true)}>
            {t.howToPlay}
          </button>
        </footer>
      </div>
      <HelpDialog open={help} language={language} onClose={() => setHelp(false)} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
