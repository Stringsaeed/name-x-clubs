import { StyleSheet, View } from 'react-native';
import { useColors } from '../../theme/ThemeProvider';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { PressableScale } from '../../ui/PressableScale';

export type BoardHeaderProps = Readonly<{
  title: string;
  closeLabel: string;
  onClose: () => void;
}>;

export function BoardHeader({ title, closeLabel, onClose }: BoardHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.bar}>
      <PressableScale
        cue="tap"
        accessibilityLabel={closeLabel}
        hitSlop={8}
        onPress={onClose}
        style={styles.close}
      >
        <Icon name="close" size={22} color={colors.muted} />
      </PressableScale>
      <AppText accessibilityRole="header" weight={1000} size={28} numberOfLines={1}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
