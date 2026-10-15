import { useLingui } from '@lingui/react/macro';
import { type ClipboardEvent, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Club } from '../content/catalog';
import type { AnswerEvent } from '../game/engine';
import type { Language, Session } from '../game/model';
import { Icon } from './Icon';

const MAX_ANSWER_LENGTH = 12000;
const LINE_BREAKS_AND_TABS = /\s*[\r\n\t]+\s*/g;

const HAS_LINE_BREAK = /[\r\n]/;

/**
 * Turns a multi-line paste into a comma list inserted over the selection,
 * or returns null when the paste has no line breaks and should be left to the browser.
 */
export function pasteIntoValue(
  value: string,
  start: number,
  end: number,
  pasted: string,
  maxLength = MAX_ANSWER_LENGTH,
) {
  if (!HAS_LINE_BREAK.test(pasted)) {
    return null;
  }

  const room = Math.max(maxLength - (value.length - (end - start)), 0);
  const inserted = pasted.trim().replace(LINE_BREAKS_AND_TABS, ', ').slice(0, room);

  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    caret: start + inserted.length,
  };
}

function clubDisplayName(club: Club, language: Language) {
  return language === 'ar' ? club.arabic : club.name;
}

function useFeedbackText(language: Language) {
  const { t } = useLingui();

  return (event: AnswerEvent): string => {
    switch (event.kind) {
      case 'accepted': {
        const name = clubDisplayName(event.club, language);
        return t`${name}. That’s one!`;
      }
      case 'duplicate': {
        const name = clubDisplayName(event.club, language);
        return t`${name} is already on your list. Try another club.`;
      }
      case 'wrong-category': {
        const name = clubDisplayName(event.club, language);
        return t`${name} is a club, but doesn’t fit this challenge.`;
      }
      case 'ambiguous': {
        const input = event.input;
        return t`“${input}” could mean more than one club. Try the full name.`;
      }
      case 'unknown': {
        const input = event.input;
        return t`We couldn’t match “${input}”. Try the full name or another spelling.`;
      }
      default: {
        const exhaustive: never = event;
        return exhaustive;
      }
    }
  };
}

function FeedbackLines({
  feedback,
  language,
}: {
  feedback: readonly AnswerEvent[];
  language: Language;
}) {
  const feedbackText = useFeedbackText(language);

  return (
    <div
      className={`answer-feedback ${feedback.length ? 'error' : ''}`}
      id="answer-feedback"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {feedback.map((event) => (
        <div className="feedback-line" key={`${event.kind}:${event.input}`}>
          {feedbackText(event)}
        </div>
      ))}
    </div>
  );
}

export function AnswerComposer({
  session,
  language,
  feedback,
  maxLength = MAX_ANSWER_LENGTH,
  onSubmit,
  onStart,
}: {
  session: Session;
  language: Language;
  feedback: readonly AnswerEvent[];
  /** Ranked rounds take shorter entries than local ones. */
  maxLength?: number | undefined;
  onSubmit: (text: string) => boolean;
  onStart: () => void;
}) {
  const { t } = useLingui();
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session.round.phase === 'playing') {
      input.current?.focus();
    } else {
      setValue('');
    }
  }, [session.round.phase]);

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const field = event.currentTarget;
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? start;
    const pasted = event.clipboardData.getData('text');
    const result = pasteIntoValue(value, start, end, pasted, maxLength);

    if (!result) {
      return;
    }

    event.preventDefault();
    setValue(result.value);
    requestAnimationFrame(() => field.setSelectionRange(result.caret, result.caret));
  };

  // Focus has to happen inside the tap so iOS raises the keyboard: flush the round start first.
  const handleStart = () => {
    flushSync(onStart);
    input.current?.focus();
  };

  const idle = session.round.phase === 'idle';

  return (
    <div className="answer-composer" id="answer-composer">
      <FeedbackLines feedback={feedback} language={language} />
      <div className="composer-stack">
        {idle && (
          <button className="button button-primary start-round" type="button" onClick={handleStart}>
            {t`Let’s play`}
            <Icon name="arrow" />
          </button>
        )}
        <form
          className={`answer-form ${idle ? 'is-hidden' : ''}`}
          inert={idle}
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
          <div className="input-wrapper">
            <Icon name="ball" className="input-ball" />
            <input
              ref={input}
              id="club-input"
              type="text"
              dir="auto"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={maxLength}
              aria-label={t`Type a club name in English or Arabic`}
              placeholder={t`Type a club name…`}
              disabled={session.round.phase !== 'playing'}
              value={value}
              onChange={(event) => setValue(event.currentTarget.value)}
              onPaste={handlePaste}
            />
            <button
              className="submit-answer"
              type="submit"
              aria-label={t`Submit answer`}
              disabled={session.round.phase !== 'playing'}
            >
              <Icon name="arrow" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
