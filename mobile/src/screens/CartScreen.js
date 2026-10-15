import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import ProductImage from '../components/ProductImage';
import QuantitySelector from '../components/QuantitySelector';
import { colors, radii, shadow, spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { MAX_QTY_PER_ITEM } from '../context/cartReducer';
import { formatCents, formatPeso, toCents } from '../utils/money';

function confirm(title, message, onConfirm, confirmLabel = 'Remove') {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function CartScreen({ navigation }) {
  const { items, count, subtotalCents, setQuantity, removeItem, clearCart, hydrated } = useCart();
  const blocked = useMemo(() => items.filter((i) => !i.isAvailable), [items]);

  const onClear = useCallback(
    () => confirm('Clear your bag?', 'This removes all items from your bag.', clearCart, 'Clear bag'),
    [clearCart]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={[styles.item, !item.isAvailable && styles.itemBlocked]}>
        <Pressable
          onPress={() => navigation.navigate('ProductDetails', { productId: item.productId })}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} details`}
          style={styles.thumb}
        >
          <ProductImage uri={item.imageUrl} category={item.category} size={32} rounded={radii.md} />
        </Pressable>
        <View style={styles.itemBody}>
          <View style={styles.itemTop}>
            <AppText variant="h3" numberOfLines={1} style={styles.flex}>
              {item.name}
            </AppText>
            <Pressable
              onPress={() => removeItem(item.productId)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name}`}
              hitSlop={10}
              style={styles.removeBtn}
            >
              <Ionicons name="close" size={20} color={colors.mutedText} />
            </Pressable>
          </View>
          <AppText variant="small" color={colors.mutedText}>
            {formatPeso(item.price)} / {item.unit}
          </AppText>
          {!item.isAvailable ? (
            <AppText variant="small" color={colors.danger} style={styles.blockedText}>
              {item.missing ? 'No longer on the menu — please remove.' : 'Currently unavailable — please remove.'}
            </AppText>
          ) : null}
          <View style={styles.itemBottom}>
            <QuantitySelector
              compact
              allowRemove
              value={item.quantity}
              max={MAX_QTY_PER_ITEM}
              itemName={item.name}
              onChange={(q) => setQuantity(item.productId, q)}
            />
            <AppText variant="price" color={colors.primary}>
              {formatCents(toCents(item.price) * item.quantity)}
            </AppText>
          </View>
        </View>
      </View>
    ),
    [navigation, removeItem, setQuantity]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="h1" accessibilityRole="header">
            Your Bag
          </AppText>
          <AppText variant="small" color={colors.mutedText}>
            {count} item{count === 1 ? '' : 's'}
          </AppText>
        </View>
        {items.length ? (
          <PrimaryButton title="Clear" variant="danger" size="sm" icon="trash-outline" onPress={onClear} />
        ) : null}
      </View>

      {hydrated && !items.length ? (
        <EmptyState
          icon="basket-outline"
          title="Your bag is empty"
          message="Browse the menu and add your favorite breads, pastries and cakes."
          actionTitle="Browse the menu"
          onAction={() => navigation.navigate('Products')}
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => String(i.productId)}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            ListFooterComponent={
              <PrimaryButton
                title="Continue shopping"
                variant="soft"
                icon="add"
                onPress={() => navigation.navigate('Products')}
                style={styles.continue}
              />
            }
          />
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <AppText variant="body" color={colors.mutedText}>
                Estimated subtotal
              </AppText>
              <AppText variant="h2" color={colors.deepText}>
                {formatCents(subtotalCents)}
              </AppText>
            </View>
            <AppText variant="caption" color={colors.mutedText} style={styles.note}>
              Final total is confirmed by the bakery’s server at checkout. Pickup only — no delivery fee.
            </AppText>
            {blocked.length ? (
              <AppText variant="small" color={colors.danger} style={styles.note} accessibilityRole="alert">
                Remove unavailable items to continue.
              </AppText>
            ) : null}
            <PrimaryButton
              title="Proceed to pre-order"
              iconRight="arrow-forward"
              size="lg"
              disabled={!items.length || blocked.length > 0}
              onPress={() => navigation.navigate('Checkout')}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  list: { padding: spacing.md, paddingTop: spacing.xs },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadow.card,
  },
  itemBlocked: { borderColor: colors.danger, backgroundColor: '#FFFAFA' },
  thumb: { width: 72, height: 72, marginRight: spacing.sm },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: 'row', alignItems: 'center' },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  blockedText: { marginTop: 2 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  continue: { marginTop: spacing.md },
  summary: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  note: { marginTop: spacing.xxs, marginBottom: spacing.sm },
});
