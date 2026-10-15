import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, shadow, spacing } from '../constants/theme';
import { formatPeso } from '../utils/money';
import AppText from './AppText';
import AvailabilityBadge from './AvailabilityBadge';
import ProductImage from './ProductImage';

/**
 * layout="grid"   – vertical card (carousels, two-column grids)
 * layout="row"    – horizontal list row (catalog)
 */
function ProductCard({ product, onPress, onAdd, inCartQty = 0, layout = 'grid', width }) {
  const available = product.is_available;
  const addLabel = available ? `Add ${product.name} to bag` : `${product.name} is unavailable`;

  const addButton = (
    <Pressable
      onPress={() => onAdd?.(product)}
      disabled={!available}
      accessibilityRole="button"
      accessibilityLabel={addLabel}
      accessibilityState={{ disabled: !available }}
      hitSlop={8}
      style={({ pressed }) => [styles.addBtn, !available && styles.addBtnDisabled, pressed && styles.addBtnPressed]}
    >
      <Ionicons name={inCartQty > 0 ? 'checkmark' : 'add'} size={22} color={available ? colors.surface : colors.disabledText} />
      {inCartQty > 0 ? (
        <View style={styles.qtyBubble}>
          <AppText variant="caption" color={colors.primary} style={styles.qtyText}>
            {inCartQty}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );

  if (layout === 'row') {
    return (
      <Pressable
        onPress={() => onPress?.(product)}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatPeso(product.price)} per ${product.unit}${available ? '' : ', unavailable'}`}
        accessibilityHint="Opens product details"
        style={({ pressed }) => [styles.card, styles.rowCard, pressed && styles.pressed]}
      >
        <View style={styles.rowImage}>
          <ProductImage uri={product.image_url} category={product.category} size={40} rounded={radii.md} />
        </View>
        <View style={styles.rowBody}>
          <AppText variant="h3" numberOfLines={1}>
            {product.name}
          </AppText>
          <AppText variant="small" color={colors.mutedText} numberOfLines={2} style={styles.desc}>
            {product.description}
          </AppText>
          <View style={styles.rowFooter}>
            <AppText variant="price" color={available ? colors.primary : colors.disabledText}>
              {formatPeso(product.price)}
              <AppText variant="small" color={colors.mutedText}> / {product.unit}</AppText>
            </AppText>
          </View>
          {!available ? <AvailabilityBadge available={false} style={styles.badgeRow} /> : null}
        </View>
        <View style={styles.rowAction}>{addButton}</View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress?.(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatPeso(product.price)}${available ? '' : ', unavailable'}`}
      accessibilityHint="Opens product details"
      style={({ pressed }) => [styles.card, styles.gridCard, width ? { width } : null, pressed && styles.pressed]}
    >
      <View style={styles.gridImage}>
        <ProductImage uri={product.image_url} category={product.category} size={56} rounded={radii.md} />
        <AvailabilityBadge available={available} style={styles.badgeOverlay} />
      </View>
      <AppText variant="h3" numberOfLines={1} style={styles.gridName}>
        {product.name}
      </AppText>
      <AppText variant="small" color={colors.mutedText} numberOfLines={2} style={styles.gridDesc}>
        {product.description}
      </AppText>
      <View style={styles.gridFooter}>
        <View style={styles.flex}>
          <AppText variant="price" color={available ? colors.primary : colors.disabledText}>
            {formatPeso(product.price)}
          </AppText>
          <AppText variant="caption" color={colors.mutedText} numberOfLines={1}>
            per {product.unit}
          </AppText>
        </View>
        {addButton}
      </View>
    </Pressable>
  );
}

export default memo(ProductCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.card,
  },
  pressed: { borderColor: colors.accent, backgroundColor: '#FFFBFD' },
  flex: { flex: 1, marginRight: spacing.xs },
  // grid
  gridCard: { padding: spacing.sm },
  gridImage: { height: 120, marginBottom: spacing.sm },
  badgeOverlay: { position: 'absolute', top: spacing.xs, left: spacing.xs },
  gridName: { marginBottom: 2 },
  gridDesc: { minHeight: 36, marginBottom: spacing.sm },
  gridFooter: { flexDirection: 'row', alignItems: 'center' },
  // row
  rowCard: { flexDirection: 'row', padding: spacing.sm, alignItems: 'center' },
  rowImage: { width: 84, height: 84, marginRight: spacing.sm },
  rowBody: { flex: 1 },
  desc: { marginTop: 2 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xxs },
  badgeRow: { marginTop: spacing.xxs },
  rowAction: { marginLeft: spacing.xs },
  // add
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: { backgroundColor: colors.secondary },
  addBtnDisabled: { backgroundColor: colors.disabled },
  qtyBubble: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.frosting,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  qtyText: { fontSize: 11, lineHeight: 14 },
});
