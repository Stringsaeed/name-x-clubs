import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

const shieldPath = 'M11 .8 20.6 4v7.6c0 5.8-4 10-9.6 12.6C5.4 21.6 1.4 17.4 1.4 11.6V4L11 .8Z';

/** The crest silhouette: an empty slot's placeholder and the initials fallback's backing. */
export const Shield = memo(function ShieldView({
  width,
  height,
  color,
  opacity = 1,
}: Readonly<{ width: number; height: number; color: string; opacity?: number }>) {
  return (
    <Svg width={width} height={height} viewBox="0 0 22 25" accessible={false}>
      <Path d={shieldPath} fill={color} opacity={opacity} />
    </Svg>
  );
});
