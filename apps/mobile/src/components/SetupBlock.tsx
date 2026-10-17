import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { levelSchema, levels, type Mode } from '../../../web/src/game/model';
import { type Copy, categoryLabel } from '../copy';
import { type PlayActions, type PlaySnapshot, useLanguage } from '../game/play';
import { useColors } from '../theme/ThemeProvider';
import { radii, spacing } from '../theme/tokens';
import { AppText, Button, Icon, PressableScale, Segmented, type SegmentedItem } from '../ui';

type GameView = PlaySnapshot['view'];

export function ModeRow({
  view,
  copy,
  locked,
  onChange,
}: Readonly<{ view: GameView; copy: Copy; locked: boolean; onChange: (mode: Mode) => void }>) {
  const items = useMemo<readonly SegmentedItem<Mode>[]>(
    () => [
      { id: 'free', label: copy.freeTime, icon: 'clock' },
      { id: 'practice', label: copy.practice, icon: 'shuffle' },
    ],
    [copy],
  );

  return (
    <Segmented
      items={items}
      value={view.mode}
      locked={locked}
      onChange={onChange}
      accessibilityLabel={copy.modes}
    />
  );
}

export type SetupBlockProps = Readonly<{
  view: GameView;
  copy: Copy;
  locked: boolean;
  actions: PlayActions;
  onPickCategory: () => void;
}>;

/** Level, and in Practice the category. Hidden while a round is playing. */
export function SetupBlock({ view, copy, locked, actions, onPickCategory }: SetupBlockProps) {
  const items = useMemo<readonly SegmentedItem<string>[]>(
    () => levels.map((level) => ({ id: String(level), label: copy.modeLabel(level) })),
    [copy],
  );

  function changeLevel(id: string) {
    const parsed = levelSchema.safeParse(Number(id));

    if (parsed.success) {
      actions.changeLevel(parsed.data);
    }
  }

  return (
    <View style={styles.block}>
      <Segmented
        size="sm"
        items={items}
        value={String(view.level)}
        locked={locked}
        onChange={changeLevel}
        accessibilityLabel={copy.levels}
      />
      {view.session.kind === 'practice' ? (
        <CategoryRow
          view={view}
          copy={copy}
          locked={locked}
          onPick={onPickCategory}
          onSurprise={() => actions.changeCategory('random')}
        />
      ) : null}
    </View>
  );
}

function CategoryRow({
  view,
  copy,
  locked,
  onPick,
  onSurprise,
}: Readonly<{
  view: GameView;
  copy: Copy;
  locked: boolean;
  onPick: () => void;
  onSurprise: () => void;
}>) {
  const colors = useColors();
  const language = useLanguage();
  const session = view.session;
  const label =
    session.kind === 'practice' && session.category === 'random'
      ? copy.randomChallenge
      : categoryLabel(session.challenge, language, copy);
  const tint = useMemo(
    () => ({ backgroundColor: colors.card, borderColor: colors.line, shadowColor: colors.shadow }),
    [colors],
  );

  return (
    <View style={styles.categoryRow}>
      <PressableScale
        cue="page"
        disabled={locked}
        accessibilityLabel={`${copy.pickPitch}: ${label}`}
        onPress={onPick}
        style={[styles.category, tint]}
      >
        <AppText weight={800} size={14} numberOfLines={1} style={styles.categoryLabel}>
          {label}
        </AppText>
        <Icon name="chevronDown" size={18} color={colors.muted} strokeWidth={2} />
      </PressableScale>
      <Button
        variant="outline"
        size="sm"
        leadingIcon="shuffle"
        label={copy.surpriseMe}
        cue="select"
        disabled={locked}
        onPress={onSurprise}
        style={styles.surprise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  category: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryLabel: {
    flex: 1,
  },
  surprise: {
    minHeight: 40,
    alignSelf: 'auto',
  },
});
