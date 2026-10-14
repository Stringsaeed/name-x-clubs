import { useEffect, useState } from 'react';
import { messages } from '../content/messages';
import { elapsedSeconds, formatElapsed } from '../game/controller';
import type { Language, Session } from '../game/model';
import { Icon } from './Icon';
export function Timer({ session, language }: { session: Session; language: Language }) {
  const [now, setNow] = useState(Date.now);
  const playing = session.round.phase === 'playing';
  useEffect(() => {
    setNow(Date.now());
    if (!playing) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [playing]);
  const elapsed = elapsedSeconds(session, now);
  return (
    <div
      className={`timer ${playing ? 'running' : ''}`}
      id="timer"
      role="timer"
      aria-label={`${messages[language].elapsed}: ${formatElapsed(elapsed)}`}
    >
      <Icon name="clock" />
      <span id="timer-text" dir="ltr">
        {formatElapsed(elapsed)}
      </span>
      <span className="timer-caption">{messages[language].elapsed}</span>
    </div>
  );
}
