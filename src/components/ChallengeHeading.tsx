import { challengeParts } from '../content/labels';
import { messages } from '../content/messages';
import type { Session } from '../game/model';
import type { Locale } from '../i18n/config';
import { Timer } from './Timer';

export function ChallengeHeading({ session, language }: { session: Session; language: Locale }) {
  const t = messages[language];
  const parts = challengeParts(session.challenge, language);
  const isLetter = session.challenge.scope.kind === 'letter';

  return (
    <div className="challenge-heading">
      <div>
        <h2 id="challenge-title">
          {parts.prefix}
          <span className="country-name" dir={isLetter ? 'ltr' : undefined}>
            {parts.focus}
            {parts.suffix}
          </span>
        </h2>
        {isLetter && <p className="challenge-detail">{t.letterDetail}</p>}
      </div>
      <Timer session={session} language={language} />
    </div>
  );
}
