import { useEffect } from 'react';
import type { Locale } from './config';
import { languageCookie } from './negotiate';

export function writeLanguageCookie(locale: Locale) {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not available in all supported browsers
  document.cookie = `${languageCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function legacyValue(): string | null {
  try {
    const raw = window.localStorage.getItem(languageCookie);
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : raw;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

function removeLegacy() {
  try {
    window.localStorage.removeItem(languageCookie);
  } catch {
    // storage unavailable
  }
}

/** One-time move of the pre-routing localStorage language choice into the cookie. */
export function useLegacyLanguage(lang: Locale) {
  useEffect(() => {
    if (document.cookie.split(';').some((part) => part.trim().startsWith(`${languageCookie}=`))) {
      return;
    }
    const legacy = legacyValue();
    if (legacy === 'ar' && lang === 'en') {
      writeLanguageCookie('ar');
      removeLegacy();
      window.location.replace('/ar');
      return;
    }
    writeLanguageCookie(lang);
    removeLegacy();
  }, [lang]);
}
