import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@expo-google-fonts/montserrat', () => ({
  useFonts: () => [true, null],
  Montserrat_400Regular: 1,
  Montserrat_500Medium: 2,
  Montserrat_600SemiBold: 3,
  Montserrat_700Bold: 4,
}));
jest.mock('../src/constants/config', () => ({
  API_BASE_URL: 'http://api.test/api',
  API_ORIGIN: 'http://api.test',
  API_TIMEOUT_MS: 1000,
}));

import App from '../App';

const products = [
  { id: 1, name: 'Pandesal', description: 'Soft rolls', price: '3.00', unit: 'piece', category: 'Breads', image_url: null, is_available: true, is_featured: true, stock_quantity: null },
  { id: 2, name: 'Special Occasion Cake', description: 'Custom', price: '1200.00', unit: 'cake', category: 'Cakes', image_url: null, is_available: false, is_featured: false, stock_quantity: null },
];
const info = {
  name: '4R Bakery',
  description: 'A neighborhood bakery.',
  address: 'Brgy. Bachawan, San Agustin, Romblon, Philippines',
  operating_hours: null,
  phone: null,
  email: null,
  social_links: { facebook: null, instagram: null },
  map_url: 'https://www.google.com/maps/search/?api=1&query=4R',
  currency: 'PHP',
  inventory_tracking: false,
  pickup: { timezone: 'Asia/Manila', min_lead_minutes: 60, max_advance_days: 60, open_time: null, close_time: null, max_items_per_order: 30, max_quantity_per_item: 500 },
};

const respond = (body) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });

beforeEach(() => {
  global.fetch = jest.fn(async (url) => {
    if (url.includes('/bakery/products')) return respond({ items: products, total: 2, limit: 100, offset: 0, categories: ['Breads', 'Cakes'] });
    if (url.includes('/bakery/info')) return respond(info);
    return { ok: false, status: 404, text: async () => '{"detail":"Not found"}' };
  });
});

test('app renders every tab and shows backend data', async () => {
  await render(<App />);
  expect(await screen.findByText('Featured Favorites', {}, { timeout: 5000 })).toBeTruthy();
  expect(await screen.findAllByText('Pandesal')).not.toHaveLength(0);

  // Add to bag from the featured card updates the tab badge label
  await fireEvent.press(screen.getAllByLabelText('Add Pandesal to bag')[0]);
  await waitFor(() => expect(screen.getAllByLabelText(/Bag, 1 item/).length).toBeGreaterThan(0));

  await fireEvent.press(screen.getByTestId('tab-Products'));
  expect(await screen.findByText('Our Menu')).toBeTruthy();
  expect(screen.getByLabelText('Special Occasion Cake is unavailable')).toBeDisabled();

  await fireEvent.press(screen.getByTestId('tab-Cart'));
  expect(await screen.findByText('Your Bag')).toBeTruthy();
  expect(screen.getAllByText('₱3.00').length).toBeGreaterThan(0);

  await fireEvent.press(screen.getByTestId('tab-Orders'));
  expect(await screen.findByText('No orders yet')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('tab-Store'));
  expect(await screen.findByText('Contact number not yet configured.')).toBeTruthy();
  expect(screen.getByLabelText('Calling unavailable')).toBeDisabled();
}, 30000);
