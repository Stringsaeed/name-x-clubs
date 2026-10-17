import { useRouter } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type BoardMode,
  type BoardPeriod,
  boardModes,
  boardPeriods,
  targetByBoardMode,
} from '../../../web/src/components/leaderboard/query';
import { BoardHeader } from '../components/leaderboard/BoardHeader';
import { BoardRowItem } from '../components/leaderboard/BoardRowItem';
import {
  BoardEmpty,
  BoardUnavailable,
  SkeletonPodium,
  SkeletonRows,
} from '../components/leaderboard/BoardStates';
import { PinnedStanding, pinnedHeight } from '../components/leaderboard/PinnedStanding';
import { Podium } from '../components/leaderboard/Podium';
import { type Copy, copyFor } from '../copy';
import { cue } from '../feedback/feedback';
import { type BoardRow, type BoardState, isMine, useBoard } from '../game/leaderboard';
import { useLanguage } from '../game/play';
import { useColors } from '../theme/ThemeProvider';
import { Segmented, type SegmentedItem } from '../ui/Segmented';

const podiumSize = 3;
const bottomRoom = 24;

export type LeaderboardScreenProps = Readonly<{ initialMode: BoardMode }>;

const periodLabels: Readonly<Record<BoardPeriod, keyof Copy>> = {
  day: 'last24h',
  week: 'last7d',
  all: 'allTime',
};

function useLeave(): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);
}

function useSegments(copy: Copy) {
  const periods = useMemo<readonly SegmentedItem<BoardPeriod>[]>(
    () => boardPeriods.map((id) => ({ id, label: String(copy[periodLabels[id]]) })),
    [copy],
  );
  const modes = useMemo<readonly SegmentedItem<BoardMode>[]>(
    () => boardModes.map((id) => ({ id, label: copy.modeLabel(targetByBoardMode[id]) })),
    [copy],
  );

  return { periods, modes };
}

type BoardContent = Readonly<{
  header: ReactElement | null;
  empty: ReactElement | null;
  rows: readonly BoardRow[];
}>;

function boardContent(board: BoardState, onPlay: () => void): BoardContent {
  if (board.status === 'loading') {
    return { header: <SkeletonPodium />, empty: <SkeletonRows />, rows: [] };
  }

  if (board.status === 'unavailable') {
    return { header: null, empty: <BoardUnavailable onRetry={board.refresh} />, rows: [] };
  }

  if (board.entries.length === 0) {
    return { header: null, empty: <BoardEmpty onPlay={onPlay} />, rows: [] };
  }

  return {
    header: <Podium entries={board.entries.slice(0, podiumSize)} mine={board.mine} />,
    empty: null,
    rows: board.entries.slice(podiumSize),
  };
}

export function LeaderboardScreen({ initialMode }: LeaderboardScreenProps) {
  const colors = useColors();
  const language = useLanguage();
  const copy = copyFor(language);
  const insets = useSafeAreaInsets();
  const leave = useLeave();
  const [mode, setMode] = useState<BoardMode>(initialMode);
  const [period, setPeriod] = useState<BoardPeriod>('day');
  const board = useBoard(mode, period, language);
  const { periods, modes } = useSegments(copy);
  const content = boardContent(board, leave);
  const pinned =
    board.mine !== undefined && !board.entries.some((entry) => isMine(entry, board.mine))
      ? board.mine
      : undefined;
  const now = Date.now();

  useEffect(() => {
    cue('page');
  }, []);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.paper }, direction(language)]}
    >
      <BoardHeader title={copy.leaderboard} closeLabel={copy.close} onClose={leave} />
      <View style={styles.segments}>
        <Segmented size="sm" items={periods} value={period} onChange={setPeriod} />
        <Segmented items={modes} value={mode} onChange={setMode} />
      </View>
      <BoardList
        // Switching boards remounts the list so the entrance animations replay.
        key={`${mode}:${period}`}
        board={board}
        content={content}
        now={now}
        bottom={pinned ? pinnedHeight + insets.bottom : insets.bottom + bottomRoom}
      />
      {pinned ? <PinnedStanding standing={pinned} now={now} /> : null}
    </SafeAreaView>
  );
}

function direction(language: string) {
  return language === 'ar' ? styles.rtl : styles.ltr;
}

type BoardListProps = Readonly<{
  board: BoardState;
  content: BoardContent;
  now: number;
  bottom: number;
}>;

function BoardList({ board, content, now, bottom }: BoardListProps) {
  const colors = useColors();
  const contentStyle = useMemo(() => ({ flexGrow: 1, paddingBottom: bottom }), [bottom]);
  const { mine } = board;

  const renderItem = useCallback(
    ({ item, index }: { item: BoardRow; index: number }) => (
      <BoardRowItem entry={item} index={index} mine={isMine(item, mine)} now={now} />
    ),
    [mine, now],
  );

  return (
    <FlatList
      data={content.rows}
      keyExtractor={(row) => `${row.rank}:${row.achievedAt}`}
      renderItem={renderItem}
      ListHeaderComponent={content.header ?? undefined}
      ListEmptyComponent={content.empty ?? undefined}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={board.refreshing}
          onRefresh={board.refresh}
          tintColor={colors.green}
          colors={[colors.green]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  ltr: {
    direction: 'ltr',
  },
  rtl: {
    direction: 'rtl',
  },
  segments: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
});
