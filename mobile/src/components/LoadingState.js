import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import AppText from './AppText';

export default function LoadingState({ message = 'Loading…', compact = false }) {
  return (
    <View style={[styles.wrap, compact ? styles.compact : styles.fill]} accessibilityRole="progressbar" accessibilityLabel={message}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="body" color={colors.mutedText} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  fill: { flex: 1 },
  compact: { paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  text: { marginTop: spacing.sm, textAlign: 'center' },
});
