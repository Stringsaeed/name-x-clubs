import { useMemo, useState } from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import type { Language, Level, Session } from '../../../../web/src/game/model';
import type { Copy } from '../../copy';
import { Card } from '../../ui';
import { AlbumHeader } from './AlbumHeader';
import { AlbumSheet } from './AlbumSheet';
import { namedClubs } from './stickerNames';

/**
 * Stickers already in the album when it shows a round stay at rest; only later ones land. A
 * different round (level, mode or challenge) or a reset round settles at its current count.
 */
function useSettledCount(roundKey: string, count: number) {
  const [settled, setSettled] = useState({ roundKey, count });

  if (settled.roundKey !== roundKey || count < settled.count) {
    setSettled({ roundKey, count });

    return count;
  }

  return settled.count;
}

export type AlbumShellProps = Readonly<{
  /** `session.round.found` fills the slots; `session.challenge` is the header sentence. */
  session: Session;
  level: Level;
  language: Language;
  playing: boolean;
  unranked: boolean;
  copy: Copy;
  /** The parent gives the album `flex: 1`. */
  style?: StyleProp<ViewStyle>;
}>;

export function AlbumShell({
  session,
  level,
  language,
  playing,
  unranked,
  copy,
  style,
}: AlbumShellProps) {
  const found = session.round.found;
  const clubs = useMemo(() => namedClubs(found), [found]);
  const settledCount = useSettledCount(
    `${session.kind}:${level}:${session.challenge.id}`,
    clubs.length,
  );

  return (
    <Card style={[styles.shell, style]}>
      <AlbumHeader
        session={session}
        level={level}
        language={language}
        unranked={unranked}
        copy={copy}
        foundCount={clubs.length}
      />
      <AlbumSheet
        clubs={clubs}
        level={level}
        language={language}
        playing={playing}
        settledCount={settledCount}
        copy={copy}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
  },
});
