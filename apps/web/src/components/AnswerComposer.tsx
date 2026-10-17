import { useLingui } from '@lingui/react/macro';
import { Button } from '@/components/ui/button';
import type { Club } from '../content/catalog';
import type { AnswerEvent } from '../game/engine';
import type { Language, Session } from '../game/model';
import { useAnswerDraft } from '../hooks/useAnswerDraft';
import { ClubKeyboard } from './ClubKeyboard';
import { ArrowGameIcon } from './fluidGameIcons';
import { Icon } from './Icon';

const MAX_ANSWER_LENGTH = 12000;

export { pasteIntoValue } from './answerEdit';

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

function ComposerKeyboard({ draft }: { draft: ReturnType<typeof useAnswerDraft> }) {
  const { t } = useLingui();

  return (
    <>
      {draft.gameKeyboard.offered && !draft.gameKeyboard.active && (
        <Button
          className="game-keyboard-toggle"
          type="button"
          variant="ghost"
          onClick={draft.useInPageKeyboard}
        >
          {t`Game keyboard`}
        </Button>
      )}
      {draft.gameKeyboard.active && (
        <>
          <Button
            className="game-keyboard-toggle"
            type="button"
            variant="ghost"
            data-keyboard="system"
            onClick={draft.useSystemKeyboard}
          >
            {t`System keyboard`}
          </Button>
          <ClubKeyboard
            shift={draft.shift}
            onShift={draft.toggleShift}
            onCharacter={draft.typeCharacter}
            onDelete={draft.remove}
            onSubmit={draft.submit}
          />
        </>
      )}
    </>
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
  const draft = useAnswerDraft(session, maxLength, onSubmit, onStart);
  const idle = session.round.phase === 'idle';

  return (
    <div className="answer-composer" id="answer-composer">
      <FeedbackLines feedback={feedback} language={language} />
      <div className="composer-stack">
        {idle && (
          <Button
            className="start-round"
            type="button"
            trailingIcon={ArrowGameIcon}
            onClick={draft.start}
          >
            {t`Let’s play`}
          </Button>
        )}
        <form
          className={`answer-form ${idle ? 'is-hidden' : ''}`}
          inert={idle}
          id="answer-form"
          onSubmit={(event) => {
            event.preventDefault();
            draft.submit();
          }}
        >
          <div className="input-wrapper">
            <Icon name="ball" className="input-ball" />
            <input
              ref={draft.input}
              id="club-input"
              type="text"
              dir="auto"
              inputMode={draft.gameKeyboard.active ? 'none' : 'text'}
              readOnly={draft.gameKeyboard.active}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={maxLength}
              aria-label={t`Type a club name in English or Arabic`}
              placeholder={t`Type a club name…`}
              disabled={session.round.phase !== 'playing'}
              value={draft.value}
              onChange={draft.onChange}
              onSelect={draft.onSelect}
              onPaste={draft.onPaste}
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
          <ComposerKeyboard draft={draft} />
        </form>
      </div>
    </div>
  );
}
