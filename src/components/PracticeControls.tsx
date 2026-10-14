import { useLingui } from '@lingui/react/macro';
import { memo } from 'react';
import { categoryLabel } from '../content/labels';
import { challengesForLevel } from '../game/engine';
import type { Level } from '../game/model';
import { Icon } from './Icon';

type PracticeControlsProps = {
  level: Level;
  category: string;
  onCategoryChange: (category: string) => void;
};

export const PracticeControls = memo(function PracticeControlsView({
  level,
  category,
  onCategoryChange,
}: PracticeControlsProps) {
  const { t, i18n } = useLingui();

  return (
    <div className="practice-controls">
      <label htmlFor="practice-category">{t`Pick your pitch`}</label>
      <div className="category-row">
        <select
          id="practice-category"
          aria-label={t`Pick your pitch`}
          value={category}
          onChange={(event) => onCategoryChange(event.currentTarget.value)}
        >
          {challengesForLevel(level).map((challenge) => (
            <option value={challenge.id} key={challenge.id}>
              {categoryLabel(i18n, challenge)}
            </option>
          ))}
          <option value="random">{t`A random challenge`}</option>
        </select>
        <button className="shuffle-button" type="button" onClick={() => onCategoryChange('random')}>
          <Icon name="shuffle" />
          {t`Surprise me`}
        </button>
      </div>
    </div>
  );
});
