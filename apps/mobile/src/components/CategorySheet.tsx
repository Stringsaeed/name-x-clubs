import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Challenge, Language, Level } from '../../../web/src/game/model';
import { type Copy, categoryLabel, practiceChoices } from '../copy';
import { colors, fonts } from '../theme';
import { AppText } from './AppText';

export function CategorySheet({
  open,
  level,
  language,
  copy,
  selectedId,
  onClose,
  onSelect,
}: {
  open: boolean;
  level: Level;
  language: Language;
  copy: Copy;
  selectedId: string;
  onClose: () => void;
  onSelect: (category: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const choices = useMemo(() => practiceChoices(level, language), [level, language]);
  const filtered = choices.filter((challenge) =>
    categoryLabel(challenge, language, copy)
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <AppText style={{ fontSize: 20 }}>{copy.pickPitch}</AppText>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
            <AppText style={{ color: colors.lime }}>{copy.done}</AppText>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={copy.placeholder}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.white,
            color: colors.ink,
            fontFamily: fonts[language],
            fontSize: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onSelect('random');
            onClose();
          }}
          style={{ paddingHorizontal: 16, paddingVertical: 14 }}
        >
          <AppText style={{ color: colors.lime }}>{copy.randomChallenge}</AppText>
        </Pressable>
        <FlatList
          data={filtered}
          keyExtractor={(challenge) => challenge.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <Choice
              challenge={item}
              language={language}
              copy={copy}
              selected={item.id === selectedId}
              onSelect={() => {
                onSelect(item.id);
                onClose();
              }}
            />
          )}
        />
      </View>
    </Modal>
  );
}

function Choice({
  challenge,
  language,
  copy,
  selected,
  onSelect,
}: {
  challenge: Challenge;
  language: Language;
  copy: Copy;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: selected ? colors.selected : 'transparent',
      }}
    >
      <AppText>{categoryLabel(challenge, language, copy)}</AppText>
    </Pressable>
  );
}
