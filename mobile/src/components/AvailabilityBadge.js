import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';
import AppText from './AppText';

function AvailabilityBadge({ available, style }) {
  return (
    <View style={[styles.badge, available ? styles.on : styles.off, style]}>
      <View style={[styles.dot, { backgroundColor: available ? colors.success : colors.danger }]} />
      <AppText variant="caption" color={available ? colors.success : colors.danger}>
        {available ? 'Available' : 'Unavailable'}
      </AppText>
    </View>
  );
}

export default memo(AvailabilityBadge);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  on: { backgroundColor: colors.successLight },
  off: { backgroundColor: colors.dangerLight },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
});
