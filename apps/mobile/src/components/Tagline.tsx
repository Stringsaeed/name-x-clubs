import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { Copy } from '../copy';
import { useColors } from '../theme/ThemeProvider';
import { AppText } from '../ui';

/** The two-line pitch above the setup, only on an idle Mode 10 round. */
export function Tagline({ copy }: Readonly<{ copy: Copy }>) {
  const colors = useColors();

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(160)}
      accessibilityRole="header"
      style={styles.tagline}
    >
      <AppText weight={1000} size={20} lineHeight={24} numberOfLines={1}>
        {copy.knowYourClubs}
      </AppText>
      <AppText weight={1000} size={20} lineHeight={24} numberOfLines={1} color={colors.green}>
        {copy.proveIt}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tagline: {
    paddingTop: 12,
    paddingHorizontal: 2,
  },
});
