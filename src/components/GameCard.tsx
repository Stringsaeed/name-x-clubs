import { useLingui } from '@lingui/react/macro';
import { Button } from '@/components/ui/button';
import type { GameView } from '../game/controller';
import { maxEntryLength } from '../game/ranked/answerQueue';
import type { RankedSnapshot } from '../game/ranked/RankedRound';
import { isRankedRoundOf, rankedOutcome } from '../game/ranked/rankedView';
import type { useGameActions } from '../hooks/useGameActions';
import type { Locale } from '../i18n/config';
import '../styles/album.css';
import '../styles/ranked.css';
import { AnswerComposer } from './AnswerComposer';
import { ChallengeHeading } from './ChallengeHeading';
import { LevelPicker } from './LevelPicker';
import { PracticeControls } from './PracticeControls';
import { ProgressBar } from './ProgressBar';
import { ResultPanel } from './ResultPanel';
import { StickerAlbum } from './StickerAlbum';

type GameCardProps = {
  view: GameView;
  ranked: RankedSnapshot | null;
  language: Locale;
  actions: ReturnType<typeof useGameActions>;
  notify: (message: string) => void;
};

function NotRankedBadge() {
  const { t } = useLingui();

  return <p className="ranked-badge">{t`Not ranked`}</p>;
}

export function GameCard({ view, ranked, language, actions, notify }: GameCardProps) {
  const { session, mode, level } = view;
  const { t } = useLingui();
  const phase = session.round.phase;
  const category = session.kind === 'practice' ? session.category : 'world';
  const roundKey = `${session.kind}:${session.challenge.id}:${level}`;
  const rankedRound = isRankedRoundOf(view, ranked) ? ranked : null;
  const unranked = rankedRound?.status === 'unranked';
  const sendsToServer = rankedRound?.status === 'connecting' || rankedRound?.status === 'live';

  return (
    <section className="game-card" id="game-card" aria-labelledby="challenge-title">
      <div className="album-top">
        <div className="album-controls">
          <LevelPicker
            level={level}
            locked={phase === 'playing'}
            onLevelChange={actions.changeLevel}
          />
          {mode === 'practice' && (
            <PracticeControls
              level={level}
              category={category}
              locked={phase === 'playing'}
              onCategoryChange={actions.changeCategory}
            />
          )}
          {unranked && phase === 'playing' && <NotRankedBadge />}
          {phase === 'playing' && (
            <Button
              type="button"
              variant="destructive"
              size="compact"
              className="finish-round"
              onClick={actions.finishRound}
            >
              {t`Finish round`}
            </Button>
          )}
        </div>
        <div className="album-deck">
          <ChallengeHeading session={session} />
          <div className="album-progress">
            <ProgressBar level={level} foundCount={session.round.found.length} />
          </div>
        </div>
      </div>
      <StickerAlbum
        key={`album:${roundKey}`}
        found={session.round.found}
        level={level}
        language={language}
        playing={phase === 'playing'}
      />
      <div className="album-bottom">
        {!view.storageAvailable && (
          <p className="storage-notice" role="status">
            {t`Your browser couldn’t save this round. Keep this tab open.`}
          </p>
        )}
        {phase === 'complete' ? (
          <ResultPanel
            session={session}
            outcome={rankedOutcome(view, ranked)}
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
            maxLength={sendsToServer ? maxEntryLength : undefined}
            onSubmit={actions.submitAnswer}
            onStart={actions.startRound}
          />
        )}
      </div>
    </section>
  );
}
