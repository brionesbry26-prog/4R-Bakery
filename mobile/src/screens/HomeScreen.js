import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useMemo, useRef } from 'react';
import { Animated, FlatList, Linking, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import Bakery3DCanvas from '../components/Bakery3DCanvas';
import Card from '../components/Card';
import CartIconButton from '../components/CartIconButton';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import ProductCard from '../components/ProductCard';
import SectionHeader from '../components/SectionHeader';
import { colors, radii, spacing } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import useReducedMotion from '../hooks/useReducedMotion';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const HERO_HEIGHT = 520;

export default function HomeScreen({ navigation }) {
  const { products, productsStatus, productsError, loadProducts, info } = useCatalog();
  const { addItem, items } = useCart();
  const isFocused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const featured = useMemo(() => products.filter((p) => p.is_featured), [products]);
  const popular = useMemo(
    () => products.filter((p) => p.is_available && !p.is_featured).slice(0, 4),
    [products]
  );
  const cartQty = useMemo(() => Object.fromEntries(items.map((i) => [i.productId, i.quantity])), [items]);

  const openProduct = useCallback((p) => navigation.navigate('ProductDetails', { productId: p.id }), [navigation]);
  const goToMenu = useCallback(() => navigation.navigate('Products'), [navigation]);
  const goToCart = useCallback(() => navigation.navigate('Cart'), [navigation]);
  const preorder = useCallback(
    () => (items.length ? navigation.navigate('Cart') : navigation.navigate('Products')),
    [items.length, navigation]
  );

  // Parallax: layers translate at different rates relative to scroll.
  const parallax = (rate) =>
    reducedMotion
      ? undefined
      : [
          {
            translateY: scrollY.interpolate({
              inputRange: [-200, 0, HERO_HEIGHT],
              outputRange: [-200 * rate, 0, HERO_HEIGHT * rate],
              extrapolateRight: 'clamp',
            }),
          },
        ];

  const cardWidth = Math.min(200, Math.max(160, width * 0.46));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo} accessible accessibilityLabel="4R Bakery logo">
          <MaterialCommunityIcons name="food-croissant" size={26} color={colors.surface} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="h2" accessibilityRole="header">
            4R Bakery
          </AppText>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.secondary} />
            <AppText variant="caption" color={colors.mutedText} numberOfLines={1}>
              {' '}Bachawan, San Agustin, Romblon
            </AppText>
          </View>
        </View>
        <CartIconButton onPress={goToCart} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: USE_NATIVE_DRIVER,
        })}
      >
        {/* Hero with parallax layers */}
        <View style={styles.hero}>
          <Animated.View style={[styles.heroBg, { transform: parallax(0.45) }]} pointerEvents="none">
            <View style={[styles.blob, styles.blobA]} />
            <View style={[styles.blob, styles.blobB]} />
            <View style={[styles.blob, styles.blobC]} />
          </Animated.View>
          <Animated.View style={[styles.heroDecor, { transform: parallax(0.25) }]} pointerEvents="none">
            <MaterialCommunityIcons name="barley" size={40} color={colors.accent} style={styles.decorA} />
            <MaterialCommunityIcons name="star-four-points" size={18} color={colors.secondary} style={styles.decorB} />
            <MaterialCommunityIcons name="star-four-points" size={12} color={colors.primary} style={styles.decorC} />
          </Animated.View>
          <Animated.View style={{ transform: parallax(0.12) }}>
            <View style={styles.tag}>
              <MaterialCommunityIcons name="heart" size={12} color={colors.primary} />
              <AppText variant="caption" color={colors.primary}>
                {'  '}Your neighborhood bakery
              </AppText>
            </View>
            <AppText variant="display" style={styles.heroTitle}>
              Freshly Baked,{'\n'}Made with Love.
            </AppText>
            <AppText variant="body" color={colors.mutedText} style={styles.heroCopy}>
              Warm pandesal, soft ensaymada and celebration cakes from Bachawan. Pre-order your favorites and
              pick them up fresh.
            </AppText>
            <Bakery3DCanvas height={200} active={isFocused} />
            <View style={styles.heroActions}>
              <PrimaryButton title="Explore Our Menu" icon="restaurant-outline" size="lg" onPress={goToMenu} />
              <PrimaryButton title="Pre-order Now" icon="time-outline" variant="outline" onPress={preorder} />
            </View>
          </Animated.View>
        </View>

        {/* Featured products */}
        <View style={styles.section}>
          <SectionHeader title="Featured Favorites" subtitle="Freshly baked picks" actionLabel="See all" onAction={goToMenu} />
          {productsStatus === 'loading' && !products.length ? (
            <LoadingState compact message="Loading the menu…" />
          ) : productsStatus === 'error' && !products.length ? (
            <ErrorState compact error={productsError} title="Couldn’t load the menu" onRetry={loadProducts} />
          ) : featured.length === 0 ? (
            <AppText variant="body" color={colors.mutedText}>
              No featured products right now.
            </AppText>
          ) : (
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(p) => String(p.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  width={cardWidth}
                  inCartQty={cartQty[item.id] || 0}
                  onPress={openProduct}
                  onAdd={addItem}
                />
              )}
            />
          )}
        </View>

        {/* Popular */}
        {popular.length ? (
          <View style={styles.section}>
            <SectionHeader title="Popular Today" subtitle="Everyday merienda staples" />
            {popular.map((p) => (
              <View key={p.id} style={styles.rowGap}>
                <ProductCard product={p} layout="row" inCartQty={cartQty[p.id] || 0} onPress={openProduct} onAdd={addItem} />
              </View>
            ))}
          </View>
        ) : null}

        {/* About */}
        <View style={styles.section}>
          <Card tone="frosting">
            <View style={styles.aboutRow}>
              <View style={styles.aboutIcon}>
                <MaterialCommunityIcons name="bread-slice-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <AppText variant="h3">About 4R Bakery</AppText>
                <AppText variant="body" color={colors.mutedText} style={styles.mt4}>
                  {info?.description ||
                    'A neighborhood bakery in Bachawan serving freshly baked bread, pastries, and cakes.'}
                </AppText>
              </View>
            </View>
          </Card>
        </View>

        {/* Visit us */}
        <View style={styles.section}>
          <SectionHeader title="Visit Us" />
          <Card>
            <InfoLine icon="location-outline" text={info?.address || 'Brgy. Bachawan, San Agustin, Romblon, Philippines'} />
            <InfoLine icon="time-outline" text={info?.operating_hours || 'Operating hours to be announced'} muted={!info?.operating_hours} />
            <InfoLine icon="call-outline" text={info?.phone || 'Contact number not yet available'} muted={!info?.phone} />
            <View style={styles.visitActions}>
              <PrimaryButton
                title="Directions"
                icon="map-outline"
                variant="soft"
                size="sm"
                disabled={!info?.map_url}
                onPress={() => info?.map_url && Linking.openURL(info.map_url).catch(() => {})}
                style={styles.flex}
              />
              <PrimaryButton
                title="Store info"
                variant="outline"
                size="sm"
                iconRight="chevron-forward"
                onPress={() => navigation.navigate('Store')}
                style={[styles.flex, styles.ml8]}
              />
            </View>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="food-croissant" size={22} color={colors.accent} />
          <AppText variant="label" color={colors.primary} style={styles.mt4}>
            4R Bakery
          </AppText>
          <AppText variant="caption" color={colors.mutedText} style={styles.footerText}>
            Pre-orders are requests and stay pending until the bakery confirms them. No payment is collected in the app.
          </AppText>
          <View style={styles.footerLinks}>
            {[
              ['Menu', 'Products'],
              ['My Orders', 'Orders'],
              ['Contact', 'Store'],
            ].map(([label, route]) => (
              <Pressable key={route} onPress={() => navigation.navigate(route)} accessibilityRole="link" hitSlop={8} style={styles.footerLink}>
                <AppText variant="label" color={colors.primary}>
                  {label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function InfoLine({ icon, text, muted }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={18} color={colors.secondary} />
      <AppText variant="body" color={muted ? colors.mutedText : colors.deepText} style={styles.infoText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    zIndex: 2,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { paddingBottom: spacing.xxl },
  hero: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.frostingLight,
    borderWidth: 1.5,
    borderColor: colors.frosting,
    overflow: 'hidden',
  },
  heroBg: { ...StyleSheet.absoluteFillObject },
  blob: { position: 'absolute', borderRadius: 999 },
  blobA: { width: 220, height: 220, backgroundColor: colors.frosting, top: -80, right: -70, opacity: 0.7 },
  blobB: { width: 140, height: 140, backgroundColor: colors.surface, bottom: 40, left: -60, opacity: 0.7 },
  blobC: { width: 70, height: 70, backgroundColor: colors.accent, top: 150, right: 24, opacity: 0.25 },
  heroDecor: { ...StyleSheet.absoluteFillObject },
  decorA: { position: 'absolute', top: 18, right: 22, transform: [{ rotate: '20deg' }] },
  decorB: { position: 'absolute', top: 96, right: 70 },
  decorC: { position: 'absolute', top: 60, right: 120 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.frosting,
  },
  heroTitle: { marginTop: spacing.sm, color: colors.deepText },
  heroCopy: { marginTop: spacing.xs, maxWidth: 340 },
  heroActions: { marginTop: spacing.xs, gap: spacing.sm },
  flex: { flex: 1 },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.md },
  carousel: { paddingVertical: spacing.xxs, paddingRight: spacing.md },
  rowGap: { marginBottom: spacing.sm },
  aboutRow: { flexDirection: 'row' },
  aboutIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  mt4: { marginTop: spacing.xxs },
  ml8: { marginLeft: spacing.xs },
  infoLine: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  infoText: { marginLeft: spacing.sm, flex: 1 },
  visitActions: { flexDirection: 'row', marginTop: spacing.xxs },
  footer: { alignItems: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
  footerText: { textAlign: 'center', marginTop: spacing.xxs },
  footerLinks: { flexDirection: 'row', marginTop: spacing.sm },
  footerLink: { paddingHorizontal: spacing.sm, minHeight: 44, justifyContent: 'center' },
});
