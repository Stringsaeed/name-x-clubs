import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { formatElapsed } from '../../../../web/src/components/leaderboard/format';
import { copyFor } from '../../copy';
import { type BoardRow, isMine, type MyStanding } from '../../game/leaderboard';
import { useLanguage } from '../../game/play';
import { useColors } from '../../theme/ThemeProvider';
import { type Colors, radii } from '../../theme/tokens';
import { AppText } from '../../ui/AppText';
import { Card } from '../../ui/Card';
import { PlayerName } from './PlayerName';
import { ShieldAvatar } from './ShieldAvatar';

const popSpring = { damping: 9, stiffness: 220, mass: 0.7 } as const;
const staggerMs = 60;
const nameSize = 13;
const nameLineHeight = 16;
const nameLines = 2;

type Place = 1 | 2 | 3;

type Slot = Readonly<{ place: Place; entry: BoardRow | undefined }>;

export type PodiumProps = Readonly<{
  /** The top three rows in rank order. */
  entries: readonly BoardRow[];
  mine: MyStanding | undefined;
}>;

/** Second place sits before the winner and third after it. */
export function Podium({ entries, mine }: PodiumProps) {
  const slots: readonly Slot[] = [
    { place: 2, entry: entries[1] },
    { place: 1, entry: entries[0] },
    { place: 3, entry: entries[2] },
  ];

  return (
    <View style={styles.row}>
      {slots.map(({ place, entry }) =>
        entry ? (
          <PodiumCard key={entry.rank} place={place} entry={entry} mine={isMine(entry, mine)} />
        ) : (
          <View key={`empty-${place}`} style={styles.slot} />
        ),
      )}
    </View>
  );
}

function medalTint(place: Place, colors: Colors) {
  switch (place) {
    case 1:
      return { backgroundColor: colors.lime, color: colors.onAccent };
    case 2:
      return { backgroundColor: colors.soft, color: colors.ink };
    default:
      return { backgroundColor: colors.warningBg, color: colors.warning };
  }
}

function Medal({ place, rank }: Readonly<{ place: Place; rank: number }>) {
  const colors = useColors();
  const scale = useSharedValue(0.6);
  const tint = medalTint(place, colors);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    scale.value = withDelay((place - 1) * staggerMs + 120, withSpring(1, popSpring));
  }, [scale, place]);

  return (
    <View pointerEvents="none" style={styles.medalWrap}>
      <Animated.View
        style={[
          styles.medal,
          { backgroundColor: tint.backgroundColor, borderColor: colors.paper },
          popStyle,
        ]}
      >
        <AppText latin tabular weight={1000} size={14} color={tint.color}>
          {rank}
        </AppText>
      </Animated.View>
    </View>
  );
}

type PodiumCardProps = Readonly<{ place: Place; entry: BoardRow; mine: boolean }>;

function PodiumCard({ place, entry, mine }: PodiumCardProps) {
  const colors = useColors();
  const copy = copyFor(useLanguage());
  const first = place === 1;

  return (
    <Animated.View entering={FadeInUp.delay((place - 1) * staggerMs)} style={styles.slot}>
      <Card
        style={[
          styles.card,
          first ? styles.cardFirst : styles.cardRest,
          first && { borderColor: colors.selectedLine },
        ]}
      >
        {first ? (
          <View pointerEvents="none" style={styles.tintClip}>
            <View style={[styles.tint, { backgroundColor: colors.selected }]} />
          </View>
        ) : null}
        <ShieldAvatar name={entry.name} anonymous={entry.anonymous} width={first ? 40 : 34} />
        <View style={styles.name}>
          <PlayerName
            name={entry.name}
            weight={entry.anonymous ? 700 : 900}
            size={nameSize}
            lineHeight={nameLineHeight}
            color={entry.anonymous ? colors.muted : colors.ink}
            textAlign="center"
            numberOfLines={nameLines}
          />
        </View>
        <AppText
          latin
          tabular
          weight={1000}
          size={first ? 26 : 22}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatElapsed(entry.elapsedMs)}
        </AppText>
        {mine ? (
          <View style={[styles.you, { backgroundColor: colors.lime }]}>
            <AppText weight={900} size={10} color={colors.onAccent}>
              {copy.you}
            </AppText>
          </View>
        ) : null}
      </Card>
      <Medal place={place} rank={entry.rank} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 16,
  },
  slot: {
    flex: 1,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 22,
    paddingBottom: 12,
  },
  cardFirst: {
    minHeight: 186,
  },
  cardRest: {
    minHeight: 154,
  },
  tintClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.xl - 1,
    overflow: 'hidden',
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  medalWrap: {
    position: 'absolute',
    top: -16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  medal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    // Two lines tall whatever the name, so the three cards line up.
    minHeight: nameLineHeight * nameLines,
  },
  you: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
