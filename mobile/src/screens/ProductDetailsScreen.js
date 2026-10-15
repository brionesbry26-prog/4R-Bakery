import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import AvailabilityBadge from '../components/AvailabilityBadge';
import CartIconButton from '../components/CartIconButton';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import ProductImage from '../components/ProductImage';
import QuantitySelector from '../components/QuantitySelector';
import { colors, radii, spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { MAX_QTY_PER_ITEM } from '../context/cartReducer';
import { useCatalog } from '../context/CatalogContext';
import api from '../services/api';
import { formatCents, formatPeso, toCents } from '../utils/money';
import { validateQuantity } from '../utils/validation';

export default function ProductDetailsScreen({ route, navigation }) {
  const productId = route.params?.productId;
  const { getProductById, info } = useCatalog();
  const { addItem, getQuantity } = useCart();
  const [product, setProduct] = useState(() => getProductById(productId));
  const [status, setStatus] = useState(product ? 'success' : 'loading');
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(null);

  const inBag = getQuantity(productId);
  const maxQty = Math.max(1, Math.min(info?.pickup?.max_quantity_per_item ?? MAX_QTY_PER_ITEM, MAX_QTY_PER_ITEM) - inBag);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: product?.name || 'Product',
      headerRight: () => <CartIconButton onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} />,
    });
  }, [navigation, product?.name]);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Always refresh: availability or price may have changed since the list loaded.
      const fresh = await api.getProduct(productId);
      setProduct(fresh);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus((s) => (s === 'success' ? 'success' : 'error'));
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') return <LoadingState message="Loading product…" />;
  if (status === 'error' || !product) {
    return (
      <ErrorState
        error={error}
        title={error?.status === 404 ? 'Product not found' : 'Couldn’t load this product'}
        onRetry={error?.status === 404 ? undefined : load}
      />
    );
  }

  const available = product.is_available;
  const canAdd = available && validateQuantity(quantity, maxQty) && inBag < MAX_QTY_PER_ITEM;

  const onAdd = () => {
    if (!canAdd) return;
    addItem(product, quantity);
    setAdded(quantity);
    setQuantity(1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageWrap}>
          <ProductImage uri={product.image_url} category={product.category} size={120} rounded={radii.xl} />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <AppText variant="caption" color={colors.primary}>
              {product.category}
            </AppText>
          </View>
          <AvailabilityBadge available={available} />
        </View>

        <AppText variant="h1" accessibilityRole="header" style={styles.title}>
          {product.name}
        </AppText>
        <AppText variant="h2" color={colors.primary} style={styles.price}>
          {formatPeso(product.price)}
          <AppText variant="body" color={colors.mutedText}>
            {' '}/ {product.unit}
          </AppText>
        </AppText>

        {error ? (
          <View style={styles.notice}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
            <AppText variant="small" color={colors.warning} style={styles.noticeText}>
              Couldn’t refresh this product. Details may be out of date; prices are re-checked at checkout.
            </AppText>
          </View>
        ) : null}

        <AppText variant="body" color={colors.deepText} style={styles.description}>
          {product.description}
        </AppText>

        {product.stock_quantity != null ? (
          <AppText variant="small" color={colors.mutedText} style={styles.stock}>
            {product.stock_quantity > 0 ? `${product.stock_quantity} left` : 'Out of stock'}
          </AppText>
        ) : null}

        {!available ? (
          <View style={[styles.notice, styles.noticeDanger]}>
            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
            <AppText variant="small" color={colors.danger} style={styles.noticeText}>
              This item is currently unavailable and can’t be added to your bag.
            </AppText>
          </View>
        ) : null}

        {added ? (
          <View style={[styles.notice, styles.noticeSuccess]} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText variant="small" color={colors.success} style={styles.noticeText}>
              Added {added} to your bag ({inBag} total).
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <QuantitySelector
            value={quantity}
            onChange={(q) => setQuantity(Math.max(1, Math.min(maxQty, q)))}
            max={maxQty}
            itemName={product.name}
          />
          <View style={styles.lineTotal}>
            <AppText variant="caption" color={colors.mutedText}>
              Item total
            </AppText>
            <AppText variant="h3" color={colors.primary}>
              {formatCents(toCents(product.price) * quantity)}
            </AppText>
          </View>
        </View>
        <View style={styles.footerRow}>
          <PrimaryButton
            title={available ? 'Add to bag' : 'Unavailable'}
            icon="bag-add-outline"
            onPress={onAdd}
            disabled={!canAdd}
            size="lg"
            style={styles.flex}
          />
          {added ? (
            <PrimaryButton
              title="View bag"
              variant="outline"
              size="lg"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
              style={styles.viewBag}
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  imageWrap: {
    height: 260,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  categoryPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  title: { marginTop: spacing.sm },
  price: { marginTop: spacing.xxs },
  description: { marginTop: spacing.md },
  stock: { marginTop: spacing.xs },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  noticeDanger: { backgroundColor: colors.dangerLight },
  noticeSuccess: { backgroundColor: colors.successLight },
  noticeText: { flex: 1, marginLeft: spacing.xs },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineTotal: { alignItems: 'flex-end' },
  flex: { flex: 1 },
  viewBag: { marginLeft: spacing.xs },
});
