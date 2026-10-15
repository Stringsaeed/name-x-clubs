import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { type ClubId, clubs } from '../content/catalog';
import { challengesForLevel } from '../game/engine';
import type { Session } from '../game/model';
import type { RankedOutcome } from '../game/ranked/rankedView';
import type { Locale } from '../i18n/config';
import { renderWithI18n } from '../test/renderWithI18n';
import { ResultPanel } from './ResultPanel';

const tenClubs = clubs.slice(0, 10).map((club) => club.id as ClubId);

const freeTimeRound: Session = {
  kind: 'free',
  challenge: challengesForLevel(10)[0] ?? { id: 'world-10', scope: { kind: 'world' }, target: 10 },
  round: { phase: 'complete', found: tenClubs, elapsed: 102 },
};

function renderResult(outcome: RankedOutcome, language: Locale = 'en') {
  return renderWithI18n(
    <ResultPanel
      session={freeTimeRound}
      outcome={outcome}
      language={language}
      onShare={vi.fn(async () => ({ kind: 'shared' as const }))}
      onNext={vi.fn()}
      notify={vi.fn()}
    />,
    language,
  );
}

function chipTexts() {
  return [...document.querySelectorAll('.ranked-chip')].map((chip) => chip.textContent);
}

const verified: RankedOutcome = {
  kind: 'verified',
  elapsedMs: 102_345,
  ranks: { day: 1, week: 4, all: 12 },
  displayName: 'Swift Striker #4K2Q',
};

test('a verified round shows the server time, its ranks, the player and the leaderboard', () => {
  renderResult(verified);

  expect(screen.getByText('01:42.3')).toBeInTheDocument();
  expect(screen.getByText('Round complete · Mode 10')).toBeInTheDocument();
  expect(chipTexts()).toEqual(['#1 · Last 24 hours', '#4 · Last 7 days', '#12 · All time']);
  expect(screen.getByText('Swift Striker #4K2Q')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute(
    'href',
    '/en/leaderboard?mode=t10&period=day',
  );
  expect(screen.getByRole('button', { name: 'Share result' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Another round' })).toBeInTheDocument();
});

test('a flagged round is under review', () => {
  renderResult({ ...verified, kind: 'review', ranks: null });

  expect(screen.getByText('Under review')).toBeInTheDocument();
  expect(chipTexts()).toEqual(['Under review']);
  expect(screen.getByText('01:42.3')).toBeInTheDocument();
});

test('a rejected round is not ranked', () => {
  renderResult({ ...verified, kind: 'rejected', ranks: null });

  expect(chipTexts()).toEqual(['Not ranked']);
});

test('a round waiting for the server shows the local time while it checks', () => {
  renderResult({ kind: 'pending' });

  expect(screen.getByText('01:42')).toBeInTheDocument();
  expect(screen.getByText('Checking time…')).toBeInTheDocument();
});

test('a round played without the server keeps today’s result with a Not ranked badge', () => {
  renderResult({ kind: 'unranked' });

  expect(screen.getByRole('heading', { name: 'You know ball.' })).toBeInTheDocument();
  expect(screen.getByText('10 / 10 · 01:42')).toBeInTheDocument();
  expect(screen.getByText('Not ranked')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Leaderboard' })).not.toBeInTheDocument();
});

test('a local round has no ranked extras', () => {
  renderResult({ kind: 'local' });

  expect(screen.queryByText('Not ranked')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Leaderboard' })).not.toBeInTheDocument();
});

test('the Arabic result links to the Arabic leaderboard', () => {
  renderResult(verified, 'ar');

  expect(screen.getByText('01:42.3')).toHaveAttribute('dir', 'ltr');
  expect(document.querySelector('a[href="/ar/leaderboard?mode=t10&period=day"]')).not.toBeNull();
});
