import { type ReactNode, useMemo } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { copyFor } from '../../copy';
import { useLanguage } from '../../game/play';
import { useColors } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';
import { AppText, Icon, PressableScale } from '../../ui';

export type SheetProps = Readonly<{
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}>;

/** A page sheet with a drag handle, a title and a close button on the end side. */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const colors = useColors();
  const language = useLanguage();
  const tint = useMemo(
    () =>
      ({
        surface: { backgroundColor: colors.paper, direction: language === 'ar' ? 'rtl' : 'ltr' },
        handle: { backgroundColor: colors.line },
      }) as const,
    [colors, language],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['top', 'bottom']} style={[styles.sheet, tint.surface]}>
        <View style={[styles.handle, tint.handle]} />
        <View style={styles.header}>
          <AppText weight={1000} size={22} accessibilityRole="header" numberOfLines={1}>
            {title}
          </AppText>
          <CloseButton onPress={onClose} />
        </View>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

function CloseButton({ onPress }: Readonly<{ onPress: () => void }>) {
  const colors = useColors();
  const language = useLanguage();
  const tint = useMemo(() => ({ backgroundColor: colors.soft }), [colors]);

  return (
    <PressableScale
      haptic
      accessibilityLabel={copyFor(language).close}
      hitSlop={6}
      onPress={onPress}
      style={[styles.close, tint]}
    >
      <Icon name="close" size={18} color={colors.muted} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
