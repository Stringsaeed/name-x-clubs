import { msg } from '@lingui/core/macro';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../../styles/game.css';
import { getServerI18n, type Locale, locales } from '../../i18n/server';

type LayoutProps = { children: ReactNode; params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { lang } = await params;
  const i18n = getServerI18n(lang as Locale);
  return {
    title: 'Name × Clubs',
    description: i18n._(
      msg`Name 10, 50 or 100 football clubs. Play at your own pace in English or Arabic.`,
    ),
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <body>{children}</body>
    </html>
  );
}
