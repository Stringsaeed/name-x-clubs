import { useEffect, useRef, useState } from 'react';
import { messages } from '../content/messages';
import type { AnswerEvent } from '../game/engine';
import type { Language, Session } from '../game/model';
import { Icon } from './Icon';

function feedbackText(event: AnswerEvent, language: Language) {
  const t = messages[language];
  switch (event.kind) {
    case 'accepted':
      return t.accepted(language === 'en' ? event.club.name : event.club.arabic);
    case 'duplicate':
      return t.duplicate(language === 'en' ? event.club.name : event.club.arabic);
    case 'wrong-category':
      return t.wrong(language === 'en' ? event.club.name : event.club.arabic);
    case 'ambiguous':
      return t.ambiguous(event.input);
    case 'unknown':
      return t.unknown(event.input);
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}
export function AnswerComposer({
  session,
  language,
  feedback,
  onSubmit,
}: {
  session: Session;
  language: Language;
  feedback: readonly AnswerEvent[];
  onSubmit: (text: string) => boolean;
}) {
  const t = messages[language];
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (session.round.phase === 'playing') {
      input.current?.focus();
    } else {
      setValue('');
    }
  }, [session.round.phase]);
  return (
    <div className="answer-composer" id="answer-composer">
      <div
        className={`answer-feedback ${feedback.length ? 'error' : ''}`}
        id="answer-feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback.map((event) => (
          <div className="feedback-line" key={`${event.kind}:${event.input}`}>
            {feedbackText(event, language)}
          </div>
        ))}
      </div>
      <form
        className="answer-form"
        id="answer-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) {
            return;
          }
          const accepted = onSubmit(value.trim());
          if (accepted) {
            setValue('');
          } else {
            input.current?.select();
          }
        }}
      >
        <div className={`input-wrapper ${session.round.phase === 'idle' ? 'inactive' : ''}`}>
          <Icon name="ball" className="input-ball" />
          <input
            ref={input}
            id="club-input"
            type="text"
            dir="auto"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={12000}
            aria-label={t.inputLabel}
            placeholder={t.placeholder}
            disabled={session.round.phase !== 'playing'}
            value={value}
            onChange={(event) => setValue(event.currentTarget.value)}
          />
          <button
            className="submit-answer"
            type="submit"
            aria-label={t.submit}
            disabled={session.round.phase !== 'playing'}
          >
            <Icon name="arrow" />
          </button>
        </div>
      </form>
    </div>
  );
}
