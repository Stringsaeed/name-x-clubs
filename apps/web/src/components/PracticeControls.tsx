import { useLingui } from '@lingui/react/macro';
import { challengesForLevel } from '@nxc/game/engine';
import type { Language, Level } from '@nxc/game/model';
import { memo, useMemo } from 'react';
import { categoryLabel, sortChallengesForPicker } from '../content/labels';
import { Icon } from './Icon';

type PracticeControlsProps = {
  level: Level;
  category: string;
  locked: boolean;
  onCategoryChange: (category: string) => void;
};

export const PracticeControls = memo(function PracticeControlsView({
  level,
  category,
  locked,
  onCategoryChange,
}: PracticeControlsProps) {
  const { t, i18n } = useLingui();
  const language = i18n.locale as Language;
  const challenges = useMemo(
    () => sortChallengesForPicker(challengesForLevel(level), language),
    [level, language],
  );

  return (
    <div className="practice-controls">
      <label htmlFor="practice-category">{t`Pick your pitch`}</label>
      <div className="category-row">
        <select
          id="practice-category"
          aria-label={t`Pick your pitch`}
          value={category}
          disabled={locked}
          aria-disabled={locked}
          onChange={(event) => onCategoryChange(event.currentTarget.value)}
        >
          {challenges.map((challenge) => (
            <option value={challenge.id} key={challenge.id}>
              {categoryLabel(i18n, challenge)}
            </option>
          ))}
          <option value="random">{t`A random challenge`}</option>
        </select>
        <button
          className="shuffle-button"
          type="button"
          disabled={locked}
          aria-disabled={locked}
          onClick={() => onCategoryChange('random')}
        >
          <Icon name="shuffle" />
          {t`Surprise me`}
        </button>
      </div>
    </div>
  );
});
