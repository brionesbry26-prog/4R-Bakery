import { StyleSheet, View } from 'react-native';

import { colors, radii, shadow, spacing } from '../constants/theme';

export default function Card({ children, style, tone = 'surface', ...rest }) {
  return (
    <View style={[styles.card, tone === 'frosting' && styles.frosting, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  frosting: { backgroundColor: colors.frostingLight, borderColor: colors.frosting, shadowOpacity: 0, elevation: 0 },
});
