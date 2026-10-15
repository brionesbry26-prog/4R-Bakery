import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';
import AppText from './AppText';

const STATUS_STYLES = {
  pending: { bg: colors.warningLight, fg: colors.warning },
  accepted: { bg: colors.primaryLight, fg: colors.primary },
  preparing: { bg: colors.frostingLight, fg: colors.primary },
  ready_for_pickup: { bg: colors.successLight, fg: colors.success },
  completed: { bg: colors.successLight, fg: colors.success },
  rejected: { bg: colors.dangerLight, fg: colors.danger },
  cancelled: { bg: '#EEE8EF', fg: colors.mutedText },
};

export default function StatusBadge({ status, label }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]} accessibilityLabel={`Status: ${label || status}`}>
      <AppText variant="caption" color={s.fg}>
        {label || status}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill, alignSelf: 'flex-start' },
});
