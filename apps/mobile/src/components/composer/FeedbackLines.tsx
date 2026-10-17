import type { AnswerEvent } from '@nxc/game/engine';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { feedbackLine } from '../../copy';
import { useLanguage } from '../../game/play';
import { useColors } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';
import { AppText } from '../../ui';

/** What the last answer did: a club accepted, or why it was not. */
export function FeedbackLines({ feedback }: Readonly<{ feedback: readonly AnswerEvent[] }>) {
  if (feedback.length === 0) {
    return null;
  }

  return (
    <View style={styles.list} accessibilityLiveRegion="polite">
      {feedback.map((event) => (
        <FeedbackLine key={`${event.kind}:${event.input}`} event={event} />
      ))}
    </View>
  );
}

function FeedbackLine({ event }: Readonly<{ event: AnswerEvent }>) {
  const colors = useColors();
  const language = useLanguage();
  const accepted = event.kind === 'accepted';
  const look = useMemo(
    () =>
      accepted
        ? {
            surface: { backgroundColor: colors.soft, borderColor: colors.line },
            text: colors.green,
          }
        : {
            surface: { backgroundColor: colors.warningBg, borderColor: colors.warningLine },
            text: colors.warning,
          },
    [accepted, colors],
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(160)}
      exiting={FadeOut.duration(120)}
      style={[styles.line, look.surface]}
    >
      <AppText weight={700} size={13} lineHeight={18} color={look.text}>
        {feedbackLine(event, language)}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
  line: {
    borderWidth: 1,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
