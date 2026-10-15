import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii } from '../constants/theme';
import AppText from './AppText';

function StepButton({ icon, onPress, disabled, label, compact }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={compact ? 8 : 4}
      style={({ pressed }) => [
        styles.step,
        compact && styles.stepCompact,
        pressed && styles.stepPressed,
        disabled && styles.stepDisabled,
      ]}
    >
      <Ionicons name={icon} size={compact ? 16 : 20} color={disabled ? colors.disabledText : colors.primary} />
    </Pressable>
  );
}

function QuantitySelector({ value, onChange, min = 1, max = 500, compact = false, itemName = 'item', allowRemove = false }) {
  const atMin = value <= min;
  return (
    <View style={styles.row} accessibilityLabel={`Quantity of ${itemName}: ${value}`}>
      <StepButton
        icon={atMin && allowRemove ? 'trash-outline' : 'remove'}
        label={atMin && allowRemove ? `Remove ${itemName}` : `Decrease ${itemName} quantity`}
        disabled={atMin && !allowRemove}
        onPress={() => onChange(value - 1)}
        compact={compact}
      />
      <AppText variant={compact ? 'label' : 'h3'} style={[styles.value, compact && styles.valueCompact]}>
        {value}
      </AppText>
      <StepButton
        icon="add"
        label={`Increase ${itemName} quantity`}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        compact={compact}
      />
    </View>
  );
}

export default memo(QuantitySelector);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  step: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepCompact: { width: 34, height: 34 },
  stepPressed: { backgroundColor: colors.frostingLight },
  stepDisabled: { borderColor: colors.disabled },
  value: { minWidth: 48, textAlign: 'center' },
  valueCompact: { minWidth: 34 },
});
