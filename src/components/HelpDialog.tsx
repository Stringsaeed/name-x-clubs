import { useEffect, useRef } from 'react';
import { messages } from '../content/messages';
import type { Language } from '../game/model';
import { Icon } from './Icon';
export function HelpDialog({
  open,
  language,
  onClose,
}: {
  open: boolean;
  language: Language;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const t = messages[language];
  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal();
    }
    if (!open && dialog.current?.open) {
      dialog.current.close();
    }
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="help-dialog"
      aria-labelledby="help-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <button className="dialog-close" type="button" aria-label={t.helpClose} onClick={onClose}>
        <Icon name="close" />
      </button>
      <span className="dialog-ball">
        <Icon name="ball" />
      </span>
      <h2 id="help-title">{t.helpTitle}</h2>
      <p>{t.helpIntro}</p>
      <div className="help-example">
        <strong>{t.helpExampleTitle}</strong>
        <span dir="auto">Manchester United · Man Utd · مانشستر يونايتد</span>
      </div>
      <ul>
        {[t.help1, t.help2, t.help3, t.help4].map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="help-footnote">{t.helpFootnote}</p>
      <button className="button button-primary" type="button" onClick={onClose}>
        {t.gotIt}
      </button>
    </dialog>
  );
}
