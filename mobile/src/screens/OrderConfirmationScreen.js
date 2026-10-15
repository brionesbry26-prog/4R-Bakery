import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import OrderCard from '../components/OrderCard';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radii, spacing } from '../constants/theme';

export default function OrderConfirmationScreen({ route, navigation }) {
  const order = route.params?.order;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!order) navigation.navigate('MainTabs', { screen: 'Orders' });
  }, [order, navigation]);
  if (!order) return null;

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(order.reference);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={40} color={colors.primary} />
          </View>
          <AppText variant="h1" style={styles.center} accessibilityRole="header">
            Request sent!
          </AppText>
          <AppText variant="body" color={colors.mutedText} style={[styles.center, styles.copy]}>
            Your pre-order request was received by 4R Bakery and is{' '}
            <AppText variant="body" weight="semibold" color={colors.warning}>
              pending confirmation
            </AppText>
            . It is not yet confirmed or paid. Keep your reference number — you can check the status anytime in
            Orders.
          </AppText>
        </View>

        <OrderCard order={order} />

        <View style={styles.actions}>
          <PrimaryButton
            title={copied ? 'Reference copied' : 'Copy reference'}
            icon={copied ? 'checkmark' : 'copy-outline'}
            variant="soft"
            onPress={copy}
          />
          <PrimaryButton
            title="View my orders"
            icon="receipt-outline"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Orders' })}
          />
          <PrimaryButton
            title="Back to home"
            variant="outline"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  icon: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    backgroundColor: colors.frosting,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  center: { textAlign: 'center' },
  copy: { marginTop: spacing.xs, maxWidth: 360 },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
