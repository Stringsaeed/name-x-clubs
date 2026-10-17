import { msg } from '@lingui/core/macro';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LeaderboardScreen } from '../../../components/leaderboard/LeaderboardScreen';
import { parseBoardQuery } from '../../../components/leaderboard/query';
import { getServerI18n, isLocale } from '../../../i18n/server';
import { loadBoard } from '../../../lib/api';

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<PageProps, 'params'>): Promise<Metadata> {
  const { lang } = await params;

  if (!isLocale(lang)) {
    return {};
  }

  const title = getServerI18n(lang)._(msg`Leaderboard`);

  return { title: `${title} · Name × Clubs` };
}

export default async function LeaderboardPage({ params, searchParams }: PageProps) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const query = parseBoardQuery(await searchParams);
  const entries = await loadBoard(query.mode, query.period, lang);

  return <LeaderboardScreen lang={lang} query={query} entries={entries} nowMs={Date.now()} />;
}
