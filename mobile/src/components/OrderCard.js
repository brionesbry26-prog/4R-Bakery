import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../constants/theme';
import { formatDate, formatDateTime, formatTime } from '../utils/datetime';
import { formatPeso } from '../utils/money';
import AppText from './AppText';
import Card from './Card';
import StatusBadge from './StatusBadge';

/** Displays an order returned by the API (OrderOut schema). */
function OrderCard({ order, collapsible = false, footer, stale }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="caption" color={colors.mutedText}>
            Order reference
          </AppText>
          <AppText variant="h3" selectable accessibilityLabel={`Order reference ${order.reference.split('').join(' ')}`}>
            {order.reference}
          </AppText>
        </View>
        <StatusBadge status={order.status} label={order.status_label} />
      </View>

      <View style={styles.metaRow}>
        <Meta icon="calendar-outline" text={`Pickup ${formatDate(order.pickup_date)}, ${formatTime(order.pickup_time)}`} />
        <Meta icon="paper-plane-outline" text={`Submitted ${formatDateTime(order.created_at)}`} />
      </View>

      {stale ? (
        <AppText variant="caption" color={colors.warning} style={styles.stale}>
          Showing last known status — couldn’t refresh.
        </AppText>
      ) : null}

      {collapsible ? (
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? 'Hide items' : 'Show items'}
          style={styles.toggle}
          hitSlop={6}
        >
          <AppText variant="label" color={colors.primary}>
            {order.items.length} item{order.items.length === 1 ? '' : 's'} · {formatPeso(order.total)}
          </AppText>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </Pressable>
      ) : null}

      {open ? (
        <View style={styles.items}>
          {order.items.map((i) => (
            <View key={i.product_id} style={styles.line}>
              <AppText variant="body" style={styles.flex}>
                {i.quantity} × {i.product_name}
              </AppText>
              <AppText variant="bodyMedium">{formatPeso(i.line_subtotal)}</AppText>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.line}>
            <AppText variant="h3" style={styles.flex}>
              Total
            </AppText>
            <AppText variant="h3" color={colors.primary}>
              {formatPeso(order.total)}
            </AppText>
          </View>
          {order.notes ? (
            <AppText variant="small" color={colors.mutedText} style={styles.notes}>
              Notes: {order.notes}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.message}>
        <AppText variant="small" color={colors.deepText}>
          {order.message}
        </AppText>
      </View>
      {footer}
    </Card>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={colors.secondary} />
      <AppText variant="small" color={colors.mutedText} style={styles.metaText}>
        {text}
      </AppText>
    </View>
  );
}

export default memo(OrderCard);

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  flex: { flex: 1, marginRight: spacing.xs },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  metaRow: { marginTop: spacing.sm, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 6, flex: 1 },
  stale: { marginTop: spacing.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, minHeight: 36 },
  items: { marginTop: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  notes: { marginTop: spacing.xs },
  message: { marginTop: spacing.sm, backgroundColor: colors.frostingLight, padding: spacing.sm, borderRadius: radii.md },
});
