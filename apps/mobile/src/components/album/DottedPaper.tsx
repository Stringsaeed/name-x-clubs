import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

const pitch = 14;

/** The album's dotted paper: one repeating pattern tile, drawn behind the slots. */
export const DottedPaper = memo(function DottedPaperView({ color }: Readonly<{ color: string }>) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" accessible={false}>
        <Defs>
          <Pattern id="albumDots" width={pitch} height={pitch} patternUnits="userSpaceOnUse">
            <Circle cx={pitch / 2} cy={pitch / 2} r={0.85} fill={color} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#albumDots)" />
      </Svg>
    </View>
  );
});
