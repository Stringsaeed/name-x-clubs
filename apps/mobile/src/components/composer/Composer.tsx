import { StyleSheet, View } from 'react-native';
import { maxEntryLength } from '../../../../web/src/game/ranked/answerQueue';
import type { Copy } from '../../copy';
import type { PlayActions, PlaySnapshot } from '../../game/play';
import { spacing } from '../../theme/tokens';
import { Button } from '../../ui';
import { AnswerField } from './AnswerField';
import { EndRoundButton } from './EndRoundButton';
import { FeedbackLines } from './FeedbackLines';

export type ComposerProps = Readonly<{
  snapshot: PlaySnapshot;
  actions: PlayActions;
  copy: Copy;
}>;

/** The bottom block before and during a round: `Let’s play`, then the answer field. */
export function Composer({ snapshot, actions, copy }: ComposerProps) {
  const { view, ranked } = snapshot;

  if (view.session.round.phase === 'idle') {
    return (
      <Button
        block
        label={copy.letsPlay}
        trailingIcon="arrow"
        cue="start"
        onPress={actions.startRound}
        style={styles.play}
      />
    );
  }

  // The server rejects longer entries in ranked rounds.
  const limited = ranked?.status === 'connecting' || ranked?.status === 'live';

  return (
    <View style={styles.composer}>
      <View style={styles.row}>
        <EndRoundButton copy={copy} onFinish={actions.finishRound} />
        <View style={styles.field}>
          <AnswerField
            copy={copy}
            foundCount={view.session.round.found.length}
            maxLength={limited ? maxEntryLength : undefined}
            onSubmit={actions.submitAnswer}
          />
        </View>
      </View>
      <FeedbackLines feedback={view.feedback} />
    </View>
  );
}

const styles = StyleSheet.create({
  play: {
    minHeight: 52,
  },
  composer: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
});
