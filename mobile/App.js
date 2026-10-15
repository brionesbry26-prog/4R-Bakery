import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartProvider } from './src/context/CartContext';
import { CatalogProvider } from './src/context/CatalogContext';
import { FontContext } from './src/context/FontContext';
import { OrdersProvider } from './src/context/OrdersContext';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  // Never block the app on fonts: give up after 4s and use system fonts.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const ready = fontsLoaded || !!fontError || timedOut;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Keep the splash screen up until fonts resolve; on failure fall back to system fonts.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <FontContext.Provider value={fontsLoaded && !fontError}>
        <CatalogProvider>
          <CartProvider>
            <OrdersProvider>
              <StatusBar style="dark" />
              <AppNavigator />
            </OrdersProvider>
          </CartProvider>
        </CatalogProvider>
      </FontContext.Provider>
    </SafeAreaProvider>
  );
}
