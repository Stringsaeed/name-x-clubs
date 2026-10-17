import type { Club } from '@nxc/game/content/catalog';
import type { Language, Level } from '@nxc/game/model';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Copy } from '../../copy';
import { useColors } from '../../theme/ThemeProvider';
import { radii } from '../../theme/tokens';
import { AppText, Icon, PressableScale } from '../../ui';
import { DottedPaper } from './DottedPaper';
import { GhostSlot } from './GhostSlot';
import { Sticker } from './Sticker';
import { type AlbumSlot, albumSlots, type StickerLook, stickerLook } from './stickerNames';
import { useAlbumScroll } from './useAlbumScroll';

type Size = Readonly<{ width: number; height: number }>;

const gridColumns = 2;
const gridRows = 5;
const gridPad = 12;
const gridGap = 10;

const listColumns = 4;
const listPadX = 10;
const listPadY = 12;
const listGap = 8;
const minListCell = 92;

/** Below this cell height the fixed level-10 page is unreadable, so it scrolls instead. */
const minGridCell = 54;
const compactColumns = 2;
const compactCell = 72;

/**
 * How the sheet lays out its slots. Level 10 is a fixed 2 × 5 page while its cells stay at least
 * `minGridCell` tall; on a shorter sheet (keyboard and feedback line open) it scrolls in two
 * columns of `compactCell`-tall stickers. Levels 50 and 100 always scroll in four columns.
 */
type SheetLayout =
  | Readonly<{ kind: 'grid'; cellHeight: number }>
  | Readonly<{ kind: 'list'; columns: number; cellHeight: number | null }>;

function gridCellHeight(sheetHeight: number) {
  return Math.max(0, (sheetHeight - gridPad * 2 - gridGap * (gridRows - 1)) / gridRows);
}

function sheetLayout(level: Level, size: Size): SheetLayout {
  if (level !== 10) {
    return { kind: 'list', columns: listColumns, cellHeight: null };
  }

  const cellHeight = gridCellHeight(size.height);

  if (cellHeight >= minGridCell) {
    return { kind: 'grid', cellHeight };
  }

  return { kind: 'list', columns: compactColumns, cellHeight: compactCell };
}

function layoutKey(level: Level, layout: SheetLayout) {
  return layout.kind === 'grid' ? `${level}:grid` : `${level}:list${layout.columns}`;
}

/** A sticker this recent was still in the air when the layout switched. */
const landingMs = 400;

/** When the count last grew, so a switch can tell a sticker still landing from one at rest. */
function useGrowth(count: number) {
  const growth = useRef({ count, at: 0 });

  if (count !== growth.current.count) {
    growth.current = { count, at: count > growth.current.count ? Date.now() : 0 };
  }

  return growth;
}

/**
 * A layout switch remounts every cell. Stickers already on screen at that moment rest in the new
 * layout instead of landing again; one that arrived in the same moment (an accepted answer also
 * opens the feedback line, which can shrink the sheet) lands in the new layout instead of being
 * cut off. A smaller count (a new round) lowers the mark.
 */
function useRestingCount(key: string | null, count: number) {
  const growth = useGrowth(count);
  const [resting, setResting] = useState<Readonly<{ key: string | null; count: number }>>({
    key: null,
    count: 0,
  });

  if (resting.key !== key) {
    const landing = Date.now() - growth.current.at < landingMs ? 1 : 0;
    // The first measured layout is not a switch: the round's own settled count applies.
    const next = resting.key === null ? 0 : Math.max(0, count - landing);

    setResting({ key, count: next });

    return next;
  }

  if (count < resting.count) {
    setResting({ key, count });

    return count;
  }

  return resting.count;
}

/** Filled cells are keyed by club and empty ones by slot, so a landing sticker mounts fresh. */
function cellKey(slot: AlbumSlot) {
  return slot.club ? slot.club.id : `slot-${slot.slot}`;
}

function listKey(slot: AlbumSlot) {
  return `slot-${slot.slot}`;
}

type CellProps = Readonly<{
  slot: AlbumSlot;
  look: StickerLook;
  language: Language;
  nextLabel: string;
  style: StyleProp<ViewStyle>;
}>;

function SlotCell({ slot, look, language, nextLabel, style }: CellProps) {
  return (
    <View style={style}>
      {slot.club ? (
        <Sticker
          club={slot.club}
          slot={slot.slot}
          language={language}
          look={look}
          isLatest={slot.isLatest}
          animate={slot.animate}
        />
      ) : (
        <GhostSlot slot={slot.slot} isNext={slot.isNext} look={look} nextLabel={nextLabel} />
      )}
    </View>
  );
}

type SheetBodyProps = Readonly<{
  slots: readonly AlbumSlot[];
  size: Size;
  level: Level;
  language: Language;
  copy: Copy;
  foundCount: number;
}>;

/** Level 10 on a tall enough sheet: a fixed 2 × 5 page that fills it. */
function GridSheet({
  slots,
  language,
  copy,
  cellHeight,
}: Pick<SheetBodyProps, 'slots' | 'language' | 'copy'> & Readonly<{ cellHeight: number }>) {
  const look = useMemo(() => stickerLook(10, cellHeight), [cellHeight]);
  const rowStyle = useMemo(() => ({ height: cellHeight }), [cellHeight]);
  const rows = useMemo(
    () =>
      Array.from({ length: Math.ceil(slots.length / gridColumns) }, (_, row) =>
        slots.slice(row * gridColumns, (row + 1) * gridColumns),
      ),
    [slots],
  );

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={`row-${row[0]?.slot ?? 0}`} style={[styles.gridRow, rowStyle]}>
          {row.map((slot) => (
            <SlotCell
              key={cellKey(slot)}
              slot={slot}
              look={look}
              language={language}
              nextLabel={copy.next}
              style={styles.gridCell}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const ScrollFade = memo(function ScrollFadeView({
  edge,
  visible,
  color,
}: Readonly<{ edge: 'top' | 'bottom'; visible: boolean; color: string }>) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const top = edge === 'top';
  const id = `albumFade-${edge}`;

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, opacity]);

  return (
    <Animated.View pointerEvents="none" style={[top ? styles.fadeTop : styles.fadeBottom, fade]}>
      <Svg width="100%" height="100%" accessible={false}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={top ? 1 : 0} />
            <Stop offset="1" stopColor={color} stopOpacity={top ? 0 : 1} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
});

function MorePill({ label, onPress }: Readonly<{ label: string; onPress: () => void }>) {
  const colors = useColors();
  const tint = useMemo(
    () => ({ backgroundColor: colors.green, borderColor: colors.lime, shadowColor: colors.shadow }),
    [colors],
  );

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      pointerEvents="box-none"
      style={styles.pillLayer}
    >
      <PressableScale
        cue="tap"
        hitSlop={8}
        accessibilityLabel={label}
        onPress={onPress}
        style={[styles.pill, tint]}
      >
        <AppText weight={800} size={11} color={colors.onGreen}>
          {label}
        </AppText>
        <View style={styles.down}>
          <Icon name="arrow" size={13} color={colors.onGreen} strokeWidth={2.4} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

type ListShape = Readonly<{ columns: number; cellHeight: number | null }>;

function useListCells(size: Size, level: Level, shape: ListShape) {
  const { columns } = shape;
  const cellWidth = Math.max(0, (size.width - listPadX * 2 - listGap * (columns - 1)) / columns);
  const cellHeight = shape.cellHeight ?? Math.max(minListCell, Math.round(cellWidth * 1.08));
  const stride = cellHeight + listGap;
  const look = useMemo(() => stickerLook(level, cellHeight), [level, cellHeight]);
  const cellStyle = useMemo(
    () => ({ width: cellWidth, height: cellHeight }),
    [cellWidth, cellHeight],
  );
  const getItemLayout = useCallback(
    (_data: ArrayLike<AlbumSlot> | null | undefined, index: number) => ({
      length: stride,
      offset: listPadY + stride * index,
      index,
    }),
    [stride],
  );

  return {
    look,
    cellStyle,
    getItemLayout,
    stride,
    rowsPerScreen: Math.ceil(size.height / stride) + 1,
  };
}

/**
 * A scrolling album that follows the newest sticker: four columns at levels 50 and 100, two
 * columns of short stickers at level 10 when the sheet is too short for the fixed page.
 */
function ListSheet({
  slots,
  size,
  level,
  language,
  copy,
  foundCount,
  shape,
}: SheetBodyProps & Readonly<{ shape: ListShape }>) {
  const colors = useColors();
  const { columns } = shape;
  const { look, cellStyle, getItemLayout, stride, rowsPerScreen } = useListCells(
    size,
    level,
    shape,
  );
  const scroll = useAlbumScroll<AlbumSlot>({
    count: foundCount,
    total: slots.length,
    columns,
    rowStride: stride,
  });
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AlbumSlot>) => (
      <SlotCell
        key={cellKey(item)}
        slot={item}
        look={look}
        language={language}
        nextLabel={copy.next}
        style={cellStyle}
      />
    ),
    [look, language, copy.next, cellStyle],
  );

  return (
    <>
      <FlatList
        ref={scroll.listRef}
        data={slots}
        numColumns={columns}
        keyExtractor={listKey}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={rowsPerScreen}
        windowSize={9}
        columnWrapperStyle={styles.listRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={scroll.onScroll}
        onLayout={scroll.onLayout}
        onContentSizeChange={scroll.onContentSizeChange}
        onScrollToIndexFailed={scroll.onScrollToIndexFailed}
      />
      <ScrollFade edge="top" visible={scroll.edges.up} color={colors.paper} />
      <ScrollFade edge="bottom" visible={scroll.edges.down} color={colors.paper} />
      {scroll.edges.down ? <MorePill label={copy.moreBelow} onPress={scroll.scrollMore} /> : null}
    </>
  );
}

export type AlbumSheetProps = Readonly<{
  clubs: readonly Club[];
  level: Level;
  language: Language;
  playing: boolean;
  /** How many stickers were already placed when the album mounted; they do not land again. */
  settledCount: number;
  copy: Copy;
}>;

export function AlbumSheet({
  clubs,
  level,
  language,
  playing,
  settledCount,
  copy,
}: AlbumSheetProps) {
  const colors = useColors();
  const [size, setSize] = useState<Size | null>(null);
  const layout = size ? sheetLayout(level, size) : null;
  const key = layout ? layoutKey(level, layout) : null;
  const restingCount = useRestingCount(key, clubs.length);
  const slots = useMemo(
    () => albumSlots(clubs, level, playing, settledCount, restingCount),
    [clubs, level, playing, settledCount, restingCount],
  );
  const paper = useMemo(() => ({ backgroundColor: colors.paper }), [colors]);

  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setSize((current) =>
      current && current.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  return (
    <View accessibilityLabel={copy.found} onLayout={measure} style={[styles.sheet, paper]}>
      <DottedPaper color={colors.albumDot} />
      {size && layout && key ? (
        <SheetBody
          key={key}
          layout={layout}
          slots={slots}
          size={size}
          level={level}
          language={language}
          copy={copy}
          foundCount={clubs.length}
        />
      ) : null}
    </View>
  );
}

function SheetBody({ layout, ...body }: SheetBodyProps & Readonly<{ layout: SheetLayout }>) {
  if (layout.kind === 'grid') {
    return (
      <GridSheet
        slots={body.slots}
        language={body.language}
        copy={body.copy}
        cellHeight={layout.cellHeight}
      />
    );
  }

  return <ListSheet {...body} shape={layout} />;
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    minHeight: 0,
  },
  grid: {
    flex: 1,
    padding: gridPad,
    gap: gridGap,
  },
  gridRow: {
    flexDirection: 'row',
    gap: gridGap,
  },
  gridCell: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: listPadX,
    paddingTop: listPadY,
    paddingBottom: listPadY + 28,
  },
  listRow: {
    gap: listGap,
    marginBottom: listGap,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 24,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    height: 34,
  },
  pillLayer: {
    position: 'absolute',
    bottom: 10,
    start: 0,
    end: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  down: {
    transform: [{ rotate: '90deg' }],
  },
});
