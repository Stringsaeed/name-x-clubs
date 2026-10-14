'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { GameCard } from '../components/GameCard';
import { Header } from '../components/Header';
import { HelpDialog } from '../components/HelpDialog';
import { Hero } from '../components/Hero';
import * as browserStore from '../game/browserStore';
import type { GameController } from '../game/controller';
import { useGameActions } from '../hooks/useGameActions';
import { useToast } from '../hooks/useToast';
import { useViewportHeight } from '../hooks/useViewportHeight';
import type { Locale } from '../i18n/config';
import { useLegacyLanguage } from '../i18n/useLegacyLanguage';

type GameScreenProps = { lang: Locale; controller?: GameController };

const serverSnapshot = () => browserStore.serverView;

export function GameScreen({ lang: language, controller: injected }: GameScreenProps) {
  const view = useSyncExternalStore(
    injected?.subscribe ?? browserStore.subscribe,
    injected?.getSnapshot ?? browserStore.getSnapshot,
    serverSnapshot,
  );
  const playing = view.session.round.phase === 'playing';
  const [ready, setReady] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { message: toastMessage, showToast } = useToast();

  const actions = useGameActions(injected);

  useEffect(() => injected?.connect(window), [injected]);
  useEffect(() => setReady(true), []);
  useLegacyLanguage(language);
  useViewportHeight(playing);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  return (
    <>
      <div className="site-shell" data-ready={ready ? 'true' : undefined}>
        <Header
          language={language}
          mode={view.mode}
          locked={playing}
          onModeChange={actions.changeMode}
          onHelp={openHelp}
        />
        <main>
          <Hero />
          <div className="game-layout">
            <GameCard view={view} language={language} actions={actions} notify={showToast} />
          </div>
        </main>
      </div>
      <HelpDialog open={helpOpen} onClose={closeHelp} />
      {toastMessage && (
        <div className="toast" role="status">
          {toastMessage}
        </div>
      )}
    </>
  );
}
