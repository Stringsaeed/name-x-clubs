import { StyleSheet, View } from 'react-native';
import type { RankedOutcome } from '../../../../web/src/game/ranked/rankedView';
import type { Copy } from '../../copy';
import { type PlayActions, type PlaySnapshot, useRankedOutcome } from '../../game/play';
import { spacing } from '../../theme/tokens';
import { Button, Card } from '../../ui';
import { LocalSummary } from './LocalSummary';
import { RankedSummary, type ServerOutcome } from './RankedSummary';

export type ResultPanelProps = Readonly<{
  snapshot: PlaySnapshot;
  actions: PlayActions;
  copy: Copy;
}>;

function isServerOutcome(outcome: RankedOutcome): outcome is ServerOutcome {
  return outcome.kind !== 'local' && outcome.kind !== 'unranked';
}

/** The finished round: the local summary, or the server's verdict for a ranked one. */
export function ResultPanel({ snapshot, actions, copy }: ResultPanelProps) {
  const outcome = useRankedOutcome();
  const session = snapshot.view.session;
  const round = session.round;

  if (round.phase !== 'complete') {
    return null;
  }

  return (
    <Card padded style={styles.panel}>
      {isServerOutcome(outcome) ? (
        <RankedSummary session={session} round={round} outcome={outcome} copy={copy} />
      ) : (
        <LocalSummary
          session={session}
          round={round}
          unranked={outcome.kind === 'unranked'}
          copy={copy}
        />
      )}
      <View style={styles.actions}>
        <Button
          label={copy.shareResult}
          leadingIcon="share"
          cue="share"
          onPress={() => {
            void actions.shareResult();
          }}
          style={styles.action}
        />
        <Button
          variant="outline"
          label={copy.anotherRound}
          trailingIcon="arrow"
          onPress={actions.nextRound}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    alignSelf: 'auto',
    paddingHorizontal: spacing.md,
  },
});
