import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputInstance, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Copy } from '../../copy';
import { cue } from '../../feedback/feedback';
import { useLanguage } from '../../game/play';
import { fontFamily } from '../../theme/fonts';
import { useColors } from '../../theme/ThemeProvider';
import { radii, spacing } from '../../theme/tokens';
import { Icon, PressableScale } from '../../ui';

export type AnswerFieldProps = Readonly<{
  copy: Copy;
  foundCount: number;
  /** The ranked server's entry limit, when it applies. */
  maxLength: number | undefined;
  /** True when the draft should clear. */
  onSubmit: (text: string) => boolean;
}>;

// ±6 px, three cycles, about 280 ms.
function shakeSequence() {
  return withSequence(
    withTiming(-6, { duration: 23 }),
    withRepeat(withTiming(6, { duration: 47 }), 5, true),
    withTiming(0, { duration: 23 }),
  );
}

/** Fires `accepted` whenever the album gains a club (locally or from the server). */
function useAcceptedCue(foundCount: number) {
  const seen = useRef(foundCount);

  useEffect(() => {
    if (foundCount > seen.current) {
      cue('accepted');
    }

    seen.current = foundCount;
  }, [foundCount]);
}

export function AnswerField({ copy, foundCount, maxLength, onSubmit }: AnswerFieldProps) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const offset = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const look = useFieldLook(focused);
  const empty = draft.trim().length === 0;

  useAcceptedCue(foundCount);

  function submit() {
    const text = draft.trim();

    if (text.length === 0) {
      return;
    }

    if (onSubmit(text)) {
      setDraft('');
      return;
    }

    cue('rejected');
    offset.value = shakeSequence();
    input.current?.setSelection(0, draft.length);
  }

  return (
    <Animated.View style={[styles.wrapper, look.wrapper, shakeStyle]}>
      <Icon name="ball" size={20} color={look.muted} />
      <TextInput
        ref={input}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={copy.placeholder}
        placeholderTextColor={look.muted}
        accessibilityLabel={copy.placeholder}
        autoFocus
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="words"
        returnKeyType="send"
        submitBehavior="submit"
        maxLength={maxLength}
        selectionColor={look.caret}
        style={[styles.input, look.input]}
      />
      <SubmitButton label={copy.submit} dimmed={empty} onPress={submit} />
    </Animated.View>
  );
}

function useFieldLook(focused: boolean) {
  const colors = useColors();
  const language = useLanguage();

  return useMemo(
    () => ({
      wrapper: {
        backgroundColor: colors.soft,
        borderColor: focused ? colors.selectedLine : colors.line,
      },
      input: { color: colors.ink, fontFamily: fontFamily(language, 700) },
      muted: colors.muted,
      caret: colors.green,
    }),
    [colors, focused, language],
  );
}

function SubmitButton({
  label,
  dimmed,
  onPress,
}: Readonly<{ label: string; dimmed: boolean; onPress: () => void }>) {
  const colors = useColors();
  const tint = useMemo(() => ({ backgroundColor: colors.green }), [colors]);

  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.submit, tint, dimmed && styles.dimmed]}
    >
      <View pointerEvents="none">
        <Icon name="arrow" size={18} color={colors.onGreen} strokeWidth={2.2} flipRtl />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingStart: spacing.md,
    paddingEnd: 7,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: spacing.sm,
  },
  submit: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.45,
  },
});
