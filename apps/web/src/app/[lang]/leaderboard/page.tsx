import { msg } from '@lingui/core/macro';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { LeaderboardScreen } from '../../../components/leaderboard/LeaderboardScreen';
import { parseBoardQuery } from '../../../components/leaderboard/query';
import { getServerI18n, isLocale } from '../../../i18n/server';
import { loadBoard } from '../../../server/runtime';

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const boardRevalidateSeconds = 30;

/**
 * The public board is shared by everyone, so it is cached for a short while. A failed load throws
 * inside the cache so an outage is never remembered; `readBoard` turns it into `undefined`.
 */
const loadCachedBoard = unstable_cache(
  async (...args: Parameters<typeof loadBoard>) => {
    const entries = await loadBoard(...args);

    if (entries === undefined) {
      throw new Error('Leaderboard database unavailable');
    }

    return entries;
  },
  ['leaderboard-board'],
  { revalidate: boardRevalidateSeconds },
);

async function readBoard(...args: Parameters<typeof loadBoard>) {
  try {
    return await loadCachedBoard(...args);
  } catch {
    return undefined;
  }
}

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
  const entries = await readBoard(query.mode, query.period, lang);

  return <LeaderboardScreen lang={lang} query={query} entries={entries} nowMs={Date.now()} />;
}
