import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';
import AppText from './AppText';

function CategoryChip({ label, selected, onPress, count }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${count != null ? `, ${count} items` : ''}`}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && !selected && styles.pressed]}
    >
      <AppText variant="label" color={selected ? colors.surface : colors.deepText}>
        {label}
        {count != null ? ` · ${count}` : ''}
      </AppText>
    </Pressable>
  );
}

export default memo(CategoryChip);

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { backgroundColor: colors.frostingLight },
});
