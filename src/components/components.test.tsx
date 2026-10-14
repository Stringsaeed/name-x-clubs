import { act, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { type ClubId, clubs } from '../content/catalog';
import { createGameController } from '../game/controller';
import { useToast } from '../hooks/useToast';
import { GameScreen } from '../screens/GameScreen';
import { renderWithI18n } from '../test/renderWithI18n';
import { pasteIntoValue } from './AnswerComposer';
import { AnswerList } from './AnswerList';
import { Timer } from './Timer';

const iconRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock('./Icon', () => ({
  Icon: () => {
    iconRenders.count += 1;
    return null;
  },
}));

afterEach(() => {
  vi.useRealTimers();
});

test('Timer ticks once per second aligned to the second boundary, not four times a second', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.500Z'));
  const controller = createGameController();
  controller.dispatch({ type: 'start' });
  const intervalSpy = vi.spyOn(window, 'setInterval');
  renderWithI18n(<Timer session={controller.getSnapshot().session} />);
  expect(screen.getByRole('timer')).toHaveTextContent('00:00');

  act(() => vi.advanceTimersByTime(499));
  expect(intervalSpy).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(1));
  expect(intervalSpy).toHaveBeenCalledTimes(1);
  expect(intervalSpy.mock.calls[0]?.[1]).toBe(1000);

  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole('timer')).toHaveTextContent('00:01');
});

function ToastHarness() {
  const { message, showToast } = useToast();

  return (
    <>
      <button type="button" onClick={() => showToast('Copied')}>
        show
      </button>
      {message && <output>{message}</output>}
    </>
  );
}

test('showing the same toast message twice restarts the 4s timer', () => {
  vi.useFakeTimers();
  renderWithI18n(<ToastHarness />);
  const show = screen.getByRole('button', { name: 'show' });

  fireEvent.click(show);
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.click(show);
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByText('Copied')).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1001));
  expect(screen.queryByText('Copied')).not.toBeInTheDocument();
});

test('pasting a newline-separated list converts newlines and tabs to commas at the cursor', () => {
  expect(pasteIntoValue('ab', 1, 1, 'Arsenal\nChelsea\r\nLiverpool\tRoma')).toEqual({
    value: 'aArsenal, Chelsea, Liverpool, Romab',
    caret: 1 + 'Arsenal, Chelsea, Liverpool, Roma'.length,
  });
  expect(pasteIntoValue('ab', 0, 0, 'single line')).toBeNull();
});

test('pasting multiple lines into the answer field keeps them as a comma list', () => {
  const controller = createGameController();
  controller.dispatch({ type: 'start' });
  renderWithI18n(<GameScreen lang="en" controller={controller} />);
  const input = screen.getByRole('textbox');

  fireEvent.paste(input, { clipboardData: { getData: () => 'Arsenal\nChelsea\nLiverpool' } });

  expect(input).toHaveValue('Arsenal, Chelsea, Liverpool');
});

test('pasting respects the maximum answer length', () => {
  const result = pasteIntoValue('x'.repeat(11998), 11998, 11998, 'a\nb\nc');

  expect(result?.value).toHaveLength(12000);
});

test('the start button sits in the composer slot and focuses the input in the same tap', () => {
  renderWithI18n(<GameScreen lang="en" controller={createGameController()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Let’s play' }));

  expect(screen.queryByRole('button', { name: 'Let’s play' })).not.toBeInTheDocument();
  expect(screen.getByRole('textbox')).toHaveFocus();
});

function ListHarness({ found }: { found: readonly ClubId[] }) {
  const [unrelated, setUnrelated] = useState(0);

  return (
    <>
      <button type="button" onClick={() => setUnrelated(unrelated + 1)}>
        bump {unrelated}
      </button>
      <AnswerList found={found} language="en" showEmpty />
    </>
  );
}

test('AnswerList rows do not re-render when unrelated parent state changes', () => {
  const found = clubs.slice(0, 5).map((club) => club.id);
  renderWithI18n(<ListHarness found={found} />);
  const iconRendersAfterMount = iconRenders.count;
  expect(iconRendersAfterMount).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole('button', { name: /bump/ }));
  fireEvent.click(screen.getByRole('button', { name: /bump/ }));

  expect(iconRenders.count).toBe(iconRendersAfterMount);
});

test('only rows added after mount play the entrance animation', () => {
  const ids = clubs.slice(0, 3).map((club) => club.id);
  const view = renderWithI18n(<AnswerList found={ids.slice(0, 2)} language="en" showEmpty />);
  expect(document.querySelectorAll('.answer-message.is-new')).toHaveLength(0);

  view.rerender(<AnswerList found={ids} language="en" showEmpty />);

  const animated = document.querySelectorAll('.answer-message.is-new');
  expect(animated).toHaveLength(1);
  expect(animated[0]).toHaveAttribute('data-club-id', ids[2]);
});
