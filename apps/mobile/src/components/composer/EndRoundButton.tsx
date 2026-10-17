import { Alert, Keyboard, StyleSheet } from 'react-native';
import type { Copy } from '../../copy';
import { cue } from '../../feedback/feedback';
import { useColors } from '../../theme/ThemeProvider';
import { radii } from '../../theme/tokens';
import { Icon, PressableScale } from '../../ui';

export function EndRoundButton({ copy, onFinish }: Readonly<{ copy: Copy; onFinish: () => void }>) {
  const colors = useColors();

  function confirmFinish() {
    Alert.alert(copy.endRoundTitle, copy.endRoundMessage, [
      { text: copy.keepPlaying, style: 'cancel' },
      {
        text: copy.endRound,
        style: 'destructive',
        onPress: () => {
          Keyboard.dismiss();
          cue('finish');
          onFinish();
        },
      },
    ]);
  }

  return (
    <PressableScale
      accessibilityLabel={copy.endRound}
      accessibilityHint={copy.endRoundHint}
      cue="tap"
      onPress={confirmFinish}
      style={[styles.button, { backgroundColor: colors.soft, borderColor: colors.line }]}
    >
      <Icon name="close" size={20} color={colors.muted} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
});
