import { StyleSheet } from 'react-native';
import type { Weight } from '../../theme/fonts';
import { AppText } from '../../ui/AppText';

export type PlayerNameProps = Readonly<{
  name: string;
  weight?: Weight;
  size?: number;
  lineHeight?: number;
  color?: string;
  textAlign?: 'auto' | 'left' | 'right' | 'center';
  /** Defaults to one line. */
  numberOfLines?: number;
}>;

/**
 * A player's name. A generated nickname ends in a tag such as `#4F2A`; inside Arabic text it would
 * read `4F2A#`, so the tag is isolated as left-to-right Latin text.
 */
export function PlayerName({
  name,
  weight,
  size,
  lineHeight,
  color,
  textAlign,
  numberOfLines = 1,
}: PlayerNameProps) {
  const shared = {
    ...(weight === undefined ? {} : { weight }),
    ...(size === undefined ? {} : { size }),
    ...(lineHeight === undefined ? {} : { lineHeight }),
    ...(color === undefined ? {} : { color }),
  };
  const align = textAlign === undefined ? undefined : { textAlign };
  const tagStart = name.lastIndexOf(' #');

  if (tagStart === -1) {
    return (
      <AppText {...shared} numberOfLines={numberOfLines} style={align}>
        {name}
      </AppText>
    );
  }

  return (
    <AppText {...shared} numberOfLines={numberOfLines} style={align}>
      {name.slice(0, tagStart)}{' '}
      <AppText {...shared} latin style={styles.tag}>
        {name.slice(tagStart + 1)}
      </AppText>
    </AppText>
  );
}

const styles = StyleSheet.create({
  tag: {
    writingDirection: 'ltr',
  },
});
