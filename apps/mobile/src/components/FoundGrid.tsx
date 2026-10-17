import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import type { ClubId } from '../../../web/src/content/catalog';
import { clubById } from '../../../web/src/content/catalog';
import { clubInitials } from '../../../web/src/content/clubNames';
import type { Language, Level } from '../../../web/src/game/model';
import { displayName } from '../copy';
import { crestSources } from '../crests';
import { colors } from '../theme';
import { AppText } from './AppText';

type Slot = Readonly<{ key: string; id: ClubId | null }>;

const columnsForWidth = (width: number) => (width >= 700 ? 6 : 4);

export function FoundGrid({
  found,
  level,
  language,
  label,
}: {
  found: readonly ClubId[];
  level: Level;
  language: Language;
  label: string;
}) {
  const { width } = useWindowDimensions();
  const columns = columnsForWidth(width);
  const list = useRef<FlatList<Slot>>(null);
  const slots = slotsFor(found, level);

  useEffect(() => {
    if (found.length === 0) {
      return;
    }

    list.current?.scrollToEnd({ animated: true });
  }, [found.length]);

  return (
    <FlatList
      ref={list}
      style={{ flex: 1 }}
      data={slots}
      key={columns}
      numColumns={columns}
      keyExtractor={(slot) => slot.key}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
      columnWrapperStyle={{ gap: 8 }}
      ItemSeparatorComponent={Separator}
      accessibilityLabel={label}
      renderItem={({ item }) => <SlotCell id={item.id} language={language} />}
    />
  );
}

function Separator() {
  return <View style={{ height: 8 }} />;
}

function slotsFor(found: readonly ClubId[], level: Level): Slot[] {
  return Array.from({ length: level }, (_, index) => ({
    key: String(index),
    id: found[index] ?? null,
  }));
}

function SlotCell({ id, language }: { id: ClubId | null; language: Language }) {
  const club = id ? clubById.get(id) : undefined;
  const source = id ? crestSources[id] : undefined;

  return (
    <View
      style={{
        flex: 1,
        minHeight: 92,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: club ? colors.selectedLine : colors.line,
        backgroundColor: club ? colors.selected : colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        gap: 4,
      }}
    >
      {club && source !== undefined ? (
        <Image
          source={source}
          style={{ width: 44, height: 44 }}
          contentFit="contain"
          accessibilityLabel={displayName(club, language)}
        />
      ) : null}
      {club && source === undefined ? (
        <AppText style={{ fontSize: 18, color: colors.lime }}>{clubInitials(club.name)}</AppText>
      ) : null}
      {club ? (
        <AppText numberOfLines={2} style={{ fontSize: 11, textAlign: 'center', color: colors.ink }}>
          {displayName(club, language)}
        </AppText>
      ) : null}
    </View>
  );
}
