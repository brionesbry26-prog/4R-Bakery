import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing, touchTarget } from '../constants/theme';
import AppText from './AppText';

const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.surface, border: colors.primary, pressed: '#761886' },
  secondary: { bg: colors.secondary, fg: colors.surface, border: colors.secondary, pressed: '#AE45AB' },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.primary, pressed: colors.primaryLight },
  soft: { bg: colors.frostingLight, fg: colors.primary, border: colors.frosting, pressed: colors.frosting },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.danger, pressed: colors.dangerLight },
};

function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  size = 'md',
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;
  const fg = isDisabled ? colors.disabledText : v.fg;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !isDisabled && { backgroundColor: v.pressed },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={fg} style={styles.iconLeft} /> : null}
          <AppText variant="label" weight="semibold" color={fg} numberOfLines={1}>
            {title}
          </AppText>
          {iconRight ? <Ionicons name={iconRight} size={18} color={fg} style={styles.iconRight} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export default memo(PrimaryButton);

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 36, paddingHorizontal: spacing.md },
  lg: { minHeight: 56 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
});
