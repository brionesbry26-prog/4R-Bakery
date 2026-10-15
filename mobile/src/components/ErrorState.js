import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { API_BASE_URL } from '../constants/config';
import { colors, radii, spacing } from '../constants/theme';
import AppText from './AppText';
import PrimaryButton from './PrimaryButton';

export default function ErrorState({ title = 'Something went wrong', error, message, onRetry, compact = false }) {
  const text = message || error?.message || 'Please try again.';
  const offline = error?.isNetworkError;
  return (
    <View style={[styles.wrap, compact ? styles.compact : styles.fill]} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'} size={34} color={colors.primary} />
      </View>
      <AppText variant="h3" style={styles.center}>
        {offline ? 'Can’t reach the bakery' : title}
      </AppText>
      <AppText variant="body" color={colors.mutedText} style={[styles.center, styles.msg]}>
        {text}
      </AppText>
      {offline && __DEV__ ? (
        <AppText variant="caption" color={colors.mutedText} style={[styles.center, styles.msg]}>
          API: {API_BASE_URL || 'not configured'}
        </AppText>
      ) : null}
      {onRetry ? <PrimaryButton title="Try again" icon="refresh" onPress={onRetry} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  fill: { flex: 1 },
  compact: { paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.frostingLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  center: { textAlign: 'center' },
  msg: { marginTop: spacing.xs, maxWidth: 320 },
  btn: { marginTop: spacing.lg },
});
