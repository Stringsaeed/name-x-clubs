'use client';

import { useLingui } from '@lingui/react/macro';
import { useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { applyDocumentTheme, themeStorageKey } from '../theme';
import { Icon } from './Icon';

function storedTheme(): 'light' | 'dark' {
  try {
    if (localStorage.getItem(themeStorageKey) === 'light') {
      return 'light';
    }
  } catch {
    // Storage can be blocked; the document attribute is the fallback.
  }
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function ThemeToggle() {
  const { t } = useLingui();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Client navigations replace <html> without rerunning the startup script, so
  // WebKit would otherwise drop a saved light theme. Reapply it before paint.
  useLayoutEffect(() => {
    const next = storedTheme();
    applyDocumentTheme(next);
    setTheme(next);
  });

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
