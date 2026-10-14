import { memo } from 'react';
import { type Level, levels } from '../game/model';
import type { Locale } from '../i18n/config';

const text = {
  en: { pickerLabel: 'Choose a mode', levelPrefix: 'Mode' },
  ar: { pickerLabel: 'اختر الوضع', levelPrefix: 'وضع' },
} as const;

type LevelPickerProps = {
  language: Locale;
  level: Level;
  onLevelChange: (level: Level) => void;
};

export const LevelPicker = memo(function LevelPickerView({
  language,
  level,
  onLevelChange,
}: LevelPickerProps) {
  const local = text[language];

  return (
    <fieldset className="level-picker" aria-label={local.pickerLabel}>
      {levels.map((target) => (
        <button
          className={`level-button ${level === target ? 'active' : ''}`}
          type="button"
          aria-pressed={target === level}
          data-level={target}
          key={target}
          onClick={() => onLevelChange(target)}
        >
          <strong>
            {local.levelPrefix} {target}
          </strong>
        </button>
      ))}
    </fieldset>
  );
});
