import type { ReactNode } from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useLanguage } from '../game/play';
import { useColors } from '../theme/ThemeProvider';

const paths = {
  arrow: <Path d="M5 12h14m-6-6 6 6-6 6" />,
  check: <Path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <Circle cx="12" cy="13" r="8" />
      <Path d="M12 9v4l3 2M9 2h6M12 2v3m6 1 2-2" />
    </>
  ),
  help: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01" />
    </>
  ),
  shuffle: (
    <Path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c1.5 0 3-1 4-3m4-6c1-2 2-3 4-3h3m-4-4 4 4-4 4" />
  ),
  globe: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Ellipse cx="12" cy="12" rx="4" ry="9" />
      <Path d="M3 12h18" />
    </>
  ),
  share: <Path d="M12 16V3m-4 4 4-4 4 4M5 12H3v9h18v-9h-2" />,
  ball: (
    <>
      <Circle cx="12" cy="12" r="9.5" />
      <Path d="m12 7 5 3-2 5H9l-2-5 5-3Zm0 0V2.5m5 7.5 4.5-1m-6.5 6 3.5 5M9 15l-3.5 5M7 10l-4.5-1" />
    </>
  ),
  moon: <Path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  close: <Path d="m6 6 12 12M6 18 18 6" />,
  trophy: (
    <Path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 3v5m-4 1h8" />
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M10.3 2.5h3.4l.6 2.6 1.9 1.1 2.5-.8 1.7 2.9-2 1.8v2.2l2 1.8-1.7 2.9-2.5-.8-1.9 1.1-.6 2.6h-3.4l-.6-2.6-1.9-1.1-2.5.8-1.7-2.9 2-1.8v-2.2l-2-1.8 1.7-2.9 2.5.8 1.9-1.1.6-2.6Z" />
    </>
  ),
  sparkle: (
    <Path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Zm7 12c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z" />
  ),
  chevronDown: <Path d="m6 9 6 6 6-6" />,
  volume: (
    <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Zm12 .5a3 3 0 0 1 0 4m2.5-6.5a6.5 6.5 0 0 1 0 9" />
  ),
  volumeOff: <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Zm12 0 5 5m0-5-5 5" />,
  vibrate: (
    <>
      <Path d="M9 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <Path d="M4.5 9v6M2 10.5v3m17.5-4.5v6m2.5-4.5v3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export type IconProps = Readonly<{
  name: IconName;
  size?: number;
  /** Stroke colour; defaults to `colors.ink`. */
  color?: string;
  strokeWidth?: number;
  /** Mirrors the glyph in right-to-left layouts (directional arrows). */
  flipRtl?: boolean;
}>;

export function Icon({ name, size = 21, color, strokeWidth = 1.7, flipRtl = false }: IconProps) {
  const language = useLanguage();
  const colors = useColors();
  const mirrored = flipRtl && (I18nManager.isRTL || language === 'ar');

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? colors.ink}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      {...(mirrored ? { style: styles.mirrored } : {})}
    >
      {paths[name]}
    </Svg>
  );
}

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
});
