import { msg, t } from '@lingui/core/macro';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import '../../styles/globals.css';
import '../../styles/game.css';
import { AppProviders } from '../../components/AppProviders';
import { alanSans, nunito } from '../../fonts';
import { catalogs } from '../../i18n/catalogs';
import { LinguiClientProvider } from '../../i18n/LinguiClientProvider';
import { getServerI18n, type Locale, locales } from '../../i18n/server';
import { themeInitScript } from '../../theme';

type LayoutProps = { children: ReactNode; params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  viewportFit: 'cover',
};

function requestOrigin(headerStore: Headers) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return new URL(configured);
  }
  const host =
    headerStore.get('x-forwarded-host')?.split(',')[0]?.trim() || headerStore.get('host');
  if (!host) {
    return undefined;
  }
  const proto = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
  return new URL(`${proto}://${host}`);
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getServerI18n(lang as Locale);
  return {
    metadataBase: requestOrigin(await headers()),
    title: 'Name × Clubs',
    alternates: { languages: { en: '/en', ar: '/ar' } },
    description: i18n._(
      msg`Name 10, 50 or 100 football clubs. Play at your own pace in English or Arabic.`,
    ),
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  const i18n = getServerI18n(locale);

  return (
    <html
      suppressHydrationWarning
      lang={lang}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`${nunito.variable} ${alanSans.variable}`}
    >
      <head>
        <script>{themeInitScript}</script>
      </head>
      <body>
        <LinguiClientProvider locale={locale} messages={catalogs[locale]}>
          <AppProviders>{children}</AppProviders>
        </LinguiClientProvider>
        <noscript>
          {t(
            i18n,
          )`This football game needs JavaScript to match your answers and save your progress.`}
        </noscript>
      </body>
    </html>
  );
}
