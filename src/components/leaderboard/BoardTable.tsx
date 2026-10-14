import { useLingui } from '@lingui/react/macro';
import type { Locale } from '../../i18n/config';
import { Avatar } from './Avatar';
import { formatElapsed, formatRelative } from './format';
import type { BoardRow, MyStanding } from './types';
import { isMine } from './useMyStanding';

type BoardTableProps = {
  entries: readonly BoardRow[];
  lang: Locale;
  nowMs: number;
  mine: MyStanding | undefined;
};

export function BoardTable({ entries, lang, nowMs, mine }: BoardTableProps) {
  const { t } = useLingui();
  const rows = entries.slice(3);
  const mineIsVisible = entries.some((entry) => isMine(entry, mine));
  const pinned = mineIsVisible ? undefined : mine;

  if (rows.length === 0 && pinned === undefined) {
    return null;
  }

  return (
    <table className="lb-table">
      <thead>
        <tr>
          <th scope="col">{t`Rank`}</th>
          <th scope="col">{t`Player`}</th>
          <th scope="col" className="lb-end">
            {t`Time`}
          </th>
          <th scope="col" className="lb-end">
            {t`When`}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => (
          <tr
            key={entry.rank + entry.name + entry.achievedAt}
            className={`${entry.anonymous ? 'anonymous' : ''} ${isMine(entry, mine) ? 'mine' : ''}`}
            aria-current={isMine(entry, mine) ? 'true' : undefined}
          >
            <td className="lb-rank">{entry.rank}</td>
            <td>
              <span className="lb-player">
                <Avatar name={entry.name} anonymous={entry.anonymous} />
                <span className="lb-name" dir="auto">
                  {entry.name}
                </span>
              </span>
            </td>
            <td className="lb-end lb-time">
              <span dir="ltr">{formatElapsed(entry.elapsedMs)}</span>
            </td>
            <td className="lb-end lb-when">{formatRelative(entry.achievedAt, nowMs, lang)}</td>
          </tr>
        ))}
      </tbody>
      {pinned === undefined ? null : (
        <tfoot>
          <tr className="you">
            <td className="lb-rank">{pinned.rank}</td>
            <td>
              <span className="lb-player">
                <span className="lb-name">{t`You`}</span>
              </span>
            </td>
            <td className="lb-end lb-time">
              <span dir="ltr">{formatElapsed(pinned.best.elapsedMs)}</span>
            </td>
            <td className="lb-end lb-when">
              {formatRelative(pinned.best.achievedAt, nowMs, lang)}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
