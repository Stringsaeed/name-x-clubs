'use client';

import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { applyDocumentTheme, themeStorageKey } from '../theme';
import { Icon } from './Icon';

export function ThemeToggle() {
  const { t } = useLingui();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const label = theme === 'dark' ? t`Switch to light mode` : t`Switch to dark mode`;

  return (
    <Button
      className="theme-button"
      type="button"
      variant="ghost"
      size="icon-compact"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        applyDocumentTheme(next);
        setTheme(next);
        try {
          localStorage.setItem(themeStorageKey, next);
        } catch {
          // The switch still works when browser storage is unavailable.
        }
      }}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </Button>
  );
}
