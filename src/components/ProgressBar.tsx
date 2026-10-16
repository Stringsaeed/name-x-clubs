import { useLingui } from '@lingui/react/macro';
import type { Level } from '../game/model';

type ProgressBarProps = {
  level: Level;
  foundCount: number;
};

export function ProgressBar({ level, foundCount }: ProgressBarProps) {
  const { t } = useLingui();

  return (
    <>
      <div className="progress-heading">
        <span>{t`YOUR CLUBS`}</span>
        <span className="progress-count">
          <strong id="found-count">{foundCount}</strong>
          <span id="target-count"> / {level}</span>
        </span>
      </div>
      <progress id="round-progress" max={level} value={foundCount} aria-label={t`YOUR CLUBS`} />
    </>
  );
}
