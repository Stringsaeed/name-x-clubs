import { msg, t } from '@lingui/core/macro';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../../styles/game.css';
import { alanSans, nunito } from '../../fonts';
import { catalogs } from '../../i18n/catalogs';
import { LinguiClientProvider } from '../../i18n/LinguiClientProvider';
import { getServerI18n, type Locale, locales } from '../../i18n/server';

type LayoutProps = { children: ReactNode; params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = { themeColor: '#f7f8f2', viewportFit: 'cover' };

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getServerI18n(lang as Locale);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
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
      lang={lang}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`${nunito.variable} ${alanSans.variable}`}
    >
      <body>
        <LinguiClientProvider locale={locale} messages={catalogs[locale]}>
          {children}
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
