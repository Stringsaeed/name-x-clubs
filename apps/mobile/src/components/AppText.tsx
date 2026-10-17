import { Text, type TextProps } from 'react-native';
import { useLanguage } from '../play';
import { colors, fonts } from '../theme';

export function AppText({ style, ...rest }: TextProps) {
  const language = useLanguage();

  return <Text {...rest} style={[{ color: colors.ink, fontFamily: fonts[language] }, style]} />;
}
