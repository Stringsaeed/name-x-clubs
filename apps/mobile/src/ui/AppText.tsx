import { Text, type TextProps, type TextStyle } from 'react-native';
import { useLanguage } from '../game/play';
import { fontFamily, type Weight } from '../theme/fonts';
import { useColors } from '../theme/ThemeProvider';

export type AppTextProps = TextProps & {
  weight?: Weight;
  size?: number;
  lineHeight?: number;
  color?: string;
  /** Equal-width digits for counters and times. */
  tabular?: boolean;
  /** Forces Nunito (digits, times, the brand) whatever the language. */
  latin?: boolean;
};

const tabularVariant: TextStyle['fontVariant'] = ['tabular-nums'];

export function AppText({
  weight = 700,
  size,
  lineHeight,
  color,
  tabular = false,
  latin = false,
  style,
  ...rest
}: AppTextProps) {
  const language = useLanguage();
  const colors = useColors();
  const base: TextStyle = {
    color: color ?? colors.ink,
    fontFamily: fontFamily(latin ? 'en' : language, weight),
    ...(size === undefined ? {} : { fontSize: size }),
    ...(lineHeight === undefined ? {} : { lineHeight }),
    ...(tabular ? { fontVariant: tabularVariant } : {}),
  };

  return <Text maxFontSizeMultiplier={1.3} {...rest} style={[base, style]} />;
}
