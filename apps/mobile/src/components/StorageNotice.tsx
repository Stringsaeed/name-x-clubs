import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useColors } from '../theme/ThemeProvider';
import { radii, spacing } from '../theme/tokens';
import { AppText } from '../ui';

/** Shown above the bottom block when this phone cannot save the round. */
export function StorageNotice({ message }: Readonly<{ message: string }>) {
  const colors = useColors();
  const tint = useMemo(
    () => ({ backgroundColor: colors.warningBg, borderColor: colors.warningLine }),
    [colors],
  );

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(160)}
      accessibilityRole="alert"
      style={[styles.notice, tint]}
    >
      <AppText weight={700} size={12} lineHeight={17} color={colors.warning}>
        {message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
