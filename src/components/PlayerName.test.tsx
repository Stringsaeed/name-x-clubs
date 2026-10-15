import { render } from '@testing-library/react';
import { expect, test } from 'vitest';
import { PlayerName } from './PlayerName';

test('isolates a nickname tag as left-to-right text', () => {
  const { container } = render(<PlayerName name="قناص ناري #RPZK" />);
  const tag = container.querySelector('bdi');

  expect(container.textContent).toBe('قناص ناري #RPZK');
  expect(tag?.textContent).toBe('#RPZK');
  expect(tag?.getAttribute('dir')).toBe('ltr');
});

test('shows a username as it is', () => {
  const { container } = render(<PlayerName name="saeed" />);

  expect(container.textContent).toBe('saeed');
  expect(container.querySelector('bdi')).toBeNull();
});
