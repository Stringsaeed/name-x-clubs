import { i18n } from '@lingui/core';

export type Locale = 'en' | 'ar';

export const locales: readonly Locale[] = ['en', 'ar'];
export const defaultLocale: Locale = 'en';

/** Loads the `.po` catalog (compiled on the fly by @lingui/vite-plugin) and activates it. */
export async function activate(locale: Locale): Promise<void> {
  const { messages } = await import(`./locales/${locale}/messages.po`);
  i18n.loadAndActivate({ locale, messages });
}

export { i18n };
