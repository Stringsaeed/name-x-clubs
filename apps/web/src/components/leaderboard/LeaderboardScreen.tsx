'use client';

import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import '../../styles/leaderboard.css';
import type { Locale } from '../../i18n/config';
import { Header } from '../Header';
import { HelpDialog } from '../HelpDialog';
import { BoardTable } from './BoardTable';
import { ModeTabs, PeriodTabs } from './BoardTabs';
import { EmptyState, UnavailableState } from './EmptyState';
import { Podium } from './Podium';
import { type BoardQuery, boardPath, boardQueryString } from './query';
import type { BoardRow } from './types';
import { useMyStanding } from './useMyStanding';

type LeaderboardScreenProps = {
  lang: Locale;
  query: BoardQuery;
  /** `undefined` when the database could not be reached. */
  entries: readonly BoardRow[] | undefined;
  nowMs: number;
};

export function LeaderboardScreen({ lang, query, entries, nowMs }: LeaderboardScreenProps) {
  const { t } = useLingui();
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const backToGame = useCallback(() => window.location.assign(`/${lang}`), [lang]);

  return (
    <>
      <div className="site-shell">
        <Header
          language={lang}
          mode="free"
          locked={false}
          page="leaderboard"
          leaderboardQuery={boardQueryString(query)}
          onModeChange={backToGame}
          onHelp={openHelp}
        />
        <main className="leaderboard-page">
          <div className="lb-heading">
            <h1>{t`Leaderboard`}</h1>
            <PeriodTabs lang={lang} query={query} />
          </div>
          <ModeTabs lang={lang} query={query} />
          <BoardContent lang={lang} query={query} entries={entries} nowMs={nowMs} />
        </main>
      </div>
      <HelpDialog open={helpOpen} onClose={closeHelp} />
    </>
  );
}

function BoardContent({ lang, query, entries, nowMs }: LeaderboardScreenProps) {
  if (entries === undefined) {
    return <UnavailableState href={boardPath(lang, query)} />;
  }

  if (entries.length === 0) {
    return <EmptyState lang={lang} />;
  }

  return <Board lang={lang} query={query} entries={entries} nowMs={nowMs} />;
}

function Board({
  lang,
  query,
  entries,
  nowMs,
}: Omit<LeaderboardScreenProps, 'entries'> & { entries: readonly BoardRow[] }) {
  const mine = useMyStanding(query.mode, query.period);

  return (
    <section className="lb-board">
      <Podium entries={entries} mine={mine} />
      <BoardTable entries={entries} lang={lang} nowMs={nowMs} mine={mine} />
    </section>
  );
}
