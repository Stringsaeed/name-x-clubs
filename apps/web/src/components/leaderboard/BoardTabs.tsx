import { useLingui } from '@lingui/react/macro';
import Link from 'next/link';
import type { Locale } from '../../i18n/config';
import {
  type BoardMode,
  type BoardPeriod,
  type BoardQuery,
  boardModes,
  boardPath,
  boardPeriods,
  targetByBoardMode,
} from './query';

type BoardTabsProps = { lang: Locale; query: BoardQuery };

export function PeriodTabs({ lang, query }: BoardTabsProps) {
  const { t } = useLingui();
  const labels: Record<BoardPeriod, string> = {
    day: t`Last 24 hours`,
    week: t`Last 7 days`,
    all: t`All time`,
  };

  return (
    <nav className="lb-tabs small" aria-label={t`Time period`}>
      {boardPeriods.map((period) => (
        <Link
          key={period}
          href={boardPath(lang, { ...query, period })}
          className={period === query.period ? 'active' : ''}
          aria-current={period === query.period ? 'true' : undefined}
        >
          {labels[period]}
        </Link>
      ))}
    </nav>
  );
}

export function ModeTabs({ lang, query }: BoardTabsProps) {
  const { t } = useLingui();

  return (
    <nav className="lb-tabs" aria-label={t`Choose a mode`}>
      {boardModes.map((mode: BoardMode) => {
        const target = targetByBoardMode[mode];

        return (
          <Link
            key={mode}
            href={boardPath(lang, { ...query, mode })}
            className={mode === query.mode ? 'active' : ''}
            aria-current={mode === query.mode ? 'true' : undefined}
          >
            {t({ message: `Mode ${target}`, context: 'difficulty level button' })}
          </Link>
        );
      })}
    </nav>
  );
}
