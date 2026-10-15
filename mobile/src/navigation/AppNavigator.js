import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors, fallbackWeights, fontFamilies } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useFontsReady } from '../context/FontContext';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import HomeScreen from '../screens/HomeScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import ProductsScreen from '../screens/ProductsScreen';
import StoreInfoScreen from '../screens/StoreInfoScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Products: ['grid', 'grid-outline'],
  Cart: ['bag-handle', 'bag-handle-outline'],
  Orders: ['receipt', 'receipt-outline'],
  Store: ['storefront', 'storefront-outline'],
};

const TAB_LABELS = { Home: 'Home', Products: 'Menu', Cart: 'Bag', Orders: 'Orders', Store: 'Store' };

function useFont(weight) {
  const ready = useFontsReady();
  return ready ? { fontFamily: fontFamilies[weight] } : { fontWeight: fallbackWeights[weight] };
}

function MainTabs() {
  const { count } = useCart();
  const labelFont = useFont('medium');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarLabelStyle: { ...labelFont, fontSize: 11, lineHeight: 15 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarLabel: TAB_LABELS[route.name],
        tabBarAccessibilityLabel:
          route.name === 'Cart' && count ? `Bag, ${count} item${count === 1 ? '' : 's'}` : TAB_LABELS[route.name],
        tabBarButtonTestID: `tab-${route.name}`,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.secondary, color: colors.surface, fontSize: 10 },
        }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Store" component={StoreInfoScreen} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.deepText,
    border: colors.border,
    notification: colors.secondary,
  },
};

export default function AppNavigator() {
  const titleFont = useFont('semibold');
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { ...titleFont, color: colors.deepText, fontSize: 17 },
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Product' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Pre-order' }} />
        <Stack.Screen
          name="OrderConfirmation"
          component={OrderConfirmationScreen}
          options={{ title: 'Request sent', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
