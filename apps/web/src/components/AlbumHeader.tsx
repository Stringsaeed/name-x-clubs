import { useLingui } from '@lingui/react/macro';
import type { Level, Session } from '@nxc/game/model';
import { Progress } from '@/components/ui/progress';
import { challengeDescriptor, splitFocus } from '../content/labels';
import { Timer } from './Timer';

export function AlbumHeader({
  session,
  level,
  foundCount,
}: {
  session: Session;
  level: Level;
  foundCount: number;
}) {
  const { t, i18n } = useLingui();
  const isLetter = session.challenge.scope.kind === 'letter';
  const { before, focus, after } = splitFocus(i18n._(challengeDescriptor(i18n, session.challenge)));

  return (
    <div className="album-kicker album-header">
      <div className="album-header-title">
        <h2 id="challenge-title">
          {before}
          <span className="country-name" dir={isLetter ? 'ltr' : undefined}>
            {focus}
          </span>
          {after}
        </h2>
        {isLetter && <p className="challenge-detail">{t`Use the club’s common English name.`}</p>}
      </div>
      <Progress
        className="round-progress album-header-track"
        max={level}
        value={foundCount}
        aria-label={t`YOUR CLUBS`}
      />
      <span className="album-remaining" dir="ltr">
        <strong id="found-count">{foundCount}</strong>
        <span id="target-count">/{level}</span>
      </span>
      <Timer session={session} />
    </div>
  );
}
