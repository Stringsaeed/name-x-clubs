import { memo } from 'react';
import { categoryLabel } from '../content/labels';
import { messages } from '../content/messages';
import { challengesForLevel } from '../game/engine';
import type { Level } from '../game/model';
import type { Locale } from '../i18n/config';
import { Icon } from './Icon';

type PracticeControlsProps = {
  language: Locale;
  level: Level;
  category: string;
  onCategoryChange: (category: string) => void;
};

export const PracticeControls = memo(function PracticeControlsView({
  language,
  level,
  category,
  onCategoryChange,
}: PracticeControlsProps) {
  const t = messages[language];

  return (
    <div className="practice-controls">
      <label htmlFor="practice-category">{t.pickCategory}</label>
      <div className="category-row">
        <select
          id="practice-category"
          aria-label={t.pickCategory}
          value={category}
          onChange={(event) => onCategoryChange(event.currentTarget.value)}
        >
          {challengesForLevel(level).map((challenge) => (
            <option value={challenge.id} key={challenge.id}>
              {categoryLabel(challenge, language)}
            </option>
          ))}
          <option value="random">{t.surpriseCategory}</option>
        </select>
        <button className="shuffle-button" type="button" onClick={() => onCategoryChange('random')}>
          <Icon name="shuffle" />
          {t.surprise}
        </button>
      </div>
    </div>
  );
});
