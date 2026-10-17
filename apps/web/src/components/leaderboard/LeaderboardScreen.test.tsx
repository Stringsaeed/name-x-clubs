import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/renderWithI18n';
import { LeaderboardScreen } from './LeaderboardScreen';
import type { BoardQuery } from './query';
import type { BoardRow } from './types';

const nowMs = Date.parse('2026-10-14T12:00:00.000Z');

const query: BoardQuery = { mode: 't10', period: 'day' };

function row(rank: number, name: string, elapsedMs: number, anonymous = false): BoardRow {
  return {
    rank,
    name,
    anonymous,
    elapsedMs,
    achievedAt: new Date(nowMs - rank * 14 * 60_000).toISOString(),
  };
}

const entries = [
  row(1, 'Omar K.', 72_400),
  row(2, 'Swift Falcon', 78_000, true),
  row(3, 'Layla', 86_900),
  row(4, 'Yusuf', 96_700),
  row(5, 'Brave Lion', 98_100, true),
];

function mockStanding(response: { ok: boolean; body?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    json: async () => response.body,
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LeaderboardScreen', () => {
  it('renders the podium, the table and the formatted times', () => {
    mockStanding({ ok: false });
    renderWithI18n(<LeaderboardScreen lang="en" query={query} entries={entries} nowMs={nowMs} />);

    const podium = screen.getByRole('list', { name: 'Top 3' });

    expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
    expect(within(podium).getByText('01:12.4')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Yusuf/ })).toHaveTextContent('01:36.7');
    expect(screen.getByRole('row', { name: /Yusuf/ })).toHaveTextContent('56m ago');
  });

  it('marks the active mode and period tabs and links them through the URL', () => {
    mockStanding({ ok: false });
    renderWithI18n(
      <LeaderboardScreen
        lang="en"
        query={{ mode: 't50', period: 'week' }}
        entries={entries}
        nowMs={nowMs}
      />,
    );

    expect(screen.getByRole('link', { name: 'Mode 50' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Mode 100' })).toHaveAttribute(
      'href',
      '/en/leaderboard?mode=t100&period=week',
    );
    expect(screen.getByRole('link', { name: 'All time' })).toHaveAttribute(
      'href',
      '/en/leaderboard?mode=t50&period=all',
    );
  });

  it('shows the empty state with a link back to the game', () => {
    renderWithI18n(<LeaderboardScreen lang="en" query={query} entries={[]} nowMs={nowMs} />);

    expect(screen.getByRole('heading', { name: 'No times yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Let.s play/ })).toHaveAttribute('href', '/en');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a quiet unavailable state when the board could not be loaded', () => {
    renderWithI18n(<LeaderboardScreen lang="en" query={query} entries={undefined} nowMs={nowMs} />);

    expect(screen.getByRole('status')).toHaveTextContent('The board is unavailable right now');
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/en/leaderboard?mode=t10&period=day',
    );
  });

  it('keeps times left to right and names direction-aware in Arabic', () => {
    mockStanding({ ok: false });
    renderWithI18n(
      <LeaderboardScreen lang="ar" query={query} entries={entries} nowMs={nowMs} />,
      'ar',
    );

    expect(screen.getByRole('heading', { level: 1, name: 'المتصدرون' })).toBeInTheDocument();
    expect(screen.getByText('01:12.4')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByText('01:36.7')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByText('Omar K.')).toHaveAttribute('dir', 'auto');
    expect(screen.getByRole('link', { name: 'وضع 10' })).toHaveAttribute(
      'href',
      '/ar/leaderboard?mode=t10&period=day',
    );
  });

  it('highlights the visible row without pinning a duplicate You row', async () => {
    const mine = entries[3];
    mockStanding({
      ok: true,
      body: {
        rank: mine?.rank,
        total: 5,
        best: { elapsedMs: mine?.elapsedMs, achievedAt: mine?.achievedAt },
      },
    });
    renderWithI18n(<LeaderboardScreen lang="en" query={query} entries={entries} nowMs={nowMs} />);

    await waitFor(() =>
      expect(screen.getByRole('row', { name: /Yusuf/ })).toHaveAttribute('aria-current', 'true'),
    );

    expect(screen.getByRole('row', { name: /Brave Lion/ })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('row', { name: /You/ })).not.toBeInTheDocument();
  });

  it('pins a You row when the player ranks below the visible board', async () => {
    mockStanding({
      ok: true,
      body: {
        rank: 57,
        total: 80,
        best: { elapsedMs: 154_300, achievedAt: new Date(nowMs - 3_600_000).toISOString() },
      },
    });
    renderWithI18n(<LeaderboardScreen lang="en" query={query} entries={entries} nowMs={nowMs} />);

    const pinned = await screen.findByRole('row', { name: /You/ });

    expect(pinned).toHaveTextContent('57');
    expect(pinned).toHaveTextContent('02:34.3');
  });

  it('hides the You row when the player has no best', async () => {
    const fetchMock = mockStanding({ ok: true, body: { rank: null, total: 5, best: null } });
    renderWithI18n(<LeaderboardScreen lang="en" query={query} entries={entries} nowMs={nowMs} />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/leaderboards/t10/me?period=day',
        expect.objectContaining({ credentials: 'same-origin' }),
      ),
    );

    expect(screen.queryByRole('row', { name: /You/ })).not.toBeInTheDocument();
  });

  it('hides the You row when the caller is not signed in', async () => {
    const fetchMock = mockStanding({ ok: false });
    renderWithI18n(<LeaderboardScreen lang="en" query={query} entries={entries} nowMs={nowMs} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(screen.queryByRole('row', { name: /You/ })).not.toBeInTheDocument();
  });
});
