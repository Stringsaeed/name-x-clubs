import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { CompletedRound, Session } from '../../../../web/src/game/model';
import type { Copy } from '../../copy';
import { formatElapsed } from '../../game/engine';
import { useColors } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';
import { AppText, Icon } from '../../ui';
import { Chip } from '../Chip';

export type LocalSummaryProps = Readonly<{
  session: Session;
  round: CompletedRound;
  /** Meant to be ranked, but played on this phone only. */
  unranked: boolean;
  copy: Copy;
}>;

/** The club count and the time, for rounds the server does not rank. */
export function LocalSummary({ session, round, unranked, copy }: LocalSummaryProps) {
  const colors = useColors();
  const target = session.challenge.target;
  const won = round.found.length === target;

  return (
    <View style={styles.row}>
      <Badge won={won} />
      <View style={styles.text}>
        <AppText weight={1000} size={22} lineHeight={27} numberOfLines={1}>
          {won ? copy.youKnowBall : copy.goodShift}
        </AppText>
        <AppText latin tabular weight={800} size={14} color={colors.muted}>
          {`${round.found.length} / ${target} · ${formatElapsed(round.elapsed)}`}
        </AppText>
      </View>
      {unranked ? <Chip label={copy.notRankedChip} tone="warning" /> : null}
    </View>
  );
}

/** The lime square: a trophy that wiggles once when the target was reached, else a ball. */
function Badge({ won }: Readonly<{ won: boolean }>) {
  const colors = useColors();
  const rotation = useSharedValue(0);
  const wiggle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const tint = useMemo(() => ({ backgroundColor: colors.lime }), [colors]);

  useEffect(() => {
    if (!won) {
      return;
    }

    rotation.value = withSequence(
      withTiming(-12, { duration: 90 }),
      withTiming(10, { duration: 110 }),
      withTiming(-6, { duration: 100 }),
      withTiming(0, { duration: 100 }),
    );
  }, [won, rotation]);

  return (
    <Animated.View style={[styles.badge, tint, wiggle]}>
      <Icon name={won ? 'trophy' : 'ball'} size={22} color={colors.onAccent} strokeWidth={1.9} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
