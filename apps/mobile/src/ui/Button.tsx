import { useMemo } from 'react';
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import type { CueName } from '../feedback/feedback';
import { useColors } from '../theme/ThemeProvider';
import type { Colors } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'lime' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

export type ButtonProps = Readonly<{
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  /** Stretches to the full width of its container. */
  block?: boolean;
  disabled?: boolean;
  /** Feedback cue fired on press. Defaults to `'tap'`. */
  cue?: CueName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}>;

const raised: ViewStyle = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
};

type Look = Readonly<{ surface: ViewStyle; text: string }>;

function lookFor(variant: ButtonVariant, colors: Colors): Look {
  switch (variant) {
    case 'primary':
      return {
        surface: { backgroundColor: colors.green, shadowColor: colors.shadow, ...raised },
        text: colors.onGreen,
      };
    case 'lime':
      return { surface: { backgroundColor: colors.lime }, text: colors.onAccent };
    case 'outline':
      return { surface: { borderColor: colors.line, borderWidth: 1 }, text: colors.green };
    case 'ghost':
      return { surface: {}, text: colors.muted };
    case 'danger':
      return {
        surface: {
          backgroundColor: colors.warningBg,
          borderColor: colors.warningLine,
          borderWidth: 1,
        },
        text: colors.warning,
      };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  block = false,
  disabled = false,
  cue = 'tap',
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const look = useMemo(() => lookFor(variant, colors), [variant, colors]);
  const small = size === 'sm';
  const iconSize = small ? 16 : 18;

  return (
    <PressableScale
      {...rest}
      cue={cue}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        small ? styles.sm : styles.md,
        look.surface,
        block && styles.block,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leadingIcon ? (
        <Icon
          name={leadingIcon}
          size={iconSize}
          color={look.text}
          strokeWidth={2}
          flipRtl={leadingIcon === 'arrow'}
        />
      ) : null}
      <AppText weight={800} size={small ? 13 : 14} color={look.text} numberOfLines={1}>
        {label}
      </AppText>
      {trailingIcon ? (
        <Icon
          name={trailingIcon}
          size={iconSize}
          color={look.text}
          strokeWidth={2}
          flipRtl={trailingIcon === 'arrow'}
        />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderCurve: 'continuous',
  },
  md: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
  },
  sm: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  block: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
});
