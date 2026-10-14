import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { t } = useLingui();

  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal();
    }

    if (!open && dialog.current?.open) {
      dialog.current.close();
    }
  }, [open]);

  const tips = [
    t`Use English or Arabic, with or without accents. Small spelling mistakes are fine when the club is clear.`,
    t`Send one name at a time, or a list separated by commas, newlines, or “and”.`,
    t`If a name could mean more than one club, add the city or country. Different names for the same club only count once.`,
    t`Your progress and elapsed time are saved in this browser.`,
  ];

  return (
    <dialog
      ref={dialog}
      className="help-dialog"
      aria-labelledby="help-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <button className="dialog-close" type="button" aria-label={t`Close`} onClick={onClose}>
        <Icon name="close" />
      </button>
      <span className="dialog-ball">
        <Icon name="ball" />
      </span>
      <h2 id="help-title">{t`How many clubs have you got?`}</h2>
      <p>
        {t`Name 10, 50 or 100 clubs at your own pace. The clock measures how long you take. Practice adds countries, regions and letters.`}
      </p>
      <div className="help-example">
        <strong>{t`One club, many ways to say it`}</strong>
        <span dir="auto">Manchester United · Man Utd · مانشستر يونايتد</span>
      </div>
      <ul>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <p className="help-footnote">
        {t`This first edition includes a curated club collection, not every club in the world. If we miss one, try its full name.`}
      </p>
      <button className="button button-primary" type="button" onClick={onClose}>
        {t`Got it. Let’s play.`}
      </button>
    </dialog>
  );
}
