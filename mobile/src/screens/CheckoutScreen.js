import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PickupPicker from '../components/PickupPicker';
import PrimaryButton from '../components/PrimaryButton';
import TextField from '../components/TextField';
import { colors, radii, spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { diffCartAgainstCatalog } from '../context/cartReducer';
import { useCatalog } from '../context/CatalogContext';
import { useOrders } from '../context/OrdersContext';
import api from '../services/api';
import { formatDate, formatTime, toDateString } from '../utils/datetime';
import { createIdempotencyKey } from '../utils/ids';
import { formatCents, formatPeso, toCents } from '../utils/money';
import { normalizePhone, validateEmail, validateName, validatePhone, validatePickup } from '../utils/validation';

const SERVER_FIELD_MAP = {
  'customer.full_name': 'name',
  'customer.phone': 'phone',
  'customer.email': 'email',
  pickup_date: 'date',
  pickup_time: 'time',
  notes: 'notes',
};

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateString(d);
}

function askConfirm(title, message) {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : true);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Review', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Submit', onPress: () => resolve(true) },
    ]);
  });
}

export default function CheckoutScreen({ navigation }) {
  const { items, subtotalCents, clearCart, syncWithProducts } = useCart();
  const { info } = useCatalog();
  const { rememberOrder } = useOrders();
  const rules = info?.pickup;

  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [pickup, setPickup] = useState({ date: tomorrow(), time: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null); // { tone: 'error' | 'warning', title, lines[] }
  const submittingRef = useRef(false);
  const idempotency = useRef({ fingerprint: null, key: null });
  const scrollRef = useRef(null);

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onPickupChange = (next) => {
    setPickup(next);
    setErrors((e) => ({ ...e, date: undefined, time: undefined }));
  };

  // If the user leaves mid-request, don't let a late response update state.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const validate = useCallback(() => {
    const next = {
      name: validateName(form.name),
      phone: validatePhone(form.phone),
      email: validateEmail(form.email),
      notes: form.notes.length > 500 ? 'Notes can be at most 500 characters.' : null,
      ...validatePickup(pickup, rules),
    };
    Object.keys(next).forEach((k) => next[k] == null && delete next[k]);
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, pickup, rules]);

  const buildPayload = () => ({
    customer: {
      full_name: form.name.trim().replace(/\s+/g, ' '),
      phone: normalizePhone(form.phone),
      email: form.email.trim() || null,
    },
    items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    pickup_date: pickup.date,
    pickup_time: pickup.time,
    notes: form.notes.trim() || null,
  });

  const submit = async () => {
    if (submittingRef.current) return; // guard against double taps
    setBanner(null);
    if (!items.length) return;
    if (!validate()) {
      setBanner({ tone: 'error', title: 'Please check the highlighted fields.' });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      // 1. Re-validate prices and availability against the server before ordering.
      const fresh = await api.getProducts({ limit: 100 });
      const changes = diffCartAgainstCatalog(items, fresh.items);
      syncWithProducts(fresh.items);
      if (changes.length) {
        setBanner({
          tone: 'warning',
          title: 'Your bag was updated with the latest menu.',
          lines: [...changes.map((c) => c.message), 'Please review your bag before submitting.'],
        });
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      // 2. Confirm the summary.
      const ok = await askConfirm(
        'Submit pre-order request?',
        `${items.length} item(s) · estimated ${formatCents(subtotalCents)}\nPickup ${formatDate(pickup.date)} at ${formatTime(
          pickup.time
        )}\n\nThe bakery will review and confirm your request.`
      );
      if (!ok) return;

      // 3. Submit with an idempotency key so retries never create duplicates.
      const payload = buildPayload();
      const fingerprint = JSON.stringify(payload);
      if (idempotency.current.fingerprint !== fingerprint) {
        idempotency.current = { fingerprint, key: createIdempotencyKey() };
      }
      const order = await api.createOrder(payload, idempotency.current.key);

      // 4. Only after the server confirms creation: remember it and clear the bag.
      rememberOrder(order.reference, payload.customer.phone, order);
      navigation.replace('OrderConfirmation', { order });
      clearCart();
    } catch (err) {
      if (!mounted.current) return;
      const fieldErrors = {};
      for (const fe of err.fieldErrors || []) {
        const key = SERVER_FIELD_MAP[fe.field];
        if (key) fieldErrors[key] = fe.message;
      }
      if (Object.keys(fieldErrors).length) setErrors((e) => ({ ...e, ...fieldErrors }));
      setBanner({
        tone: 'error',
        title: err.isNetworkError ? 'Your request was not sent.' : 'We couldn’t submit your pre-order.',
        lines: [
          err.message,
          err.isNetworkError ? 'Your bag is still saved. Check your connection and tap Submit again.' : null,
        ].filter(Boolean),
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      submittingRef.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <EmptyState
        icon="basket-outline"
        title="Your bag is empty"
        message="Add items to your bag before placing a pre-order."
        actionTitle="Browse the menu"
        onAction={() => navigation.navigate('MainTabs', { screen: 'Products' })}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.pendingNote}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <AppText variant="small" color={colors.deepText} style={styles.flexText}>
              This is a <AppText variant="small" weight="semibold">pre-order request</AppText>. It stays{' '}
              <AppText variant="small" weight="semibold">pending</AppText> until 4R Bakery confirms it. No payment is
              collected in the app; the bakery will confirm payment details with you.
            </AppText>
          </View>

          {banner ? (
            <View
              style={[styles.banner, banner.tone === 'warning' ? styles.bannerWarning : styles.bannerError]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <AppText variant="label" weight="semibold" color={banner.tone === 'warning' ? colors.warning : colors.danger}>
                {banner.title}
              </AppText>
              {(banner.lines || []).map((l, i) => (
                <AppText key={i} variant="small" color={banner.tone === 'warning' ? colors.warning : colors.danger} style={styles.bannerLine}>
                  • {l}
                </AppText>
              ))}
            </View>
          ) : null}

          {/* Order summary */}
          <AppText variant="h2" style={styles.sectionTitle}>
            Order summary
          </AppText>
          <Card>
            {items.map((i) => (
              <View key={i.productId} style={styles.summaryLine}>
                <AppText variant="body" style={styles.flexText} numberOfLines={2}>
                  {i.quantity} × {i.name}
                  <AppText variant="small" color={colors.mutedText}>
                    {'  '}@ {formatPeso(i.price)}
                  </AppText>
                </AppText>
                <AppText variant="bodyMedium">{formatCents(toCents(i.price) * i.quantity)}</AppText>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryLine}>
              <AppText variant="h3" style={styles.flexText}>
                Estimated total
              </AppText>
              <AppText variant="h3" color={colors.primary}>
                {formatCents(subtotalCents)}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.mutedText}>
              The bakery’s server calculates the final total from current prices.
            </AppText>
            <PrimaryButton
              title="Edit bag"
              variant="soft"
              size="sm"
              icon="create-outline"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
              style={styles.editBag}
            />
          </Card>

          {/* Customer */}
          <AppText variant="h2" style={styles.sectionTitle}>
            Your details
          </AppText>
          <TextField
            label="Full name"
            required
            value={form.name}
            onChangeText={setField('name')}
            error={errors.name}
            placeholder="Juan Dela Cruz"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={120}
            returnKeyType="next"
          />
          <TextField
            label="Contact number"
            required
            value={form.phone}
            onChangeText={setField('phone')}
            error={errors.phone}
            placeholder="0917 123 4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={20}
            hint="Philippine mobile number. The bakery uses this to confirm your order."
          />
          <TextField
            label="Email (optional)"
            value={form.email}
            onChangeText={setField('email')}
            error={errors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={254}
          />

          {/* Pickup */}
          <AppText variant="h2" style={styles.sectionTitle}>
            Pickup schedule
          </AppText>
          <PickupPicker value={pickup} onChange={onPickupChange} errors={errors} maxAdvanceDays={rules?.max_advance_days ?? 60} />
          <AppText variant="caption" color={colors.mutedText} style={styles.pickupHint}>
            Pickup at {info?.address || 'Brgy. Bachawan, San Agustin, Romblon'}.
            {rules ? ` Allow at least ${rules.min_lead_minutes} minutes for preparation.` : ''}
            {rules?.open_time && rules?.close_time ? ` Pickup hours: ${formatTime(rules.open_time)}–${formatTime(rules.close_time)}.` : ''}
          </AppText>

          <TextField
            label="Special instructions (optional)"
            value={form.notes}
            onChangeText={setField('notes')}
            error={errors.notes}
            placeholder="e.g. Cake greeting: Happy Birthday, Lola!"
            multiline
            maxLength={500}
            hint={`${form.notes.length}/500`}
            style={styles.notes}
          />
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            testID="submit-order"
            title={submitting ? 'Submitting…' : 'Submit pre-order request'}
            icon="paper-plane-outline"
            size="lg"
            loading={submitting}
            disabled={submitting}
            onPress={submit}
            accessibilityHint="Sends your pre-order request to the bakery"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  flexText: { flex: 1, marginRight: spacing.xs },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  pendingNote: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  banner: { padding: spacing.sm, borderRadius: radii.md, marginTop: spacing.md, borderWidth: 1 },
  bannerError: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
  bannerWarning: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  bannerLine: { marginTop: 2 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  summaryLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xxs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  editBag: { alignSelf: 'flex-start', marginTop: spacing.sm },
  pickupHint: { marginTop: -spacing.xs, marginBottom: spacing.md },
  notes: { marginTop: spacing.xs },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
