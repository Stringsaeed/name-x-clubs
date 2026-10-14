import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import type { GameController } from '../game/controller';
import { formatElapsed } from '../game/controller';
import type { Language, Session } from '../game/model';
import { Icon } from './Icon';
export function ResultPanel({
  session,
  language,
  onShare,
  onNext,
  notify,
}: {
  session: Session;
  language: Language;
  onShare: GameController['shareResult'];
  onNext: () => void;
  notify: (text: string) => void;
}) {
  const { t } = useLingui();
  const [manual, setManual] = useState('');
  const copy = useRef<HTMLTextAreaElement>(null);
  const share = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    share.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (manual) {
      copy.current?.focus();
      copy.current?.select();
    }
  }, [manual]);
  if (session.round.phase !== 'complete') {
    return null;
  }
  const target = session.challenge.target;
  const won = session.round.found.length === target;
  const body = `${session.round.found.length} / ${target} · ${formatElapsed(session.round.elapsed)}`;
  return (
    <div className="result-panel" id="result-panel">
      <div className="result-header">
        <span className={`result-icon ${won ? 'celebrate' : ''}`}>
          <Icon name={won ? 'trophy' : 'ball'} />
        </span>
        <div>
          <h3>{won ? t`You know ball.` : t`Good shift.`}</h3>
          <p>{body}</p>
        </div>
      </div>
      <div className="result-actions">
        <button
          ref={share}
          className="button button-primary"
          type="button"
          onClick={async () => {
            const result = await onShare(language);
            if (result.kind === 'copied') {
              notify(t`Result copied. Send it to your football friends.`);
            }
            if (result.kind === 'manual') {
              setManual(result.text);
              notify(t`Select and copy your result below.`);
            }
          }}
        >
          <Icon name="share" />
          {t`Share result`}
        </button>
        <button className="button button-outline" type="button" onClick={onNext}>
          {t`Another round`}
          <Icon name="arrow" />
        </button>
      </div>
      {manual && (
        <textarea
          ref={copy}
          className="copy-box"
          aria-label={t`Share result`}
          rows={5}
          value={manual}
          readOnly
        />
      )}
    </div>
  );
}
