import type { Language, Level, Session } from '@nxc/game/model';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { type Copy, categoryLabel, challengeLine } from '../../copy';
import { elapsedSeconds, formatElapsed } from '../../game/engine';
import { useColors } from '../../theme/ThemeProvider';
import { radii } from '../../theme/tokens';
import { AppText, Icon } from '../../ui';

/** The wall clock, ticking on each whole second while `running`. */
function useWallClock(running: boolean) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    setNow(Date.now());

    if (!running) {
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(
      () => {
        setNow(Date.now());
        interval = setInterval(() => setNow(Date.now()), 1000);
      },
      1000 - (Date.now() % 1000),
    );

    return () => {
      clearTimeout(align);
      clearInterval(interval);
    };
  }, [running]);

  return now;
}

export type TimerProps = Readonly<{
  session: Session;
  /** Spoken before the time, e.g. `Time`. */
  caption: string;
}>;

/** `mm:ss` of the round: live while playing, the final time when complete, 00:00 when idle. */
export function Timer({ session, caption }: TimerProps) {
  const colors = useColors();
  const playing = session.round.phase === 'playing';
  const now = useWallClock(playing);
  const text = formatElapsed(elapsedSeconds(session, now));

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${caption}: ${text}`}
      style={styles.timer}
    >
      <Icon name="clock" size={15} strokeWidth={2.2} color={playing ? colors.lime : colors.green} />
      <AppText latin tabular weight={900} size={15} color={colors.green} style={styles.ltr}>
        {text}
      </AppText>
    </View>
  );
}

const trackSpring = { damping: 20, stiffness: 170, overshootClamping: true } as const;

function ProgressTrack({
  found,
  target,
  label,
}: Readonly<{ found: number; target: number; label: string }>) {
  const colors = useColors();
  const ratio = target > 0 ? Math.min(1, found / target) : 0;
  const progress = useSharedValue(ratio);
  const fill = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%` as const,
  }));
  const tint = useMemo(
    () => ({ track: { backgroundColor: colors.line }, fill: { backgroundColor: colors.green } }),
    [colors],
  );

  useEffect(() => {
    progress.value = withSpring(ratio, trackSpring);
  }, [ratio, progress]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: target, now: found }}
      style={[styles.track, tint.track]}
    >
      <Animated.View style={[styles.fill, tint.fill, fill]} />
    </View>
  );
}

function CountPill({
  found,
  target,
  label,
}: Readonly<{ found: number; target: number; label: string }>) {
  const colors = useColors();
  const tint = useMemo(
    () => ({ backgroundColor: colors.card, borderColor: colors.line }),
    [colors],
  );

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${found}/${target}`}
      style={[styles.pill, tint]}
    >
      <AppText latin tabular weight={800} size={12} style={styles.ltr}>
        {found}/{target}
      </AppText>
    </View>
  );
}

export type AlbumHeaderProps = Readonly<{
  session: Session;
  level: Level;
  language: Language;
  unranked: boolean;
  copy: Copy;
  foundCount: number;
}>;

export function AlbumHeader({
  session,
  level,
  language,
  unranked,
  copy,
  foundCount,
}: AlbumHeaderProps) {
  const colors = useColors();
  const target = session.challenge.target;
  const isLetter = session.challenge.scope.kind === 'letter';
  const playing = session.round.phase === 'playing';
  const round =
    session.kind === 'practice'
      ? copy.roundChip(copy.practice, categoryLabel(session.challenge, language, copy))
      : copy.roundChip(copy.freeTime, copy.modeLabel(level));
  const line = useMemo(
    () => challengeLine(session.challenge, language),
    [session.challenge, language],
  );
  const tint = useMemo(() => ({ backgroundColor: colors.soft }), [colors]);
  const dash = useMemo(() => ({ borderColor: colors.line }), [colors]);

  return (
    <View style={tint}>
      <View style={styles.header}>
        <View style={styles.title}>
          {playing ? (
            <AppText weight={800} size={11} color={colors.muted}>
              {round}
            </AppText>
          ) : null}
          <AppText
            accessibilityRole="header"
            weight={1000}
            size={17}
            lineHeight={21}
            style={styles.challenge}
          >
            {line.before}
            <AppText
              weight={1000}
              size={17}
              color={colors.green}
              style={isLetter ? styles.ltr : null}
            >
              {line.focus}
            </AppText>
            {line.after}
          </AppText>
          {isLetter ? (
            <AppText weight={700} size={11} color={colors.muted}>
              {copy.letterHint}
            </AppText>
          ) : null}
          {playing && unranked ? (
            <AppText weight={800} size={11} color={colors.warning}>
              {copy.notRankedChip}
            </AppText>
          ) : null}
        </View>
        <View style={styles.status}>
          <CountPill found={foundCount} target={target} label={copy.found} />
          <Timer session={session} caption={copy.elapsed} />
        </View>
      </View>
      <ProgressTrack found={foundCount} target={target} label={copy.progress} />
      {/* A dashed edge on one side only is unreliable, so a dashed box is clipped to its top line. */}
      <View style={styles.dashClip}>
        <View style={[styles.dash, dash]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  challenge: {
    letterSpacing: -0.4,
  },
  status: {
    alignItems: 'flex-end',
    gap: 6,
  },
  pill: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ltr: {
    writingDirection: 'ltr',
  },
  track: {
    height: 4,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  dashClip: {
    height: 1,
    overflow: 'hidden',
  },
  dash: {
    height: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
