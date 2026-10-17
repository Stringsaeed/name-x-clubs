import { defaultLocale, isLocale, type Locale } from '@nxc/game/i18n/config';

export const languageCookie = 'nxc-language';

function qualityFor(header: string, tag: string): number {
  let best = -1;
  for (const part of header.split(',')) {
    const [range = '', ...params] = part.trim().split(';');
    const name = range.trim().toLowerCase();
    if (name !== tag && !name.startsWith(`${tag}-`)) {
      continue;
    }
    let q = 1;
    for (const param of params) {
      const [key, value] = param.split('=');
      if (key?.trim().toLowerCase() === 'q') {
        const parsed = Number.parseFloat(value ?? '');
        q = Number.isNaN(parsed) ? 0 : parsed;
      }
    }
    best = Math.max(best, q);
  }
  return best;
}

/** Cookie wins, then Accept-Language (Arabic only if strictly preferred over English), then English. */
export function negotiateLocale(
  cookie: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookie)) {
    return cookie;
  }
  if (acceptLanguage) {
    const ar = qualityFor(acceptLanguage, 'ar');
    const en = qualityFor(acceptLanguage, 'en');
    if (ar > 0 && ar >= en) {
      return 'ar';
    }
  }
  return defaultLocale;
}
