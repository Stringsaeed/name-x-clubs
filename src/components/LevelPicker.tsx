import { useLingui } from '@lingui/react/macro';
import { memo } from 'react';
import { type Level, levels } from '../game/model';

type LevelPickerProps = {
  level: Level;
  locked: boolean;
  onLevelChange: (level: Level) => void;
};

export const LevelPicker = memo(function LevelPickerView({
  level,
  locked,
  onLevelChange,
}: LevelPickerProps) {
  const { t } = useLingui();

  return (
    <fieldset className="level-picker" aria-label={t`Choose a mode`}>
      {levels.map((target) => (
        <button
          className={`level-button ${level === target ? 'active' : ''}`}
          type="button"
          disabled={locked}
          aria-disabled={locked}
          aria-pressed={target === level}
          data-level={target}
          key={target}
          onClick={() => onLevelChange(target)}
        >
          <strong>{t({ message: `Mode ${target}`, context: 'difficulty level button' })}</strong>
        </button>
      ))}
    </fieldset>
  );
});
