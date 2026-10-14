import { useLingui } from '@lingui/react/macro';
import type { Level } from '../game/model';

type ProgressBarProps = {
  level: Level;
  foundCount: number;
  playing: boolean;
  onFinish: () => void;
};

export function ProgressBar({ level, foundCount, playing, onFinish }: ProgressBarProps) {
  const { t } = useLingui();

  return (
    <>
      <div className="progress-heading">
        <span>{t`YOUR CLUBS`}</span>
        <div className="progress-actions">
          {playing && (
            <button className="text-button" type="button" onClick={onFinish}>
              {t`Finish round`}
            </button>
          )}
          <span className="progress-count">
            <strong id="found-count">{foundCount}</strong>
            <span id="target-count"> / {level}</span>
          </span>
        </div>
      </div>
      <progress id="round-progress" max={level} value={foundCount} aria-label={t`YOUR CLUBS`} />
    </>
  );
}
