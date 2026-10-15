import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8000;

function trimSlash(url) {
  return url.replace(/\/+$/, '');
}

/**
 * Resolves the backend base URL (including the `/api` prefix).
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_BASE_URL environment variable (recommended; set in mobile/.env)
 *  2. `expo.extra.apiBaseUrl` in app.json
 *  3. Development only: the IP of the machine running the Expo dev server
 *     (works for physical devices on the same Wi-Fi and for emulators), then
 *     10.0.2.2 for the Android emulator / localhost for the iOS simulator.
 *
 * Production builds must set an HTTPS URL via (1) or (2).
 */
export function resolveApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return trimSlash(fromEnv);

  const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl;
  if (fromExtra) return trimSlash(fromExtra);

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.23:8081"
    const host = hostUri ? hostUri.split(':')[0] : null;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${API_PORT}/api`;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:${API_PORT}/api`;
    }
    return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}/api` : `http://localhost:${API_PORT}/api`;
  }
  return null;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_TIMEOUT_MS = 15000;

// Absolute origin (without /api) used to resolve relative image URLs like /static/products/x.jpg
export const API_ORIGIN = API_BASE_URL ? API_BASE_URL.replace(/\/api$/, '') : null;
