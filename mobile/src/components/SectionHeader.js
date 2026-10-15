import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import AppText from './AppText';

export default function SectionHeader({ title, subtitle, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.flex}>
        <AppText variant="h2" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.mutedText}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10} style={styles.action}>
          <AppText variant="label" color={colors.primary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm },
  flex: { flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingLeft: spacing.sm },
});
