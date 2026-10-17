import type { Language } from '@nxc/game/model';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch } from 'react-native';
import type { Copy } from '../../copy';
import { cue, useFeedbackSettings } from '../../feedback/feedback';
import { useLanguage, useSetLanguage } from '../../game/play';
import { type ThemePreference, useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { AppText, Card, Icon, type IconName, Segmented, type SegmentedItem } from '../../ui';
import { Sheet } from './Sheet';

export type SettingsSheetProps = Readonly<{
  visible: boolean;
  copy: Copy;
  onClose: () => void;
}>;

export function SettingsSheet({ visible, copy, onClose }: SettingsSheetProps) {
  return (
    <Sheet visible={visible} title={copy.settings} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppearanceRow copy={copy} />
        <FeedbackRows copy={copy} />
        <LanguageRow copy={copy} />
      </ScrollView>
    </Sheet>
  );
}

function AppearanceRow({ copy }: Readonly<{ copy: Copy }>) {
  const { preference, setPreference } = useTheme();
  const items = useMemo<readonly SegmentedItem<ThemePreference>[]>(
    () => [
      { id: 'system', label: copy.system },
      { id: 'light', label: copy.light, icon: 'sun' },
      { id: 'dark', label: copy.dark, icon: 'moon' },
    ],
    [copy],
  );

  return (
    <Card padded style={styles.stacked}>
      <AppText weight={800} size={15}>
        {copy.appearance}
      </AppText>
      <Segmented
        items={items}
        value={preference}
        onChange={setPreference}
        accessibilityLabel={copy.appearance}
      />
    </Card>
  );
}

function FeedbackRows({ copy }: Readonly<{ copy: Copy }>) {
  const [settings, set] = useFeedbackSettings();

  return (
    <>
      <SwitchRow
        icon={settings.sound ? 'volume' : 'volumeOff'}
        label={copy.sound}
        value={settings.sound}
        onChange={(sound) => set({ sound })}
      />
      <SwitchRow
        icon="vibrate"
        label={copy.haptics}
        value={settings.haptics}
        onChange={(haptics) => set({ haptics })}
      />
    </>
  );
}

function SwitchRow({
  icon,
  label,
  value,
  onChange,
}: Readonly<{ icon: IconName; label: string; value: boolean; onChange: (on: boolean) => void }>) {
  const { colors } = useTheme();

  // Applied first, so switching sound or haptics on confirms itself and switching off is quiet.
  function change(on: boolean) {
    onChange(on);
    cue('toggle');
  }

  return (
    <Card padded style={styles.inline}>
      <Icon name={icon} size={20} color={colors.muted} />
      <AppText weight={800} size={15} style={styles.grow}>
        {label}
      </AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={change}
        trackColor={{ false: colors.line, true: colors.green }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.line}
      />
    </Card>
  );
}

function LanguageRow({ copy }: Readonly<{ copy: Copy }>) {
  const language = useLanguage();
  const setLanguage = useSetLanguage();
  const items = useMemo<readonly SegmentedItem<Language>[]>(
    () => [
      { id: 'en', label: copy.englishName },
      { id: 'ar', label: copy.arabicName },
    ],
    [copy],
  );

  return (
    <Card padded style={styles.stacked}>
      <AppText weight={800} size={15}>
        {copy.languageSetting}
      </AppText>
      <Segmented
        items={items}
        value={language}
        onChange={setLanguage}
        accessibilityLabel={copy.languageSetting}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  stacked: {
    gap: spacing.md,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
});
