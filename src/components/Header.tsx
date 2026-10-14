import { memo } from 'react';
import { messages } from '../content/messages';
import type { Mode } from '../game/model';
import type { Locale } from '../i18n/config';
import { writeLanguageCookie } from '../i18n/useLegacyLanguage';
import { Icon } from './Icon';

const text = {
  en: { modesLabel: 'Game modes', switchLabel: 'Switch to Arabic', otherName: 'العربية' },
  ar: { modesLabel: 'أوضاع اللعب', switchLabel: 'Switch to English', otherName: 'English' },
} as const;

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
  const t = messages[language];
  const local = text[language];
  const otherLanguage: Locale = language === 'en' ? 'ar' : 'en';

  return (
    <header className="site-header">
      <a href="/" className="brand" aria-label="Name × Clubs home">
        <span className="brand-mark">
          <Icon name="ball" />
        </span>
        <span>
          name<span className="brand-x">×</span>clubs<span className="brand-period">.</span>
        </span>
      </a>
      <nav className="main-nav" aria-label={local.modesLabel}>
        <button
          type="button"
          className={`nav-item ${mode === 'free' ? 'active' : ''}`}
          aria-current={mode === 'free' ? 'page' : undefined}
          onClick={() => onModeChange('free')}
        >
          <Icon name="clock" />
          {t.freeTime}
        </button>
        <button
          type="button"
          className={`nav-item ${mode === 'practice' ? 'active' : ''}`}
          aria-current={mode === 'practice' ? 'page' : undefined}
          onClick={() => onModeChange('practice')}
        >
          <Icon name="shuffle" />
          {t.practice}
        </button>
      </nav>
      <div className="header-actions">
        <a
          className="language-button"
          href={`/${otherLanguage}`}
          aria-label={local.switchLabel}
          onClick={() => writeLanguageCookie(otherLanguage)}
        >
          <Icon name="globe" />
          <span lang={otherLanguage}>{local.otherName}</span>
        </a>
        <button className="help-button" type="button" aria-label={t.howToPlay} onClick={onHelp}>
          <Icon name="help" />
        </button>
      </div>
    </header>
  );
});
