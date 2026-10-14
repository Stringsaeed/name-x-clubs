import 'server-only';
import { type I18n, setupI18n } from '@lingui/core';
import { messages as ar } from '../locales/ar/messages';
import { messages as en } from '../locales/en/messages';

export type Locale = 'en' | 'ar';

export const locales: readonly Locale[] = ['en', 'ar'];

const catalogs = { en, ar };

/** Builds a server-side i18n instance for one locale (a fresh instance per call, no shared state). */
export function getServerI18n(locale: Locale): I18n {
  return setupI18n({ locale, messages: { [locale]: catalogs[locale] } });
}
