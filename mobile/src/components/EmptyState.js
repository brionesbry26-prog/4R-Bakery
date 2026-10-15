import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';
import AppText from './AppText';
import PrimaryButton from './PrimaryButton';

export default function EmptyState({ icon = 'basket-outline', title, message, actionTitle, onAction, compact }) {
  return (
    <View style={[styles.wrap, compact ? styles.compact : styles.fill]}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={40} color={colors.secondary} />
      </View>
      <AppText variant="h2" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color={colors.mutedText} style={[styles.center, styles.msg]}>
          {message}
        </AppText>
      ) : null}
      {actionTitle && onAction ? <PrimaryButton title={actionTitle} onPress={onAction} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  fill: { flex: 1 },
  compact: { paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  iconWrap: {
    width: 88,
    height: 88,
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
