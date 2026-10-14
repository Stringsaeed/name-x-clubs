import { useLingui } from '@lingui/react/macro';
import { Avatar } from './Avatar';
import { formatElapsed } from './format';
import type { BoardRow, MyStanding } from './types';
import { isMine } from './useMyStanding';

const podiumClass = { 1: 'first', 2: 'second', 3: 'third' } as const;

export function Podium({
  entries,
  mine,
}: {
  entries: readonly BoardRow[];
  mine: MyStanding | undefined;
}) {
  const { t } = useLingui();
  const topThree = entries.slice(0, 3);

  return (
    <ol className="lb-podium" aria-label={t`Top 3`}>
      {topThree.map((entry, index) => {
        const place = (index + 1) as keyof typeof podiumClass;

        return (
          <li
            className={`lb-podium-card ${podiumClass[place]} ${isMine(entry, mine) ? 'mine' : ''}`}
            aria-current={isMine(entry, mine) ? 'true' : undefined}
            key={entry.rank + entry.name + entry.achievedAt}
          >
            <span className="lb-medal">{entry.rank}</span>
            <Avatar name={entry.name} anonymous={entry.anonymous} />
            <b className="lb-podium-name" dir="auto">
              {entry.name}
            </b>
            <span className="lb-podium-time" dir="ltr">
              {formatElapsed(entry.elapsedMs)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
