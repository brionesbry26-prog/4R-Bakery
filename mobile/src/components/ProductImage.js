import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colors } from '../constants/theme';
import { resolveImageUrl } from '../utils/images';

const CATEGORY_ART = {
  Breads: { icon: 'bread-slice', bg: colors.frostingLight, fg: colors.secondary },
  Pastries: { icon: 'food-croissant', bg: colors.primaryLight, fg: colors.primary },
  Cakes: { icon: 'cake-variant', bg: colors.frosting, fg: colors.primary },
};
const DEFAULT_ART = { icon: 'baguette', bg: colors.frostingLight, fg: colors.secondary };

/** Product photo with an illustrated fallback when no image exists or it fails to load. */
function ProductImage({ uri, category, size = 64, style, rounded = 16 }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageUrl(uri);
  const art = CATEGORY_ART[category] || DEFAULT_ART;

  if (resolved && !failed) {
    return (
      <Image
        source={{ uri: resolved }}
        onError={() => setFailed(true)}
        style={[styles.fill, { borderRadius: rounded, backgroundColor: art.bg }, style]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={[styles.fill, styles.center, { backgroundColor: art.bg, borderRadius: rounded }, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.dot, styles.dotA]} />
      <View style={[styles.dot, styles.dotB]} />
      <MaterialCommunityIcons name={art.icon} size={size} color={art.fg} />
    </View>
  );
}

export default memo(ProductImage);

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', borderRadius: 999, backgroundColor: colors.surface, opacity: 0.55 },
  dotA: { width: 34, height: 34, top: '12%', left: '10%' },
  dotB: { width: 18, height: 18, bottom: '14%', right: '14%' },
});
