import { i18n, type Messages } from '@lingui/core';
import type { Locale } from './config';

const loaders: Record<Locale, () => Promise<{ messages: Messages }>> = {
  en: () => import('../locales/en/messages'),
  ar: () => import('../locales/ar/messages'),
};

/** Loads the precompiled TS catalog (`npm run i18n:compile`) and activates it. */
export async function activate(locale: Locale): Promise<void> {
  const { messages } = await loaders[locale]();
  i18n.loadAndActivate({ locale, messages });
}

export { i18n };
