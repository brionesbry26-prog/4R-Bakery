import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import OrderCard from '../components/OrderCard';
import PrimaryButton from '../components/PrimaryButton';
import TextField from '../components/TextField';
import { colors, radii, spacing } from '../constants/theme';
import { useOrders } from '../context/OrdersContext';
import api from '../services/api';
import { normalizePhone, validatePhone } from '../utils/validation';

/**
 * Orders placed on this device are remembered locally (reference + phone) and
 * refreshed from the API. Any other order can be looked up with its reference
 * and the contact number used when ordering — there is no account system and
 * no endpoint that lists all orders.
 */
export default function OrdersScreen({ navigation }) {
  const { saved, hydrated, rememberOrder, forgetOrder } = useOrders();
  const [remote, setRemote] = useState({}); // reference -> { order, error }
  const [refreshing, setRefreshing] = useState(false);
  const [lookup, setLookup] = useState({ reference: '', phone: '' });
  const [lookupErrors, setLookupErrors] = useState({});
  const [lookupState, setLookupState] = useState({ loading: false, message: null });
  const savedRef = useRef(saved);
  savedRef.current = saved;

  const refresh = useCallback(async () => {
    const list = savedRef.current;
    if (!list.length) return;
    const results = await Promise.all(
      list.map(async (entry) => {
        try {
          return [entry.reference, { order: await api.getOrder(entry.reference, entry.phone), error: null }];
        } catch (error) {
          return [entry.reference, { order: null, error }];
        }
      })
    );
    setRemote((prev) => ({ ...prev, ...Object.fromEntries(results) }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (hydrated) refresh();
    }, [hydrated, refresh])
  );

  const onPull = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const onLookup = async () => {
    const reference = lookup.reference.trim().toUpperCase();
    const errs = {
      reference: /^[A-Z0-9-]{6,32}$/.test(reference) ? null : 'Enter the reference, e.g. 4R-ABCD-EFGH.',
      phone: validatePhone(lookup.phone),
    };
    setLookupErrors(errs);
    if (errs.reference || errs.phone) return;
    setLookupState({ loading: true, message: null });
    try {
      const phone = normalizePhone(lookup.phone);
      const order = await api.getOrder(reference, phone);
      rememberOrder(order.reference, phone, order);
      setRemote((prev) => ({ ...prev, [order.reference]: { order, error: null } }));
      setLookup({ reference: '', phone: '' });
      setLookupState({ loading: false, message: { tone: 'success', text: `Found order ${order.reference}.` } });
    } catch (error) {
      setLookupState({
        loading: false,
        message: { tone: 'error', text: error.status === 404 ? 'No order matches that reference and contact number.' : error.message },
      });
    }
  };

  const onForget = (reference) => {
    const doForget = () => forgetOrder(reference);
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(`Remove ${reference} from this device?`)) doForget();
      return;
    }
    Alert.alert('Remove from this list?', `${reference} will be hidden on this device. The order itself is not cancelled.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doForget },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPull} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <AppText variant="h1" accessibilityRole="header">
            My Orders
          </AppText>
          <AppText variant="small" color={colors.mutedText} style={styles.subtitle}>
            Pre-order requests from this device. Pull down to refresh status.
          </AppText>

          {!hydrated ? (
            <LoadingState compact message="Loading your orders…" />
          ) : saved.length === 0 ? (
            <EmptyState
              compact
              icon="receipt"
              title="No orders yet"
              message="When you submit a pre-order, it will appear here so you can track its status."
              actionTitle="Start an order"
              onAction={() => navigation.navigate('Products')}
            />
          ) : (
            saved.map((entry) => {
              const r = remote[entry.reference];
              const order = r?.order || entry.snapshot;
              const footer = (
                <View style={styles.cardFooter}>
                  <Pressable onPress={() => onForget(entry.reference)} accessibilityRole="button" hitSlop={8} style={styles.forget}>
                    <Ionicons name="eye-off-outline" size={16} color={colors.mutedText} />
                    <AppText variant="caption" color={colors.mutedText}>
                      {'  '}Hide from this device
                    </AppText>
                  </Pressable>
                </View>
              );
              if (!order) {
                return (
                  <Card key={entry.reference} style={styles.cardGap}>
                    <AppText variant="h3">{entry.reference}</AppText>
                    <AppText variant="small" color={r?.error ? colors.danger : colors.mutedText} style={styles.subtitle}>
                      {r?.error ? r.error.message : 'Loading status…'}
                    </AppText>
                    {footer}
                  </Card>
                );
              }
              return (
                <View key={entry.reference} style={styles.cardGap}>
                  <OrderCard order={order} collapsible stale={!!r?.error} footer={footer} />
                </View>
              );
            })
          )}

          <Card tone="frosting" style={styles.lookup}>
            <AppText variant="h3">Track an order</AppText>
            <AppText variant="small" color={colors.mutedText} style={styles.lookupHint}>
              Enter your order reference and the contact number you used when ordering.
            </AppText>
            <TextField
              label="Order reference"
              value={lookup.reference}
              onChangeText={(t) => setLookup((l) => ({ ...l, reference: t }))}
              error={lookupErrors.reference}
              placeholder="4R-ABCD-EFGH"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={32}
            />
            <TextField
              label="Contact number"
              value={lookup.phone}
              onChangeText={(t) => setLookup((l) => ({ ...l, phone: t }))}
              error={lookupErrors.phone}
              placeholder="0917 123 4567"
              keyboardType="phone-pad"
              maxLength={20}
            />
            {lookupState.message ? (
              <View style={[styles.msg, lookupState.message.tone === 'error' ? styles.msgError : styles.msgOk]} accessibilityLiveRegion="polite">
                <AppText variant="small" color={lookupState.message.tone === 'error' ? colors.danger : colors.success}>
                  {lookupState.message.text}
                </AppText>
              </View>
            ) : null}
            <PrimaryButton title="Find order" icon="search" onPress={onLookup} loading={lookupState.loading} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  subtitle: { marginTop: 2, marginBottom: spacing.md },
  cardGap: { marginBottom: spacing.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  forget: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  lookup: { marginTop: spacing.md },
  lookupHint: { marginTop: 2, marginBottom: spacing.md },
  msg: { padding: spacing.sm, borderRadius: radii.md, marginBottom: spacing.sm },
  msgError: { backgroundColor: colors.dangerLight },
  msgOk: { backgroundColor: colors.successLight },
});
