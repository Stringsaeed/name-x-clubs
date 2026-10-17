import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { brandName, type Copy } from '../../copy';
import type { CueName } from '../../feedback/feedback';
import { useColors } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';
import { AppText, Icon, type IconName, PressableScale } from '../../ui';

export type TopBarProps = Readonly<{
  copy: Copy;
  onLeaderboard: () => void;
  onLanguage: () => void;
  onSettings: () => void;
}>;

export function TopBar({ copy, onLeaderboard, onLanguage, onSettings }: TopBarProps) {
  return (
    <View style={styles.bar}>
      <Brand />
      <View style={styles.actions}>
        <IconButton icon="trophy" label={copy.leaderboard} cue="page" onPress={onLeaderboard} />
        <IconButton icon="globe" label={copy.language} cue="select" onPress={onLanguage} />
        <IconButton icon="settings" label={copy.settings} cue="page" onPress={onSettings} />
      </View>
    </View>
  );
}

function Brand() {
  const colors = useColors();
  const mark = useMemo(() => ({ backgroundColor: colors.lime }), [colors]);

  return (
    <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel={brandName}>
      <View style={[styles.mark, mark]}>
        <Icon name="ball" size={22} color={colors.onAccent} strokeWidth={1.8} />
      </View>
      <AppText latin weight={900} size={22} style={styles.wordmark} numberOfLines={1}>
        {brandName}
      </AppText>
    </View>
  );
}

function IconButton({
  icon,
  label,
  cue,
  onPress,
}: Readonly<{ icon: IconName; label: string; cue: CueName; onPress: () => void }>) {
  const colors = useColors();

  return (
    <PressableScale
      cue={cue}
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={styles.iconButton}
    >
      <Icon name={icon} size={22} color={colors.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flexShrink: 1,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-9deg' }],
  },
  wordmark: {
    letterSpacing: -1,
    writingDirection: 'ltr',
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
