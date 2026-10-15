import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage failures must never crash the app; they only lose convenience data.
export async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  cart: '4r.cart.v1',
  orders: '4r.orders.v1',
};
