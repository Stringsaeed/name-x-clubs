import { I18nProvider } from '@lingui/react';
import type { Locale } from '@nxc/game/i18n/config';
import { type RenderResult, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { getI18nFor } from '../i18n/instances';

function withI18n(ui: ReactNode, locale: Locale): ReactElement {
  return <I18nProvider i18n={getI18nFor(locale)}>{ui}</I18nProvider>;
}

/** Renders `ui` inside a Lingui provider for `locale` (and re-wraps on `rerender`). */
export function renderWithI18n(ui: ReactElement, locale: Locale = 'en'): RenderResult {
  const result = render(withI18n(ui, locale));

  return {
    ...result,
    rerender: (nextUi) => result.rerender(withI18n(nextUi, locale)),
  };
}
