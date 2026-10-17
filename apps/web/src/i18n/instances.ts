import { type I18n, setupI18n } from '@lingui/core';
import { defaultLocale, type Locale, locales } from '@nxc/game/i18n/config';
import { catalogs } from './catalogs';

function createInstance(locale: Locale): I18n {
  return setupI18n({ locale, messages: { [locale]: catalogs[locale] } });
}

const instances = Object.fromEntries(
  locales.map((locale) => [locale, createInstance(locale)]),
) as Record<Locale, I18n>;

/**
 * A preloaded, shared i18n instance per locale. Safe anywhere (server, client, plain
 * modules) because it is never re-activated, unlike the global `i18n` singleton.
 */
export function getI18nFor(locale: Locale = defaultLocale): I18n {
  return instances[locale];
}
