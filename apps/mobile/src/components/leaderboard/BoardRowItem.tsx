import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatElapsed, formatRelative } from '../../../../web/src/components/leaderboard/format';
import type { BoardRow } from '../../game/leaderboard';
import { useLanguage } from '../../game/play';
import { useColors } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { PlayerName } from './PlayerName';
import { ShieldAvatar } from './ShieldAvatar';

/** Rows past the first screenful skip the entrance so scrolling back never replays it. */
const animatedRows = 14;
const rowStaggerMs = 20;
const maxDelayMs = 400;

export const rowHeight = 52;

export type BoardRowItemProps = Readonly<{
  entry: BoardRow;
  /** Position in the list (rank 4 is 0), drives the stagger. */
  index: number;
  mine: boolean;
  now: number;
}>;

function BoardRowView({ entry, index, mine, now }: BoardRowItemProps) {
  const colors = useColors();
  const language = useLanguage();
  const textColor = mine ? colors.onAccent : colors.ink;
  const mutedColor = mine ? colors.onAccent : colors.muted;
  const striped = entry.rank % 2 === 0 ? colors.soft : colors.card;
  const entering =
    index < animatedRows
      ? { entering: FadeInDown.delay(Math.min(index * rowStaggerMs, maxDelayMs)) }
      : {};

  return (
    <Animated.View
      {...entering}
      style={[
        styles.row,
        mine
          ? { backgroundColor: colors.lime, borderColor: colors.lime }
          : { backgroundColor: striped, borderColor: colors.line },
      ]}
    >
      <AppText latin tabular weight={1000} size={15} color={mutedColor} style={styles.rank}>
        {entry.rank}
      </AppText>
      <ShieldAvatar name={entry.name} anonymous={entry.anonymous} width={24} />
      <View style={styles.name}>
        <PlayerName
          name={entry.name}
          weight={entry.anonymous ? 700 : 800}
          size={15}
          color={entry.anonymous ? mutedColor : textColor}
        />
      </View>
      <AppText latin tabular weight={1000} size={15} color={textColor}>
        {formatElapsed(entry.elapsedMs)}
      </AppText>
      <AppText weight={700} size={11} color={mutedColor} numberOfLines={1} style={styles.when}>
        {formatRelative(entry.achievedAt, now, language)}
      </AppText>
    </Animated.View>
  );
}

export const BoardRowItem = memo(BoardRowView);

const styles = StyleSheet.create({
  row: {
    height: rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  rank: {
    width: 32,
  },
  name: {
    flex: 1,
  },
  when: {
    width: 48,
    textAlign: 'center',
  },
});
