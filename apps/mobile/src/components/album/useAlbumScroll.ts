import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

export type ScrollEdges = Readonly<{ up: boolean; down: boolean }>;

type Metrics = Readonly<{ offset: number; viewport: number; content: number }>;

type IndexFailure = Readonly<{ index: number; averageItemLength: number }>;

/** Distance from an edge, in points, that still counts as being at it. */
const edgeSlack = 6;

function edgesOf({ offset, viewport, content }: Metrics): ScrollEdges {
  return {
    up: offset > edgeSlack,
    down: viewport > 0 && content - offset - viewport > edgeSlack,
  };
}

/** Which edges have more content, for the fades and the "More below" pill. */
function useScrollEdges() {
  const metrics = useRef<Metrics>({ offset: 0, viewport: 0, content: 0 });
  const [edges, setEdges] = useState<ScrollEdges>({ up: false, down: false });

  const update = useCallback((patch: Partial<Metrics>) => {
    metrics.current = { ...metrics.current, ...patch };

    const next = edgesOf(metrics.current);

    setEdges((current) => (current.up === next.up && current.down === next.down ? current : next));
  }, []);

  return { metrics, edges, update };
}

/** Where the album sits: how many stickers it holds, how many slots, and its row geometry. */
export type AlbumScrollShape = Readonly<{
  count: number;
  total: number;
  columns: number;
  /** Row height plus the gap under it, in points. */
  rowStride: number;
}>;

type ScrollRequest = Readonly<{ index: number; viewPosition: number; viewOffset: number }>;

/**
 * Centres the newest sticker's row. When the next empty slot starts a new row, it centres the two
 * rows together instead, so a short sheet still shows the sticker that landed and where the next
 * one goes.
 */
function followRequest(shape: AlbumScrollShape): ScrollRequest | null {
  const { count, total, columns, rowStride } = shape;

  if (count <= 0 || columns <= 0) {
    return null;
  }

  const latestRow = Math.floor((count - 1) / columns);
  const nextRow = count < total ? Math.floor(count / columns) : latestRow;

  return {
    index: latestRow,
    viewPosition: 0.5,
    viewOffset: ((latestRow - nextRow) * rowStride) / 2,
  };
}

/** Keeps the newest sticker and the next slot in view whenever the album grows. */
function useFollowNewest<Item>(listRef: RefObject<FlatList<Item> | null>, shape: AlbumScrollShape) {
  const latestShape = useRef(shape);
  const lastRequest = useRef<ScrollRequest | null>(null);
  const retried = useRef(false);
  const { count } = shape;

  latestShape.current = shape;

  const scrollToLatest = useCallback(
    (animated: boolean) => {
      const list = listRef.current;
      const request = followRequest(latestShape.current);

      if (!list || !request) {
        return;
      }

      retried.current = false;
      lastRequest.current = request;

      try {
        list.scrollToIndex({ ...request, animated });
      } catch {
        list.scrollToEnd({ animated });
      }
    },
    [listRef],
  );

  const previousCount = useRef(count);

  useEffect(() => {
    const grew = count > previousCount.current;

    previousCount.current = count;

    if (grew) {
      scrollToLatest(true);
    } else if (count === 0) {
      // A fresh round starts back at the first page.
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [count, listRef, scrollToLatest]);

  const onScrollToIndexFailed = useCallback(
    (info: IndexFailure) => {
      const list = listRef.current;
      const request = lastRequest.current;

      if (!list || !request || retried.current) {
        return;
      }

      retried.current = true;
      list.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
      requestAnimationFrame(() => {
        try {
          listRef.current?.scrollToIndex({ ...request, animated: true });
        } catch {
          // The row is still not laid out; the offset jump above already brought it close.
        }
      });
    },
    [listRef],
  );

  return { scrollToLatest, onScrollToIndexFailed };
}

/**
 * Scroll state for the scrolling album (levels 50 and 100, and level 10 on a short sheet): the
 * visible edges, following the newest sticker as the list grows, opening a restored round on its
 * newest sticker, and paging down.
 */
export function useAlbumScroll<Item>(shape: AlbumScrollShape) {
  const listRef = useRef<FlatList<Item>>(null);
  const { metrics, edges, update } = useScrollEdges();
  const { scrollToLatest, onScrollToIndexFailed } = useFollowNewest(listRef, shape);
  const placed = useRef(false);

  const placeOnce = useCallback(() => {
    const { viewport, content } = metrics.current;

    if (placed.current || viewport <= 0 || content <= 0) {
      return;
    }

    placed.current = true;
    requestAnimationFrame(() => scrollToLatest(false));
  }, [metrics, scrollToLatest]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;

      update({
        offset: contentOffset.y,
        viewport: layoutMeasurement.height,
        content: contentSize.height,
      });
    },
    [update],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      update({ viewport: event.nativeEvent.layout.height });
      placeOnce();
    },
    [update, placeOnce],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      update({ content: height });
      placeOnce();
    },
    [update, placeOnce],
  );

  const scrollMore = useCallback(() => {
    const { offset, viewport, content } = metrics.current;
    const step = Math.max(140, Math.floor(viewport * 0.65));
    const target = Math.max(0, Math.min(content - viewport, offset + step));

    listRef.current?.scrollToOffset({ offset: target, animated: true });
  }, [metrics]);

  return {
    listRef,
    edges,
    onScroll,
    onLayout,
    onContentSizeChange,
    onScrollToIndexFailed,
    scrollMore,
  };
}
