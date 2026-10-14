import { useLingui } from '@lingui/react/macro';
import { memo } from 'react';
import type { Mode } from '../game/model';
import type { Locale } from '../i18n/config';
import { writeLanguageCookie } from '../i18n/useLegacyLanguage';
import { Icon } from './Icon';

type HeaderProps = {
  language: Locale;
  mode: Mode;
  locked: boolean;
  onModeChange: (mode: Mode) => void;
  onHelp: () => void;
  /** Which page the header sits on. The game page is the default. */
  page?: 'game' | 'leaderboard';
  /** Query string (with its `?`) kept when switching language on the leaderboard page. */
  leaderboardQuery?: string;
};

const lockedLinkStyle = { opacity: 0.5, cursor: 'not-allowed' } as const;

function LeaderboardLink({
  language,
  active,
  locked,
}: {
  language: Locale;
  active: boolean;
  locked: boolean;
}) {
  const { t } = useLingui();

  return (
    <a
      href={`/${language}/leaderboard`}
      aria-disabled={locked}
      tabIndex={locked ? -1 : undefined}
      style={locked ? lockedLinkStyle : undefined}
      className={`nav-item ${active ? 'active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        if (locked) {
          event.preventDefault();
        }
      }}
    >
      <Icon name="trophy" />
      {t`Leaderboard`}
    </a>
  );
}

export const Header = memo(function HeaderView({
  language,
  mode,
  locked,
  onModeChange,
  onHelp,
  page = 'game',
  leaderboardQuery = '',
}: HeaderProps) {
  const { t } = useLingui();
  const otherLanguage: Locale = language === 'en' ? 'ar' : 'en';
  // Language names are shown in their own language so they stay findable after a wrong switch.
  const otherLanguageName = otherLanguage === 'ar' ? 'العربية' : 'English';
  const onLeaderboard = page === 'leaderboard';
  const freeActive = !onLeaderboard && mode === 'free';
  const practiceActive = !onLeaderboard && mode === 'practice';
  const languageHref = onLeaderboard
    ? `/${otherLanguage}/leaderboard${leaderboardQuery}`
    : `/${otherLanguage}`;
  const switchLabel = otherLanguage === 'ar' ? t`Switch to Arabic` : t`Switch to English`;

  return (
    <header className="site-header">
      <a
        href={onLeaderboard ? `/${language}` : '/'}
        className="brand"
        aria-label={t`Name × Clubs home`}
      >
        <span className="brand-mark">
          <Icon name="ball" />
        </span>
        <span>
          name<span className="brand-x">×</span>clubs<span className="brand-period">.</span>
        </span>
      </a>
      <nav className="main-nav" aria-label={t`Game modes`}>
        <button
          type="button"
          disabled={locked}
          aria-disabled={locked}
          className={`nav-item ${freeActive ? 'active' : ''}`}
          aria-current={freeActive ? 'page' : undefined}
          onClick={() => onModeChange('free')}
        >
          <Icon name="clock" />
          {t`Free time`}
        </button>
        <button
          type="button"
          disabled={locked}
          aria-disabled={locked}
          className={`nav-item ${practiceActive ? 'active' : ''}`}
          aria-current={practiceActive ? 'page' : undefined}
          onClick={() => onModeChange('practice')}
        >
          <Icon name="shuffle" />
          {t({ message: 'Practice', context: 'game mode tab' })}
        </button>
        <LeaderboardLink language={language} active={onLeaderboard} locked={locked} />
      </nav>
      <div className="header-actions">
        <a
          className="language-button"
          href={languageHref}
          aria-label={switchLabel}
          onClick={() => writeLanguageCookie(otherLanguage)}
        >
          <Icon name="globe" />
          <span lang={otherLanguage}>{otherLanguageName}</span>
        </a>
        <button className="help-button" type="button" aria-label={t`How to play`} onClick={onHelp}>
          <Icon name="help" />
        </button>
      </div>
    </header>
  );
});
