import { defineConfig } from '@lingui/cli';
import { formatter } from '@lingui/format-po';

export default defineConfig({
  locales: ['en', 'ar'],
  sourceLocale: 'en',
  fallbackLocales: { default: 'en' },
  catalogs: [{ path: 'src/locales/{locale}/messages', include: ['src'] }],
  format: formatter({ origins: true, lineNumbers: false }),
  orderBy: 'messageId',
});
