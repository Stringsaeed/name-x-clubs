import { useLingui } from '@lingui/react/macro';
import type { GameView } from '../game/controller';
import type { useGameActions } from '../hooks/useGameActions';
import type { Locale } from '../i18n/config';
import { AnswerComposer } from './AnswerComposer';
import { AnswerList } from './AnswerList';
import { ChallengeHeading } from './ChallengeHeading';
import { LevelPicker } from './LevelPicker';
import { PracticeControls } from './PracticeControls';
import { ProgressBar } from './ProgressBar';
import { ResultPanel } from './ResultPanel';

type GameCardProps = {
  view: GameView;
  language: Locale;
  actions: ReturnType<typeof useGameActions>;
  notify: (message: string) => void;
};

export function GameCard({ view, language, actions, notify }: GameCardProps) {
  const { session, mode, level } = view;
  const { t } = useLingui();
  const phase = session.round.phase;
  const category = session.kind === 'practice' ? session.category : 'world';
  const roundKey = `${session.kind}:${session.challenge.id}:${level}`;

  return (
    <section className="game-card" id="game-card" aria-labelledby="challenge-title">
      <LevelPicker level={level} locked={phase === 'playing'} onLevelChange={actions.changeLevel} />
      {mode === 'practice' && (
        <PracticeControls
          level={level}
          category={category}
          locked={phase === 'playing'}
          onCategoryChange={actions.changeCategory}
        />
      )}
      <ChallengeHeading session={session} />
      <ProgressBar
        level={level}
        foundCount={session.round.found.length}
        playing={phase === 'playing'}
        onFinish={actions.finishRound}
      />
      <AnswerList
        key={`list:${roundKey}`}
        found={session.round.found}
        language={language}
        showEmpty={phase !== 'complete'}
      />
      {!view.storageAvailable && (
        <p className="storage-notice" role="status">
          {t`Your browser couldn’t save this round. Keep this tab open.`}
        </p>
      )}
      {phase === 'complete' ? (
        <ResultPanel
          session={session}
          language={language}
          onShare={actions.shareResult}
          notify={notify}
          onNext={actions.nextRound}
        />
      ) : (
        <AnswerComposer
          key={`composer:${roundKey}`}
          session={session}
          language={language}
          feedback={view.feedback}
          onSubmit={actions.submitAnswer}
          onStart={actions.startRound}
        />
      )}
    </section>
  );
}
