import { useMemo } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useColors } from '../theme/ThemeProvider';
import { radii } from '../theme/tokens';
import { AppText, Icon, type IconName } from '../ui';

export type ChipTone = 'plain' | 'lime' | 'warning';

export type ChipProps = Readonly<{
  label: string;
  tone?: ChipTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}>;

/** A small status pill: ranks, "Not ranked", "Checking your time…". */
export function Chip({ label, tone = 'plain', icon, style }: ChipProps) {
  const colors = useColors();
  const look = useMemo(() => {
    if (tone === 'lime') {
      return {
        surface: { backgroundColor: colors.lime, borderColor: colors.lime },
        text: colors.onAccent,
      };
    }

    if (tone === 'warning') {
      return {
        surface: { backgroundColor: colors.warningBg, borderColor: colors.warningLine },
        text: colors.warning,
      };
    }

    return {
      surface: { backgroundColor: colors.card, borderColor: colors.line },
      text: colors.ink,
    };
  }, [tone, colors]);

  return (
    <View style={[styles.chip, look.surface, style]}>
      {icon ? <Icon name={icon} size={13} color={look.text} strokeWidth={2} /> : null}
      <AppText weight={800} size={12} color={look.text} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: {
    flexShrink: 1,
  },
});
