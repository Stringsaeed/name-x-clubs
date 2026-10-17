import 'server-only';
import type { I18n } from '@lingui/core';
import { getI18nFor } from './instances';

export { defaultLocale, isLocale, type Locale, locales } from '@nxc/game/i18n/config';

/** The i18n instance for server components and metadata (never shared across locales). */
export function getServerI18n(locale: Parameters<typeof getI18nFor>[0]): I18n {
  return getI18nFor(locale);
}
