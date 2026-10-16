import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { createGameController } from '../game/controller';
import { createFakeServer, memoryStorage } from '../game/ranked/fakeServer';
import { renderWithI18n } from '../test/renderWithI18n';
import { GameScreen } from './GameScreen';

test('plays a bilingual practice round and restores it after remount', async () => {
  const user = userEvent.setup();
  const first = renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);
  await user.click(screen.getByRole('button', { name: 'Practice' }));
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  await user.type(screen.getByRole('textbox'), 'Arsenal, مانشستر يونايتد, Man Utd{Enter}');
  const log = screen.getByRole('log');
  expect(within(log).getByText('Arsenal', { exact: true })).toBeInTheDocument();
  expect(within(log).getAllByText('Manchester United', { exact: true })).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('already on your list');
  first.unmount();
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);
  expect(
    within(screen.getByRole('log')).getByText('Manchester United', { exact: true }),
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toBeEnabled();
  expect(screen.getByRole('link', { name: 'Switch to Arabic' })).toBeInTheDocument();
});
test('renders Arabic from the lang prop with a toggle back to English', () => {
  const played = createGameController();
  played.dispatch({ type: 'start' });
  played.dispatch({ type: 'answer', text: 'Manchester United' });
  renderWithI18n(<GameScreen lang="ar" controller={createGameController()} />, 'ar');
  expect(screen.getByRole('button', { name: 'وضع 10' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(screen.getByRole('log')).getByText('مانشستر يونايتد')).toBeInTheDocument();
  const toggle = screen.getByRole('link', { name: 'Switch to English' });
  expect(toggle).toHaveTextContent('English');
});
test('asks for specificity when an Arabic name identifies multiple clubs', async () => {
  const user = userEvent.setup();
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);
  await user.click(screen.getByRole('button', { name: 'Practice' }));
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  await user.type(screen.getByRole('textbox'), 'الأهلي{Enter}');
  expect(screen.getByRole('status')).toHaveTextContent('more than one club');
  expect(screen.getByRole('log').children).toHaveLength(0);
});
test('keeps an initials fallback if a crest fails to load', async () => {
  const user = userEvent.setup();
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);
  await user.click(screen.getByRole('button', { name: 'Practice' }));
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  await user.type(screen.getByRole('textbox'), 'Arsenal{Enter}');
  const row = screen.getByRole('log').firstElementChild;
  expect(row).not.toBeNull();
  const image = row?.querySelector('img');
  expect(image).not.toBeNull();
  if (image) {
    fireEvent.error(image);
  }
  expect(row?.querySelector('img')).toBeNull();
  expect(row).toHaveTextContent('A');
});

test('a phone can type a club on the game keyboard and switch back to the system one', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('pointer: coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  const user = userEvent.setup();
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));

  const keyboard = screen.getByRole('group', { name: 'Keyboard' });
  for (const letter of ['a', 'r', 's', 'e', 'n', 'a', 'l']) {
    await user.click(within(keyboard).getByRole('button', { name: letter }));
  }
  expect(screen.getByRole('textbox')).toHaveValue('arsenal');
  expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  await user.click(within(keyboard).getByRole('button', { name: 'Return' }));
  expect(within(screen.getByRole('log')).getByText('Arsenal', { exact: true })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'System keyboard' }));
  expect(screen.queryByRole('group', { name: 'Keyboard' })).not.toBeInTheDocument();
  expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');

  await user.click(screen.getByRole('button', { name: 'Game keyboard' }));
  expect(screen.getByRole('group', { name: 'Keyboard' })).toBeInTheDocument();
});

test('opens Free time with compact modes and no daily or promotional sections', () => {
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);
  expect(screen.getByRole('button', { name: 'Free time' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('button', { name: 'Daily challenge' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mode 10' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Mode 50' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mode 100' })).toBeInTheDocument();
  expect(document.querySelector('.sidebar, .hero-description, .eyebrow')).toBeNull();
});
test('disables mode, level and practice selectors while playing and re-enables them after', async () => {
  const user = userEvent.setup();
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);
  await user.click(screen.getByRole('button', { name: 'Practice' }));
  const selectors = () => [
    screen.getByRole('button', { name: 'Free time' }),
    screen.getByRole('button', { name: 'Practice' }),
    screen.getByRole('button', { name: 'Mode 10' }),
    screen.getByRole('button', { name: 'Mode 50' }),
    screen.getByRole('button', { name: 'Mode 100' }),
    screen.getByRole('combobox'),
    screen.getByRole('button', { name: 'Surprise me' }),
  ];
  for (const element of selectors()) {
    expect(element).toBeEnabled();
  }
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  for (const element of selectors()) {
    expect(element).toBeDisabled();
    expect(element).toHaveAttribute('aria-disabled', 'true');
  }
  expect(screen.getByRole('button', { name: 'Mode 10' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: 'Switch to Arabic' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Finish/ }));
  for (const element of selectors()) {
    expect(element).toBeEnabled();
  }
});

const rankedRoundId = '0192f0a4-0000-7000-8000-000000000003';

function renderRanked() {
  const server = createFakeServer();
  const ranked = { api: server.api, storage: memoryStorage() };
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} ranked={ranked} />);

  return server;
}

test('a ranked Free time round ends with the server time and ranks', async () => {
  const user = userEvent.setup();
  const server = renderRanked();
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  const now = Date.now();
  await act(() =>
    server.take('/api/rounds').respond(201, {
      roundId: rankedRoundId,
      startedAt: now,
      serverNow: now,
      displayName: 'Swift Striker #4K2Q',
    }),
  );
  await user.type(screen.getByRole('textbox'), 'Arsenal{Enter}');
  await act(() =>
    server.take(`/api/rounds/${rankedRoundId}/answers`).respond(200, {
      nextSeq: 1,
      found: ['arsenal'],
      events: [],
      phase: 'complete',
      result: { status: 'verified', elapsedMs: 12_345 },
    }),
  );
  await act(() =>
    server.take(`/api/rounds/${rankedRoundId}/finish`).respond(200, {
      status: 'verified',
      elapsedMs: 12_345,
      ranks: { day: 1, week: 1, all: 1 },
      displayName: 'Swift Striker #4K2Q',
    }),
  );
  expect(screen.getByText('00:12.3')).toBeInTheDocument();
  const chips = [...document.querySelectorAll('.ranked-chip')].map((chip) => chip.textContent);
  expect(chips).toEqual(['#1 · Last 24 hours', '#1 · Last 7 days', '#1 · All time']);
  expect(document.querySelector('.ranked-result-player')).toHaveTextContent('Swift Striker #4K2Q');
});

test('a Free time round that cannot reach the server is played locally, not ranked', async () => {
  const user = userEvent.setup();
  const server = renderRanked();
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  await act(() => server.take('/api/rounds').failNetwork());
  expect(screen.getByText('Not ranked')).toBeInTheDocument();
  await user.type(screen.getByRole('textbox'), 'Arsenal{Enter}');
  expect(within(screen.getByRole('log')).getByText('Arsenal', { exact: true })).toBeInTheDocument();
  expect(server.requests).toHaveLength(0);
});
