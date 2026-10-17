import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';
import { AppText, Icon, type IconName, PressableScale } from '../../ui';

export type CategoryChoiceProps = Readonly<{
  label: string;
  selected: boolean;
  icon?: IconName;
  onPress: () => void;
}>;

/** One row in the category sheet; the selected one is filled and checked. */
export function CategoryChoice({ label, selected, icon, onPress }: CategoryChoiceProps) {
  const colors = useColors();
  const tint = useMemo(
    () => (selected ? { backgroundColor: colors.selected, borderColor: colors.selectedLine } : {}),
    [selected, colors],
  );

  return (
    <PressableScale
      cue="select"
      scaleTo={0.98}
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.row, tint]}
    >
      {icon ? <Icon name={icon} size={18} color={colors.green} /> : null}
      <AppText weight={selected ? 900 : 700} size={15} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
      {selected ? <Icon name="check" size={18} color={colors.green} strokeWidth={2.2} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 46,
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  label: {
    flex: 1,
  },
});
