import type { Messages } from '@lingui/core';
import type { Locale } from '@nxc/game/i18n/config';
import { messages as arabicMessages } from '../locales/ar/messages';
import { messages as englishMessages } from '../locales/en/messages';

export const catalogs: Record<Locale, Messages> = {
  en: englishMessages,
  ar: arabicMessages,
};
