import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { createGameController } from '../game/controller';
import { GameScreen } from './GameScreen';

test('plays a bilingual practice round and restores it after remount', async () => {
  const user = userEvent.setup();
  const first = render(<GameScreen lang="en" controller={createGameController()} />);
  await user.click(screen.getByRole('button', { name: 'Practice' }));
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  await user.type(screen.getByRole('textbox'), 'Arsenal, مانشستر يونايتد, Man Utd{Enter}');
  const log = screen.getByRole('log');
  expect(within(log).getByText('Arsenal', { exact: true })).toBeInTheDocument();
  expect(within(log).getAllByText('Manchester United', { exact: true })).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('already on your list');
  first.unmount();
  render(<GameScreen lang="en" controller={createGameController()} />);
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
  render(<GameScreen lang="ar" controller={createGameController()} />);
  expect(screen.getByRole('button', { name: 'وضع 10' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(screen.getByRole('log')).getByText('مانشستر يونايتد')).toBeInTheDocument();
  const toggle = screen.getByRole('link', { name: 'Switch to English' });
  expect(toggle).toHaveTextContent('English');
});
test('asks for specificity when an Arabic name identifies multiple clubs', async () => {
  const user = userEvent.setup();
  render(<GameScreen lang="en" controller={createGameController()} />);
  await user.click(screen.getByRole('button', { name: 'Practice' }));
  await user.click(screen.getByRole('button', { name: 'Let’s play' }));
  await user.type(screen.getByRole('textbox'), 'الأهلي{Enter}');
  expect(screen.getByRole('status')).toHaveTextContent('more than one club');
  expect(screen.getByRole('log').children).toHaveLength(0);
});
test('keeps an initials fallback if a crest fails to load', async () => {
  const user = userEvent.setup();
  render(<GameScreen lang="en" controller={createGameController()} />);
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

test('opens Free time with compact modes and no daily or promotional sections', () => {
  render(<GameScreen lang="en" controller={createGameController()} />);
  expect(screen.getByRole('button', { name: 'Free time' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('button', { name: 'Daily challenge' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mode 10' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Mode 50' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Mode 100' })).toBeInTheDocument();
  expect(document.querySelector('.sidebar, .hero-description, .eyebrow')).toBeNull();
});
