import type { ReactNode } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { type CueName, cue as fireCue } from '../feedback/feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const pressSpring = { damping: 18, stiffness: 320, mass: 0.6 } as const;

export const pressedScale = 0.96;

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Feedback cue fired on press (haptic and sound). */
  cue?: CueName;
  /** Fires the light `tap` haptic on press when no `cue` is given. */
  haptic?: boolean;
  /** How far the control shrinks while held. Defaults to 0.96. */
  scaleTo?: number;
};

export function PressableScale({
  style,
  children,
  cue,
  haptic = false,
  scaleTo = pressedScale,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  accessibilityState,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDisabled = disabled === true;

  function handlePressIn(event: GestureResponderEvent) {
    scale.value = withSpring(scaleTo, pressSpring);
    onPressIn?.(event);
  }

  function handlePressOut(event: GestureResponderEvent) {
    scale.value = withSpring(1, pressSpring);
    onPressOut?.(event);
  }

  function handlePress(event: GestureResponderEvent) {
    if (cue) {
      fireCue(cue);
    } else if (haptic) {
      fireCue('tap');
    }

    onPress?.(event);
  }

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: isDisabled }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
