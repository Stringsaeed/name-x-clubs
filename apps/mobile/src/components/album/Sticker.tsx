import { Image } from 'expo-image';
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Club } from '../../../../web/src/content/catalog';
import type { Language } from '../../../../web/src/game/model';
import { crestSources } from '../../crests';
import { useColors } from '../../theme/ThemeProvider';
import { radii } from '../../theme/tokens';
import { AppText } from '../../ui';
import { Shield } from './Shield';
import { type StickerLabels, type StickerLook, stickerLabels } from './stickerNames';

const landSpring = { duration: 400, dampingRatio: 1, overshootClamping: true } as const;

/**
 * A new sticker settles from a small lift and scale into its tilt without overshooting. Stickers
 * that were already in the album when it mounted start at rest.
 */
function useLanding(animate: boolean, tilt: number) {
  const reduced = useReducedMotion();
  const start = animate && !reduced;
  const land = useSharedValue(start ? 0 : 1);
  const fade = useSharedValue(start ? 0 : 1);

  useEffect(() => {
    if (!start) {
      return;
    }

    land.value = withSpring(1, landSpring);
    fade.value = withTiming(1, { duration: 160 });
  }, [start, land, fade]);

  return useAnimatedStyle(() => {
    const air = 1 - land.value;
    const lift = Math.max(0, air);

    return {
      opacity: fade.value,
      shadowRadius: 2 + 3 * lift,
      shadowOffset: { width: 0, height: 1 + 2 * lift },
      transform: [
        { translateY: -8 * air },
        { scale: 1 + 0.08 * air },
        { rotate: `${tilt - 2 * air}deg` },
      ],
    };
  });
}

const StickerCrest = memo(function StickerCrestView({
  clubId,
  initials,
  look,
}: Readonly<{ clubId: string; initials: string; look: StickerLook }>) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const source = crestSources[clubId];

  if (source === undefined || failed) {
    return (
      <View style={[styles.fallback, look.crestBox]}>
        <Shield width={look.crest * 0.88} height={look.crest} color={colors.green} />
        <AppText
          latin
          weight={900}
          size={Math.round(look.crest * 0.3)}
          color={colors.onGreen}
          style={styles.initials}
        >
          {initials}
        </AppText>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={look.crestBox}
      contentFit="contain"
      cachePolicy="memory-disk"
      recyclingKey={clubId}
      transition={120}
      accessible={false}
      onError={() => setFailed(true)}
    />
  );
});

/**
 * Flags are emoji, and some are tag sequences (England, Scotland, Wales). A custom font family
 * breaks the emoji fallback for those and shows a plain black flag, so the flag is a bare `Text`
 * in the system font.
 */
function Flag({ flag, size }: Readonly<{ flag: string; size: number }>) {
  const sizeStyle = useMemo(() => ({ fontSize: size }), [size]);

  return (
    <Text allowFontScaling={false} accessible={false} style={sizeStyle}>
      {flag}
    </Text>
  );
}

function StickerTop({ labels, look }: Readonly<{ labels: StickerLabels; look: StickerLook }>) {
  const colors = useColors();
  const badgeTint = useMemo(() => ({ backgroundColor: colors.lime }), [colors]);

  return (
    <View style={styles.top}>
      <View style={[styles.badge, badgeTint]}>
        <AppText
          latin
          tabular
          weight={900}
          size={look.badge}
          color={colors.onAccent}
          style={styles.ltr}
        >
          #{labels.code}
        </AppText>
      </View>
      {labels.flag ? <Flag flag={labels.flag} size={look.badge + 2} /> : null}
    </View>
  );
}

function StickerText({ labels, look }: Readonly<{ labels: StickerLabels; look: StickerLook }>) {
  const colors = useColors();
  const align = look.layout === 'stack' ? styles.centered : null;

  return (
    <>
      <AppText weight={900} numberOfLines={look.nameLines} style={[look.name, align]}>
        {labels.name}
      </AppText>
      {look.country ? (
        <AppText weight={700} size={9.5} color={colors.muted} numberOfLines={1} style={align}>
          {labels.country}
        </AppText>
      ) : null}
    </>
  );
}

export type StickerProps = Readonly<{
  club: Club;
  slot: number;
  language: Language;
  look: StickerLook;
  isLatest: boolean;
  animate: boolean;
}>;

export const Sticker = memo(function StickerView({
  club,
  slot,
  language,
  look,
  isLatest,
  animate,
}: StickerProps) {
  const colors = useColors();
  const labels = useMemo(() => stickerLabels(club, slot, language), [club, slot, language]);
  const landing = useLanding(animate, labels.tilt);
  const tint = useMemo(
    () => ({
      frame: {
        backgroundColor: isLatest ? colors.selected : colors.soft,
        borderColor: isLatest ? colors.selectedLine : colors.line,
        shadowColor: colors.shadow,
      },
      inset: { borderColor: isLatest ? colors.selectedLine : colors.line },
    }),
    [isLatest, colors],
  );
  const crest = <StickerCrest clubId={club.id} initials={labels.initials} look={look} />;

  return (
    <Animated.View
      accessible
      accessibilityLabel={labels.accessibilityLabel}
      shouldRasterizeIOS
      style={[styles.sticker, tint.frame, landing]}
    >
      <View pointerEvents="none" style={[styles.inset, tint.inset]} />
      {look.layout === 'stack' ? (
        <View style={styles.stack}>
          <StickerTop labels={labels} look={look} />
          {crest}
          <StickerText labels={labels} look={look} />
        </View>
      ) : (
        <View style={styles.row}>
          {crest}
          <View style={styles.rowText}>
            <StickerTop labels={labels} look={look} />
            <StickerText labels={labels} look={look} />
          </View>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sticker: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    shadowOpacity: 1,
    elevation: 2,
  },
  inset: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    start: 3,
    end: 3,
    borderWidth: 1,
    borderRadius: radii.sm,
    opacity: 0.7,
  },
  stack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  top: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
  },
  ltr: {
    writingDirection: 'ltr',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    position: 'absolute',
    writingDirection: 'ltr',
  },
  centered: {
    textAlign: 'center',
  },
});
