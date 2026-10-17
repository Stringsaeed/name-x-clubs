import { useMemo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useColors } from '../theme/ThemeProvider';
import { radii, spacing } from '../theme/tokens';

export type CardProps = ViewProps & {
  /** Adds the standard inner padding. */
  padded?: boolean;
};

export function Card({ padded = false, style, ...rest }: CardProps) {
  const colors = useColors();
  const tint = useMemo(
    () => ({ backgroundColor: colors.card, borderColor: colors.line, shadowColor: colors.shadow }),
    [colors],
  );

  return <View {...rest} style={[styles.card, tint, padded && styles.padded, style]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
  },
  padded: {
    padding: spacing.lg,
  },
});
