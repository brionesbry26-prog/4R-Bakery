import { forwardRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, radii, spacing, touchTarget } from '../constants/theme';
import { useFontsReady } from '../context/FontContext';
import AppText, { fontStyle } from './AppText';

const TextField = forwardRef(function TextField(
  { label, error, hint, required, multiline, style, inputStyle, ...inputProps },
  ref
) {
  const fontsReady = useFontsReady();
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
          {required ? <AppText variant="label" color={colors.primary}> *</AppText> : null}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.disabledText}
        accessibilityLabel={label}
        accessibilityHint={hint}
        multiline={multiline}
        style={[
          styles.input,
          fontStyle('regular', fontsReady),
          multiline && styles.multiline,
          error && styles.inputError,
          inputStyle,
        ]}
        {...inputProps}
      />
      {error ? (
        <AppText variant="small" color={colors.danger} style={styles.message} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color={colors.mutedText} style={styles.message}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xxs + 2 },
  input: {
    minHeight: touchTarget,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.deepText,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  message: { marginTop: spacing.xxs },
});
