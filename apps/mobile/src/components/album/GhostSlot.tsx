import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../../theme/ThemeProvider';
import { radii } from '../../theme/tokens';
import { AppText } from '../../ui';
import { Shield } from './Shield';
import { formatSlotNumber, type StickerLook } from './stickerNames';

/** The next slot breathes (1 → 1.015 and back, a 1.6 s loop) while it waits for an answer. */
function useBreathing(active: boolean) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(scale);
      scale.value = 1;

      return;
    }

    scale.value = withRepeat(withTiming(1.015, { duration: 800 }), -1, true);

    return () => cancelAnimation(scale);
  }, [active, reduced, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

export type GhostSlotProps = Readonly<{
  slot: number;
  isNext: boolean;
  look: StickerLook;
  nextLabel: string;
}>;

export const GhostSlot = memo(function GhostSlotView({
  slot,
  isNext,
  look,
  nextLabel,
}: GhostSlotProps) {
  const colors = useColors();
  const breathing = useBreathing(isNext);
  const tint = useMemo(
    () => ({
      frame: isNext
        ? { borderColor: colors.selectedLine, backgroundColor: colors.selected, borderWidth: 2 }
        : { borderColor: colors.line, backgroundColor: colors.albumGhost },
      inset: { borderColor: isNext ? colors.selectedLine : colors.line },
      tag: { backgroundColor: colors.lime },
    }),
    [isNext, colors],
  );

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.ghost, tint.frame, breathing]}
    >
      <View pointerEvents="none" style={[styles.inset, tint.inset]} />
      <AppText
        latin
        tabular
        weight={900}
        size={look.ghostNumber}
        color={isNext ? colors.green : colors.muted}
        style={styles.ltr}
      >
        {formatSlotNumber(slot)}
      </AppText>
      {look.shield ? <Shield width={22} height={25} color={colors.line} opacity={0.7} /> : null}
      {isNext ? (
        <View style={[styles.tag, tint.tag]}>
          <AppText weight={900} size={8} color={colors.onAccent} style={styles.tagText}>
            {nextLabel}
          </AppText>
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  ghost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  inset: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    start: 4,
    end: 4,
    borderWidth: 1,
    borderRadius: radii.sm,
    opacity: 0.6,
  },
  ltr: {
    writingDirection: 'ltr',
  },
  tag: {
    position: 'absolute',
    top: 5,
    end: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  tagText: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
