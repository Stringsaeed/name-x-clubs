import { useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, StyleSheet, TextInput, View } from 'react-native';
import type { Challenge, Language, Level } from '../../../../web/src/game/model';
import { type Copy, categoryLabel, practiceChoices } from '../../copy';
import { useLanguage } from '../../game/play';
import { fontFamily } from '../../theme/fonts';
import { useColors } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';
import { AppText } from '../../ui';
import { CategoryChoice } from './CategoryChoice';
import { Sheet } from './Sheet';

type Kind = Challenge['scope']['kind'];

type Row =
  | Readonly<{ type: 'header'; key: string; label: string }>
  | Readonly<{ type: 'choice'; key: string; id: string; label: string }>;

export type CategorySheetProps = Readonly<{
  visible: boolean;
  level: Level;
  /** The practice category in play: a challenge id, or `random`. */
  selectedId: string;
  copy: Copy;
  onClose: () => void;
  onSelect: (category: string) => void;
}>;

function sectionLabel(kind: Kind, copy: Copy) {
  switch (kind) {
    case 'world':
      return copy.sectionWorld;
    case 'region':
      return copy.sectionRegions;
    case 'country':
      return copy.sectionCountries;
    case 'letter':
      return copy.sectionLetters;
  }
}

/** The choices that match `query`, each group under its section header. */
function rowsFor(level: Level, language: Language, copy: Copy, query: string): Row[] {
  const needle = query.trim().toLocaleLowerCase();
  const rows: Row[] = [];
  let section: Kind | null = null;

  for (const challenge of practiceChoices(level, language)) {
    const label = categoryLabel(challenge, language, copy);

    if (needle.length > 0 && !label.toLocaleLowerCase().includes(needle)) {
      continue;
    }

    if (challenge.scope.kind !== section) {
      section = challenge.scope.kind;
      rows.push({ type: 'header', key: `section:${section}`, label: sectionLabel(section, copy) });
    }

    rows.push({ type: 'choice', key: challenge.id, id: challenge.id, label });
  }

  return rows;
}

export function CategorySheet({
  visible,
  level,
  selectedId,
  copy,
  onClose,
  onSelect,
}: CategorySheetProps) {
  const language = useLanguage();
  const [query, setQuery] = useState('');
  const rows = useMemo(() => rowsFor(level, language, copy, query), [level, language, copy, query]);

  function close() {
    setQuery('');
    onClose();
  }

  function choose(id: string) {
    onSelect(id);
    close();
  }

  const renderRow: ListRenderItem<Row> = ({ item }) =>
    item.type === 'header' ? (
      <SectionHeader label={item.label} />
    ) : (
      <CategoryChoice
        label={item.label}
        selected={item.id === selectedId}
        onPress={() => choose(item.id)}
      />
    );

  return (
    <Sheet visible={visible} title={copy.pickPitch} onClose={close}>
      <SearchField value={query} placeholder={copy.searchPitch} onChange={setQuery} />
      <CategoryChoice
        label={copy.randomChallenge}
        icon="shuffle"
        selected={selectedId === 'random'}
        onPress={() => choose('random')}
      />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Empty label={copy.noMatches} />}
      />
    </Sheet>
  );
}

function SearchField({
  value,
  placeholder,
  onChange,
}: Readonly<{ value: string; placeholder: string; onChange: (text: string) => void }>) {
  const colors = useColors();
  const language = useLanguage();
  const look = useMemo(
    () => ({
      backgroundColor: colors.soft,
      borderColor: colors.line,
      color: colors.ink,
      fontFamily: fontFamily(language, 700),
    }),
    [colors, language],
  );

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      accessibilityLabel={placeholder}
      autoCorrect={false}
      spellCheck={false}
      returnKeyType="search"
      clearButtonMode="while-editing"
      selectionColor={colors.green}
      style={[styles.search, look]}
    />
  );
}

function SectionHeader({ label }: Readonly<{ label: string }>) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <AppText weight={900} size={10} color={colors.muted} style={styles.sectionLabel}>
        {label.toLocaleUpperCase()}
      </AppText>
    </View>
  );
}

function Empty({ label }: Readonly<{ label: string }>) {
  const colors = useColors();

  return (
    <AppText weight={700} size={14} color={colors.muted} style={styles.empty}>
      {label}
    </AppText>
  );
}

const styles = StyleSheet.create({
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    fontSize: 16,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionLabel: {
    letterSpacing: 1,
  },
  empty: {
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
});
