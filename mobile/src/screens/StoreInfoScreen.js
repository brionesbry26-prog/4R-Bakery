import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '../components/AppText';
import Card from '../components/Card';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radii, spacing } from '../constants/theme';
import { useCatalog } from '../context/CatalogContext';

const FALLBACK_ADDRESS = 'Brgy. Bachawan, San Agustin, Romblon, Philippines';

export default function StoreInfoScreen() {
  const { info, infoStatus, infoError, loadInfo } = useCatalog();
  const [feedback, setFeedback] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const show = (tone, text) => {
    setFeedback({ tone, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  const open = async (url, failMessage) => {
    try {
      await Linking.openURL(url);
    } catch {
      show('error', failMessage);
    }
  };

  const address = info?.address || FALLBACK_ADDRESS;
  const mapUrl =
    info?.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`4R Bakery, ${FALLBACK_ADDRESS}`)}`;

  const copyAddress = async () => {
    try {
      await Clipboard.setStringAsync(address);
      show('success', 'Address copied to clipboard.');
    } catch {
      show('error', 'Couldn’t copy the address.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInfo();
    setRefreshing(false);
  };

  if (!info && infoStatus === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState error={infoError} title="Couldn’t load store details" onRetry={loadInfo} />
      </SafeAreaView>
    );
  }
  if (!info) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoadingState message="Loading store details…" />
      </SafeAreaView>
    );
  }

  const phone = info.phone;
  const socials = [
    ['logo-facebook', 'Facebook', info.social_links?.facebook],
    ['logo-instagram', 'Instagram', info.social_links?.instagram],
  ].filter(([, , url]) => !!url);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="storefront-outline" size={36} color={colors.surface} />
          </View>
          <AppText variant="h1" accessibilityRole="header" style={styles.center}>
            {info.name}
          </AppText>
          <AppText variant="body" color={colors.mutedText} style={[styles.center, styles.desc]}>
            {info.description}
          </AppText>
        </View>

        {feedback ? (
          <View style={[styles.feedback, feedback.tone === 'error' ? styles.fbError : styles.fbOk]} accessibilityLiveRegion="polite">
            <AppText variant="small" color={feedback.tone === 'error' ? colors.danger : colors.success}>
              {feedback.text}
            </AppText>
          </View>
        ) : null}

        <Card style={styles.card}>
          <Row icon="location-outline" title="Address" value={address} />
          <View style={styles.actions}>
            <PrimaryButton title="Open in Maps" icon="map-outline" size="sm" onPress={() => open(mapUrl, 'Couldn’t open Maps.')} style={styles.flex} />
            <PrimaryButton title="Copy" icon="copy-outline" size="sm" variant="outline" onPress={copyAddress} style={styles.ml} />
          </View>
        </Card>

        <Card style={styles.card}>
          <Row
            icon="time-outline"
            title="Operating hours"
            value={info.operating_hours || 'Not yet configured. Please contact the bakery to confirm opening hours.'}
            muted={!info.operating_hours}
          />
        </Card>

        <Card style={styles.card}>
          <Row
            icon="call-outline"
            title="Phone"
            value={phone || 'Contact number not yet configured.'}
            muted={!phone}
          />
          <PrimaryButton
            title={phone ? 'Call the bakery' : 'Calling unavailable'}
            icon="call"
            size="sm"
            disabled={!phone}
            onPress={() => open(`tel:${phone.replace(/[^\d+]/g, '')}`, 'This device can’t make phone calls.')}
            style={styles.single}
            accessibilityHint={phone ? `Calls ${phone}` : 'The bakery has not configured a phone number yet'}
          />
          {info.email ? (
            <>
              <View style={styles.divider} />
              <Row icon="mail-outline" title="Email" value={info.email} />
              <PrimaryButton
                title="Send an email"
                icon="mail"
                size="sm"
                variant="outline"
                onPress={() => open(`mailto:${info.email}`, 'No email app is available.')}
                style={styles.single}
              />
            </>
          ) : null}
        </Card>

        {socials.length ? (
          <Card style={styles.card}>
            <AppText variant="h3">Follow us</AppText>
            <View style={styles.actions}>
              {socials.map(([icon, label, url]) => (
                <PrimaryButton
                  key={label}
                  title={label}
                  icon={icon}
                  size="sm"
                  variant="soft"
                  onPress={() => open(url, `Couldn’t open ${label}.`)}
                  style={styles.socialBtn}
                />
              ))}
            </View>
          </Card>
        ) : null}

        <Card tone="frosting" style={styles.card}>
          <View style={styles.rowTop}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <AppText variant="small" color={colors.deepText} style={styles.infoText}>
              Pre-orders submitted in the app are requests. The bakery reviews each one and updates its status in
              My Orders. No payment is collected in the app.
            </AppText>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, title, value, muted }) {
  return (
    <View style={styles.rowTop}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="caption" color={colors.mutedText}>
          {title}
        </AppText>
        <AppText variant="body" color={muted ? colors.mutedText : colors.deepText} selectable>
          {value}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  center: { textAlign: 'center' },
  desc: { marginTop: spacing.xs, maxWidth: 360 },
  feedback: { padding: spacing.sm, borderRadius: radii.md, marginBottom: spacing.sm },
  fbError: { backgroundColor: colors.dangerLight },
  fbOk: { backgroundColor: colors.successLight },
  card: { marginBottom: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.frostingLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  flex: { flex: 1 },
  ml: { marginLeft: spacing.xs },
  actions: { flexDirection: 'row', marginTop: spacing.md, flexWrap: 'wrap', gap: spacing.xs },
  single: { marginTop: spacing.md, alignSelf: 'flex-start' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  socialBtn: { flexGrow: 1 },
  infoText: { flex: 1, marginLeft: spacing.xs },
});
