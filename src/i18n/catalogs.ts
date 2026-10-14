import type { Messages } from '@lingui/core';
import { messages as arabicMessages } from '../locales/ar/messages';
import { messages as englishMessages } from '../locales/en/messages';
import type { Locale } from './config';

export const catalogs: Record<Locale, Messages> = {
  en: englishMessages,
  ar: arabicMessages,
};
