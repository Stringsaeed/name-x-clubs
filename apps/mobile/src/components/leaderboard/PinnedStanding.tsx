import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatElapsed, formatRelative } from '../../../../web/src/components/leaderboard/format';
import { copyFor } from '../../copy';
import type { MyStanding } from '../../game/leaderboard';
import { useLanguage } from '../../game/play';
import { useColors } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';

const pinnedRowHeight = 56;
const pinnedGap = 8;

/** Space the pinned row takes above the bottom inset: the row, its gap below and some air. */
export const pinnedHeight = pinnedRowHeight + pinnedGap + 12;

export type PinnedStandingProps = Readonly<{
  standing: MyStanding;
  now: number;
}>;

/** The player's own place when it is not among the rows on screen. */
export function PinnedStanding({ standing, now }: PinnedStandingProps) {
  const colors = useColors();
  const language = useLanguage();
  const copy = copyFor(language);
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.delay(200)}
      style={[
        styles.row,
        {
          backgroundColor: colors.lime,
          shadowColor: colors.shadow,
          bottom: insets.bottom + pinnedGap,
        },
      ]}
    >
      <AppText latin tabular weight={1000} size={16} color={colors.onAccent} style={styles.rank}>
        {standing.rank}
      </AppText>
      <View style={styles.name}>
        <AppText weight={900} size={16} color={colors.onAccent} numberOfLines={1}>
          {copy.you}
        </AppText>
      </View>
      <AppText latin tabular weight={1000} size={16} color={colors.onAccent}>
        {formatElapsed(standing.best.elapsedMs)}
      </AppText>
      <AppText weight={700} size={11} color={colors.onAccent} numberOfLines={1} style={styles.when}>
        {formatRelative(standing.best.achievedAt, now, language)}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: pinnedRowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
  rank: {
    width: 36,
  },
  name: {
    flex: 1,
  },
  when: {
    width: 48,
    textAlign: 'center',
  },
});
