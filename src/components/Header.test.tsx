import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../test/renderWithI18n';
import { Header } from './Header';

function renderHeader(props: Partial<React.ComponentProps<typeof Header>> = {}) {
  const onModeChange = vi.fn();

  renderWithI18n(
    <Header
      language="en"
      mode="free"
      locked={false}
      onModeChange={onModeChange}
      onHelp={vi.fn()}
      {...props}
    />,
    props.language ?? 'en',
  );

  return { onModeChange };
}

describe('Header', () => {
  it('adds a Leaderboard link after Practice', () => {
    renderHeader();

    const nav = screen.getByRole('navigation', { name: 'Game modes' });
    const labels = Array.from(nav.children).map((item) => item.textContent);

    expect(labels).toEqual(['Free time', 'Practice', 'Leaderboard']);
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute(
      'href',
      '/en/leaderboard',
    );
  });

  it('keeps the game mode active on the game page', () => {
    renderHeader({ mode: 'practice' });

    expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Free time' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Leaderboard' })).not.toHaveAttribute('aria-current');
  });

  it('marks Leaderboard as the current page on the leaderboard page', () => {
    renderHeader({ page: 'leaderboard', language: 'ar' });

    expect(screen.getByRole('link', { name: 'المتصدرون' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'وقت حر' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the board query when switching language on the leaderboard page', () => {
    renderHeader({ page: 'leaderboard', leaderboardQuery: '?mode=t50&period=week' });

    expect(screen.getByRole('link', { name: 'Switch to Arabic' })).toHaveAttribute(
      'href',
      '/ar/leaderboard?mode=t50&period=week',
    );
  });

  it('switches language on the game page as before', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Switch to Arabic' })).toHaveAttribute('href', '/ar');
  });

  it('disables the Leaderboard link while a round is locked', () => {
    renderHeader({ locked: true });

    const link = screen.getByRole('link', { name: 'Leaderboard' });

    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(fireEvent.click(link)).toBe(false);
  });
});
