import 'server-only';
import { type I18n, setupI18n } from '@lingui/core';
import { messages as ar } from '../locales/ar/messages';
import { messages as en } from '../locales/en/messages';
import type { Locale } from './config';

export { defaultLocale, isLocale, type Locale, locales } from './config';

const catalogs: Record<Locale, typeof en> = { en, ar };

/** Builds a server-side i18n instance for one locale (a fresh instance per call, no shared state). */
export function getServerI18n(locale: Locale): I18n {
  return setupI18n({ locale, messages: { [locale]: catalogs[locale] } });
}
