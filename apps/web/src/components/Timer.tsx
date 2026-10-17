import { useLingui } from '@lingui/react/macro';
import type { Session } from '@nxc/game/model';
import { useEffect, useState } from 'react';
import { elapsedSeconds, formatElapsed } from '../game/controller';
import { Icon } from './Icon';

export function Timer({ session }: { session: Session }) {
  const { t } = useLingui();
  const [now, setNow] = useState(Date.now);
  const playing = session.round.phase === 'playing';

  useEffect(() => {
    setNow(Date.now());

    if (!playing) {
      return;
    }

    let intervalId: number | undefined;
    const millisecondsToNextSecond = 1000 - (Date.now() % 1000);
    const alignTimeoutId = window.setTimeout(() => {
      setNow(Date.now());
      intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    }, millisecondsToNextSecond);

    return () => {
      window.clearTimeout(alignTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [playing]);

  const elapsedText = formatElapsed(elapsedSeconds(session, now));
  const caption = t({ message: 'elapsed', context: 'timer caption' });

  return (
    <div
      className={`timer ${playing ? 'running' : ''}`}
      id="timer"
      role="timer"
      aria-label={`${caption}: ${elapsedText}`}
    >
      <Icon name="clock" />
      <span id="timer-text" dir="ltr">
        {elapsedText}
      </span>
      <span className="timer-caption">{caption}</span>
    </div>
  );
}
