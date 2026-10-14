'use client';

import { type Messages, setupI18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { type ReactNode, useState } from 'react';
import type { Locale } from './config';

type LinguiClientProviderProps = {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
};

/** Creates the client i18n instance once from the catalog the server loaded for this locale. */
export function LinguiClientProvider({ locale, messages, children }: LinguiClientProviderProps) {
  const [i18n] = useState(() => setupI18n({ locale, messages: { [locale]: messages } }));

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
