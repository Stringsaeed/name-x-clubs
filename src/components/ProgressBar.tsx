import { messages } from '../content/messages';
import type { Level } from '../game/model';
import type { Locale } from '../i18n/config';

type ProgressBarProps = {
  language: Locale;
  level: Level;
  foundCount: number;
  playing: boolean;
  onFinish: () => void;
};

export function ProgressBar({ language, level, foundCount, playing, onFinish }: ProgressBarProps) {
  const t = messages[language];

  return (
    <>
      <div className="progress-heading">
        <span>{t.yourClubs}</span>
        <div className="progress-actions">
          {playing && (
            <button className="text-button" type="button" onClick={onFinish}>
              {t.finish}
            </button>
          )}
          <span className="progress-count">
            <strong id="found-count">{foundCount}</strong>
            <span id="target-count"> / {level}</span>
          </span>
        </div>
      </div>
      <progress id="round-progress" max={level} value={foundCount} aria-label={t.yourClubs} />
    </>
  );
}
