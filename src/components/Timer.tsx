import { useEffect, useState } from 'react';
import { messages } from '../content/messages';
import { timeRemaining } from '../game/controller';
import type { Language, Session } from '../game/model';
import { Icon } from './Icon';
export function Timer({ session, language }: { session: Session; language: Language }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (session.kind !== 'daily' || session.round.phase !== 'playing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [session]);
  const remaining = timeRemaining(session, now);
  const active = session.kind === 'daily' && session.round.phase === 'playing';
  const label = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return (
    <div
      className={`timer ${active ? 'running' : ''} ${active && remaining <= 10 ? 'urgent' : ''}`}
      id="timer"
      role="timer"
      aria-label={
        session.kind === 'practice'
          ? messages[language].untimed
          : `${remaining} ${language === 'en' ? 'seconds remaining' : 'ثانية متبقية'}`
      }
    >
      <Icon name="clock" />
      <span id="timer-text">{session.kind === 'practice' ? '∞' : label}</span>
      <span className="timer-caption">
        {session.kind === 'practice' ? messages[language].noClock : messages[language].onTheClock}
      </span>
    </div>
  );
}
