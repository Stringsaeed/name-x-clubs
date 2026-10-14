import { useLingui } from '@lingui/react/macro';
import { challengeDescriptor, splitFocus } from '../content/labels';
import type { Session } from '../game/model';
import { Timer } from './Timer';

export function ChallengeHeading({ session }: { session: Session }) {
  const { t, i18n } = useLingui();
  const isLetter = session.challenge.scope.kind === 'letter';
  const { before, focus, after } = splitFocus(i18n._(challengeDescriptor(i18n, session.challenge)));

  return (
    <div className="challenge-heading">
      <div>
        <h2 id="challenge-title">
          {before}
          <span className="country-name" dir={isLetter ? 'ltr' : undefined}>
            {focus}
          </span>
          {after}
        </h2>
        {isLetter && <p className="challenge-detail">{t`Use the club’s common English name.`}</p>}
      </div>
      <Timer session={session} />
    </div>
  );
}
