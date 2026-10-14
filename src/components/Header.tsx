import { useLingui } from '@lingui/react/macro';
import { memo } from 'react';
import type { Mode } from '../game/model';
import type { Locale } from '../i18n/config';
import { writeLanguageCookie } from '../i18n/useLegacyLanguage';
import { Icon } from './Icon';

type HeaderProps = {
  language: Locale;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onHelp: () => void;
};

export const Header = memo(function HeaderView({
  language,
  mode,
  onModeChange,
  onHelp,
}: HeaderProps) {
  const { t } = useLingui();
  const otherLanguage: Locale = language === 'en' ? 'ar' : 'en';
  // Language names are shown in their own language so they stay findable after a wrong switch.
  const otherLanguageName = otherLanguage === 'ar' ? 'العربية' : 'English';
  const switchLabel = otherLanguage === 'ar' ? t`Switch to Arabic` : t`Switch to English`;

  return (
    <header className="site-header">
      <a href="/" className="brand" aria-label={t`Name × Clubs home`}>
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
          className={`nav-item ${mode === 'free' ? 'active' : ''}`}
          aria-current={mode === 'free' ? 'page' : undefined}
          onClick={() => onModeChange('free')}
        >
          <Icon name="clock" />
          {t`Free time`}
        </button>
        <button
          type="button"
          className={`nav-item ${mode === 'practice' ? 'active' : ''}`}
          aria-current={mode === 'practice' ? 'page' : undefined}
          onClick={() => onModeChange('practice')}
        >
          <Icon name="shuffle" />
          {t({ message: 'Practice', context: 'game mode tab' })}
        </button>
      </nav>
      <div className="header-actions">
        <a
          className="language-button"
          href={`/${otherLanguage}`}
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
