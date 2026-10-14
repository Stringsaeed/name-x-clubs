'use client';

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { AnswerComposer } from '../components/AnswerComposer';
import { AnswerList } from '../components/AnswerList';
import { HelpDialog } from '../components/HelpDialog';
import { Icon } from '../components/Icon';
import { ResultPanel } from '../components/ResultPanel';
import { Timer } from '../components/Timer';
import { categoryLabel, challengeParts } from '../content/labels';
import { messages } from '../content/messages';
import * as browserStore from '../game/browserStore';
import type { GameController } from '../game/controller';
import { challengesForLevel } from '../game/engine';
import { levels } from '../game/model';
import type { Locale } from '../i18n/config';

type GameScreenProps = { lang: Locale; controller?: GameController };

const serverSnapshot = () => browserStore.serverView;

export function GameScreen({ lang: language, controller: injected }: GameScreenProps) {
  const view = useSyncExternalStore(
    injected?.subscribe ?? browserStore.subscribe,
    injected?.getSnapshot ?? browserStore.getSnapshot,
    serverSnapshot,
  );
  // Only touch the browser store from event handlers and effects, never during render.
  const controller = (): GameController => injected ?? browserStore.getController();
  const { session, mode, level } = view;
  const [ready, setReady] = useState(false);
  const t = messages[language];
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState('');
  const playing = session.round.phase === 'playing';
  const complete = session.round.phase === 'complete';
  useEffect(() => injected?.connect(window), [injected]);
  useEffect(() => setReady(true), []);
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
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const parts = challengeParts(session.challenge, language);
  const category = session.kind === 'practice' ? session.category : 'world';
  const practice = () => controller().dispatch({ type: 'mode', mode: 'practice' });
  const empty = (
    <div className="chat-empty">
      <span className="empty-ball">
        <Icon name="ball" />
      </span>
      {session.round.phase === 'idle' && (
        <button
          className="button button-primary"
          type="button"
          onClick={() => controller().dispatch({ type: 'start' })}
        >
          {t.start}
          <Icon name="arrow" />
        </button>
      )}
    </div>
  );
  return (
    <>
      <div className="site-shell" data-ready={ready ? 'true' : undefined}>
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
              className={`nav-item ${mode === 'free' ? 'active' : ''}`}
              aria-current={mode === 'free' ? 'page' : undefined}
              onClick={() => controller().dispatch({ type: 'mode', mode: 'free' })}
            >
              <Icon name="clock" />
              {t.freeTime}
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
              onClick={() => window.location.assign(`/${language === 'en' ? 'ar' : 'en'}`)}
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
              <h1 id="hero-title">
                {t.hero1}
                <br />
                <span className="highlight">{t.hero2}</span>
                <svg className="hero-spark" viewBox="0 0 40 40" aria-hidden="true">
                  <path d="M20 2v10m0 16v10M2 20h10m16 0h10M7 7l7 7m12 12 7 7M7 33l7-7m12-12 7-7" />
                </svg>
              </h1>
            </div>
            <div className="hero-art">
              <img
                src="/assets/pitch.svg"
                width="560"
                height="360"
                alt={
                  language === 'en'
                    ? 'An illustrated football pitch with shirts and a football'
                    : 'رسم لملعب كرة قدم مع قمصان وكرة'
                }
              />
            </div>
          </section>
          <div className="game-layout">
            <section className="game-card" id="game-card" aria-labelledby="challenge-title">
              <fieldset
                className="level-picker"
                aria-label={language === 'en' ? 'Choose a mode' : 'اختر الوضع'}
              >
                {levels.map((target) => (
                  <button
                    className={`level-button ${level === target ? 'active' : ''}`}
                    type="button"
                    aria-pressed={target === level}
                    data-level={target}
                    key={target}
                    onClick={() => controller().dispatch({ type: 'level', level: target })}
                  >
                    <strong>
                      {language === 'en' ? 'Mode' : 'وضع'} {target}
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
                        controller().dispatch({
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
                      onClick={() =>
                        controller().dispatch({ type: 'practice', category: 'random' })
                      }
                    >
                      <Icon name="shuffle" />
                      {t.surprise}
                    </button>
                  </div>
                </div>
              )}
              <div className="challenge-heading">
                <div>
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
                  {session.challenge.scope.kind === 'letter' && (
                    <p className="challenge-detail">{t.letterDetail}</p>
                  )}
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
                      onClick={() => controller().dispatch({ type: 'finish' })}
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
                  controller={controller()}
                  notify={setToast}
                  onNext={() => controller().dispatch({ type: 'restart' })}
                />
              ) : (
                <AnswerComposer
                  key={`${session.kind}:${session.challenge.id}:${level}`}
                  session={session}
                  language={language}
                  feedback={view.feedback}
                  onSubmit={(text) => {
                    const before = controller().getSnapshot().session.round.found.length;
                    controller().dispatch({ type: 'answer', text });
                    return controller().getSnapshot().session.round.found.length > before;
                  }}
                />
              )}
            </section>
          </div>
        </main>
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
