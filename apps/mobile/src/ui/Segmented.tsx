import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { cue } from '../feedback/feedback';
import { useColors } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type SegmentedItem<T extends string> = Readonly<{
  id: T;
  label: string;
  icon?: IconName;
}>;

export type SegmentedProps<T extends string> = Readonly<{
  items: readonly SegmentedItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Dims the inactive items and ignores presses (e.g. during a round). */
  locked?: boolean;
  size?: 'md' | 'sm';
  accessibilityLabel?: string;
}>;

type Slot = Readonly<{ x: number; width: number }>;

const slideSpring = { damping: 22, stiffness: 260 } as const;
const inset = 3;

function useIndicator(slot: Slot | undefined) {
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const visible = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (!slot) {
      return;
    }

    // The first measurement places the indicator without a slide from the edge.
    if (!placed.current) {
      placed.current = true;
      x.value = slot.x;
      width.value = slot.width;
      visible.value = 1;

      return;
    }

    x.value = withSpring(slot.x, slideSpring);
    width.value = withSpring(slot.width, slideSpring);
  }, [slot, x, width, visible]);

  return useAnimatedStyle(() => ({
    opacity: visible.value,
    width: width.value,
    transform: [{ translateX: x.value }],
  }));
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  locked = false,
  size = 'md',
  accessibilityLabel,
}: SegmentedProps<T>) {
  const colors = useColors();
  const [slots, setSlots] = useState<Readonly<Record<string, Slot>>>({});
  const indicatorStyle = useIndicator(slots[value]);
  const small = size === 'sm';

  const measure = useCallback((id: T, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;

    setSlots((current) => {
      const known = current[id];

      if (known && known.x === x && known.width === width) {
        return current;
      }

      return { ...current, [id]: { x, width } };
    });
  }, []);

  const select = useCallback(
    (id: T) => {
      if (locked || id === value) {
        return;
      }

      cue('select');
      onChange(id);
    },
    [locked, value, onChange],
  );

  const tint = useMemo(
    () => ({
      track: { backgroundColor: colors.soft },
      indicator: { backgroundColor: colors.card, shadowColor: colors.shadow },
    }),
    [colors],
  );

  return (
    <View
      accessibilityRole="tablist"
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
      style={[styles.track, small ? styles.trackSm : styles.trackMd, tint.track]}
    >
      {/* Item x offsets are physical, so the indicator lives in a fixed left-to-right layer. */}
      <View pointerEvents="none" style={styles.indicatorLayer}>
        <Animated.View
          style={[
            styles.indicator,
            small ? styles.indicatorSm : styles.indicatorMd,
            tint.indicator,
            indicatorStyle,
          ]}
        />
      </View>
      {items.map((item) => (
        <Segment
          key={item.id}
          item={item}
          active={item.id === value}
          locked={locked}
          small={small}
          onSelect={select}
          onMeasure={measure}
        />
      ))}
    </View>
  );
}

function Segment<T extends string>({
  item,
  active,
  locked,
  small,
  onSelect,
  onMeasure,
}: Readonly<{
  item: SegmentedItem<T>;
  active: boolean;
  locked: boolean;
  small: boolean;
  onSelect: (id: T) => void;
  onMeasure: (id: T, event: LayoutChangeEvent) => void;
}>) {
  const colors = useColors();
  const color = active ? colors.ink : colors.muted;
  const inert = locked && !active;

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      disabled={inert}
      scaleTo={0.97}
      onLayout={(event) => onMeasure(item.id, event)}
      onPress={() => onSelect(item.id)}
      style={[styles.item, small ? styles.itemSm : styles.itemMd, inert && styles.inert]}
    >
      {item.icon ? <Icon name={item.icon} size={small ? 15 : 17} color={color} /> : null}
      <AppText weight={800} size={small ? 12 : 13} color={color} numberOfLines={1}>
        {item.label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: inset,
    borderCurve: 'continuous',
  },
  trackMd: {
    borderRadius: 14,
  },
  trackSm: {
    borderRadius: 11,
  },
  indicatorLayer: {
    ...StyleSheet.absoluteFill,
    direction: 'ltr',
  },
  indicator: {
    position: 'absolute',
    top: inset,
    bottom: inset,
    left: 0,
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  indicatorMd: {
    borderRadius: 11,
  },
  indicatorSm: {
    borderRadius: 8,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  itemMd: {
    minHeight: 38,
  },
  itemSm: {
    minHeight: 30,
  },
  inert: {
    opacity: 0.4,
  },
});
