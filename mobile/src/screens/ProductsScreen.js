import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText, { fontStyle } from '../components/AppText';
import CartIconButton from '../components/CartIconButton';
import CategoryChip from '../components/CategoryChip';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import ProductCard from '../components/ProductCard';
import { colors, radii, spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useFontsReady } from '../context/FontContext';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { ALL_CATEGORIES, filterProducts, SORT_OPTIONS } from '../utils/catalog';

export default function ProductsScreen({ navigation }) {
  const { products, categories, productsStatus, productsError, loadProducts } = useCatalog();
  const { addItem, items } = useCart();
  const fontsReady = useFontsReady();
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [sortOpen, setSortOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const search = useDebouncedValue(query, 200);

  // Filtering is local; the catalog is fetched once and refreshed on pull.
  const visible = useMemo(() => filterProducts(products, { category, search, sortBy }), [products, category, search, sortBy]);
  const counts = useMemo(() => {
    const c = {};
    for (const p of products) c[p.category] = (c[p.category] || 0) + 1;
    return c;
  }, [products]);
  const cartQty = useMemo(() => Object.fromEntries(items.map((i) => [i.productId, i.quantity])), [items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const openProduct = useCallback((p) => navigation.navigate('ProductDetails', { productId: p.id }), [navigation]);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label;

  const renderItem = useCallback(
    ({ item }) => (
      <ProductCard product={item} layout="row" inCartQty={cartQty[item.id] || 0} onPress={openProduct} onAdd={addItem} />
    ),
    [cartQty, openProduct, addItem]
  );

  let body;
  if (productsStatus === 'error' && !products.length) {
    body = <ErrorState error={productsError} title="Couldn’t load the menu" onRetry={loadProducts} />;
  } else if ((productsStatus === 'loading' || productsStatus === 'idle') && !products.length) {
    body = <LoadingState message="Loading the menu…" />;
  } else {
    body = (
      <FlatList
        data={visible}
        keyExtractor={(p) => String(p.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, !visible.length && styles.listEmpty]}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={7}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          productsStatus === 'error' ? (
            <View style={styles.staleBanner} accessibilityRole="alert">
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <AppText variant="small" color={colors.warning} style={styles.flex}>
                {'  '}Couldn’t refresh. Showing the last menu loaded from the server.
              </AppText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="magnify"
            title="No matches"
            message={search ? `Nothing on the menu matches “${search}”.` : 'No products in this category yet.'}
            actionTitle="Clear filters"
            onAction={() => {
              setQuery('');
              setCategory(ALL_CATEGORIES);
            }}
          />
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="h1" accessibilityRole="header">
            Our Menu
          </AppText>
          <AppText variant="small" color={colors.mutedText}>
            Prices in Philippine pesos
          </AppText>
        </View>
        <CartIconButton onPress={() => navigation.navigate('Cart')} />
      </View>

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.mutedText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search pandesal, cakes…"
            placeholderTextColor={colors.disabledText}
            accessibilityLabel="Search products"
            returnKeyType="search"
            autoCorrect={false}
            maxLength={80}
            style={[styles.searchInput, fontStyle('regular', fontsReady)]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={colors.mutedText} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${sortLabel}`}
          style={({ pressed }) => [styles.sortBtn, pressed && styles.pressed]}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <CategoryChip label={ALL_CATEGORIES} selected={category === ALL_CATEGORIES} onPress={() => setCategory(ALL_CATEGORIES)} count={products.length || null} />
          {categories.map((c) => (
            <CategoryChip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} count={counts[c] ?? 0} />
          ))}
        </ScrollView>
      </View>
      <AppText variant="caption" color={colors.mutedText} style={styles.resultLine}>
        {visible.length} item{visible.length === 1 ? '' : 's'} · {sortLabel}
      </AppText>

      {body}

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)} accessibilityLabel="Close sort options">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <AppText variant="h3" style={styles.sheetTitle}>
              Sort by
            </AppText>
            {SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => {
                  setSortBy(o.value);
                  setSortOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: sortBy === o.value }}
                style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
              >
                <AppText variant="bodyMedium" color={sortBy === o.value ? colors.primary : colors.deepText} style={styles.flex}>
                  {o.label}
                </AppText>
                {sortBy === o.value ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const Separator = () => <View style={{ height: spacing.sm }} />;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  controls: { flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: spacing.md },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.deepText, paddingVertical: spacing.sm, marginLeft: spacing.xs },
  sortBtn: {
    width: 48,
    height: 48,
    marginLeft: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.frostingLight },
  chips: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  resultLine: { paddingHorizontal: spacing.md, marginBottom: spacing.xs },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  listEmpty: { flexGrow: 1 },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { marginBottom: spacing.xs },
  sheetRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: radii.md, paddingHorizontal: spacing.xs },
});
