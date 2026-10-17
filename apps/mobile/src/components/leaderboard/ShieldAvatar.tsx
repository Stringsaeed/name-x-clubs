import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '../../ui/AppText';

const palette = ['#244f3b', '#c4553d', '#4f77b8', '#b8873d', '#7b5db0', '#3f8f86'] as const;
const anonymousColor = '#9aa58b';
const initialColor = '#ffffff';
const shieldPath = 'M12 .8 22 4.2v8.6c0 6.4-4.3 11.2-10 14.4C6.3 24 2 19.2 2 12.8V4.2Z';
const aspect = 28 / 24;

function colorFor(name: string): string {
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 997;
  }

  return palette[hash % palette.length] ?? anonymousColor;
}

/** The first visible character of a name, upper-cased. */
export function initialOf(name: string): string {
  const [first] = Array.from(name.trim());

  return (first ?? '?').toUpperCase();
}

export type ShieldAvatarProps = Readonly<{
  name: string;
  anonymous: boolean;
  /** Shield width; the height follows the 24:28 shape. */
  width: number;
}>;

export function ShieldAvatar({ name, anonymous, width }: ShieldAvatarProps) {
  const height = Math.round(width * aspect);
  const color = anonymous ? anonymousColor : colorFor(name);

  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no">
      <Svg width={width} height={height} viewBox="0 0 24 28">
        <Path d={shieldPath} fill={color} />
      </Svg>
      <View pointerEvents="none" style={styles.initial}>
        <AppText latin weight={900} size={Math.round(width * 0.46)} color={initialColor}>
          {initialOf(name)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  initial: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 1,
  },
});
