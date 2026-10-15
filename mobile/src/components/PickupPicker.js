import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing, touchTarget } from '../constants/theme';
import { formatDate, formatTime, toDateString, toTimeString } from '../utils/datetime';
import AppText from './AppText';
import PrimaryButton from './PrimaryButton';
import TextField from './TextField';

function parseLocal(date, time) {
  const d = new Date();
  if (date) {
    const [y, m, day] = date.split('-').map(Number);
    d.setFullYear(y, m - 1, day);
  }
  if (time) {
    const [h, min] = time.split(':').map(Number);
    d.setHours(h, min, 0, 0);
  }
  return d;
}

function PickerButton({ icon, label, value, placeholder, onPress, error }) {
  return (
    <View style={styles.field}>
      <AppText variant="label" style={styles.label}>
        {label}
        <AppText variant="label" color={colors.primary}> *</AppText>
      </AppText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'not set'}`}
        accessibilityHint="Opens a picker"
        style={({ pressed }) => [styles.button, error && styles.buttonError, pressed && styles.pressed]}
      >
        <Ionicons name={icon} size={18} color={colors.secondary} />
        <AppText variant="body" color={value ? colors.deepText : colors.disabledText} style={styles.value} numberOfLines={1}>
          {value || placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.mutedText} />
      </Pressable>
      {error ? (
        <AppText variant="small" color={colors.danger} style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * Pickup date + time selector.
 * Android: native dialogs. iOS: native picker in a bottom sheet. Web: text inputs.
 */
export default function PickupPicker({ value, onChange, errors = {}, maxAdvanceDays = 60 }) {
  const [iosMode, setIosMode] = useState(null); // 'date' | 'time' | null
  const [draft, setDraft] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getTime() + maxAdvanceDays * 86400000);

  const apply = (mode, picked) => {
    if (!picked) return;
    onChange(mode === 'date' ? { ...value, date: toDateString(picked) } : { ...value, time: toTimeString(picked) });
  };

  const open = (mode) => {
    const current = parseLocal(value.date, value.time || '09:00');
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: false,
        minimumDate: mode === 'date' ? today : undefined,
        maximumDate: mode === 'date' ? maxDate : undefined,
        onValueChange: (_e, picked) => apply(mode, picked),
      });
    } else {
      setDraft(current);
      setIosMode(mode);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.row}>
        <TextField
          label="Pickup date"
          required
          placeholder="YYYY-MM-DD"
          value={value.date}
          onChangeText={(t) => onChange({ ...value, date: t.trim() })}
          error={errors.date}
          style={styles.flex}
          maxLength={10}
        />
        <TextField
          label="Pickup time"
          required
          placeholder="HH:MM (24h)"
          value={value.time}
          onChangeText={(t) => onChange({ ...value, time: t.trim() })}
          error={errors.time}
          style={[styles.flex, styles.ml]}
          maxLength={5}
        />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <PickerButton
          icon="calendar-outline"
          label="Pickup date"
          value={value.date ? formatDate(value.date) : ''}
          placeholder="Choose date"
          onPress={() => open('date')}
          error={errors.date}
        />
        <View style={styles.gap} />
        <PickerButton
          icon="time-outline"
          label="Pickup time"
          value={value.time ? formatTime(value.time) : ''}
          placeholder="Choose time"
          onPress={() => open('time')}
          error={errors.time}
        />
      </View>

      {Platform.OS === 'ios' ? (
        <Modal visible={!!iosMode} transparent animationType="slide" onRequestClose={() => setIosMode(null)}>
          <Pressable style={styles.backdrop} onPress={() => setIosMode(null)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <AppText variant="h3" style={styles.sheetTitle}>
                {iosMode === 'date' ? 'Pickup date' : 'Pickup time'}
              </AppText>
              {iosMode ? (
                <DateTimePicker
                  value={draft}
                  mode={iosMode}
                  display={iosMode === 'date' ? 'inline' : 'spinner'}
                  minimumDate={iosMode === 'date' ? today : undefined}
                  maximumDate={iosMode === 'date' ? maxDate : undefined}
                  minuteInterval={iosMode === 'time' ? 5 : undefined}
                  accentColor={colors.primary}
                  themeVariant="light"
                  onValueChange={(_e, picked) => picked && setDraft(picked)}
                />
              ) : null}
              <PrimaryButton
                title="Done"
                onPress={() => {
                  apply(iosMode, draft);
                  setIosMode(null);
                }}
                style={styles.done}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  ml: { marginLeft: spacing.sm },
  gap: { width: spacing.sm },
  field: { flex: 1, marginBottom: spacing.md },
  label: { marginBottom: spacing.xxs + 2 },
  button: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  buttonError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  pressed: { backgroundColor: colors.frostingLight },
  value: { flex: 1, marginHorizontal: spacing.xs },
  error: { marginTop: spacing.xxs },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { marginBottom: spacing.sm },
  done: { marginTop: spacing.md },
});
