import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { copyFor } from '../../copy';
import { useLanguage } from '../../game/play';
import { useColors } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { rowHeight } from './BoardRowItem';

const skeletonRows = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
const pulseMs = 700;

export type BoardEmptyProps = Readonly<{ onPlay: () => void }>;

export function BoardEmpty({ onPlay }: BoardEmptyProps) {
  const colors = useColors();
  const copy = copyFor(useLanguage());

  return (
    <View style={styles.message}>
      <View style={[styles.badge, { backgroundColor: colors.soft }]}>
        <Icon name="trophy" size={30} color={colors.muted} />
      </View>
      <AppText weight={800} size={16} color={colors.muted} style={styles.text}>
        {copy.noTimesYet}
      </AppText>
      <Button
        label={copy.letsPlay}
        trailingIcon="arrow"
        onPress={onPlay}
        style={styles.centeredButton}
      />
    </View>
  );
}

export type BoardUnavailableProps = Readonly<{ onRetry: () => void }>;

export function BoardUnavailable({ onRetry }: BoardUnavailableProps) {
  const colors = useColors();
  const copy = copyFor(useLanguage());

  return (
    <View style={styles.message}>
      <AppText weight={800} size={16} color={colors.muted} style={styles.text}>
        {copy.boardUnavailable}
      </AppText>
      <Button
        variant="outline"
        label={copy.tryAgain}
        onPress={onRetry}
        style={styles.centeredButton}
      />
    </View>
  );
}

/** A soft block that pulses while the board loads. */
function PulseBlock({ style }: Readonly<{ style: ViewStyle }>) {
  const colors = useColors();
  const opacity = useSharedValue(1);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: pulseMs, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: pulseMs, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [opacity]);

  return <Animated.View style={[style, { backgroundColor: colors.soft }, pulse]} />;
}

export function SkeletonPodium() {
  return (
    <View style={styles.podium}>
      <PulseBlock style={styles.podiumSide} />
      <PulseBlock style={styles.podiumMiddle} />
      <PulseBlock style={styles.podiumSide} />
    </View>
  );
}

export function SkeletonRows() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {skeletonRows.map((key) => (
        <PulseBlock key={key} style={styles.row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
    paddingTop: 56,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  centeredButton: {
    // `Button` hugs the start edge by default; here it sits under the centred message.
    alignSelf: 'center',
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 16,
  },
  podiumSide: {
    flex: 1,
    height: 154,
    borderRadius: 22,
  },
  podiumMiddle: {
    flex: 1,
    height: 186,
    borderRadius: 22,
  },
  row: {
    height: rowHeight,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 14,
  },
});
