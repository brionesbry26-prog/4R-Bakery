import { cartReducer, cartTotals, diffCartAgainstCatalog, initialCartState } from '../src/context/cartReducer';
import { ALL_CATEGORIES, filterProducts } from '../src/utils/catalog';
import { formatCents, formatPeso, toCents } from '../src/utils/money';
import { normalizePhone, validateEmail, validateName, validatePhone, validatePickup } from '../src/utils/validation';

const products = [
  { id: 1, name: 'Pandesal', description: 'Soft rolls', price: '3.00', unit: 'piece', category: 'Breads', is_available: true, is_featured: true },
  { id: 2, name: 'Ensaymada', description: 'Buttery pastry', price: '25.00', unit: 'piece', category: 'Pastries', is_available: true, is_featured: true },
  { id: 3, name: 'Special Cake', description: 'Custom', price: '1200.00', unit: 'cake', category: 'Cakes', is_available: false, is_featured: false },
  { id: 4, name: 'Cheese Bread', description: 'Sweet cheese', price: '10.00', unit: 'piece', category: 'Breads', is_available: true, is_featured: false },
];

describe('money', () => {
  test('parses API strings into centavos without float drift', () => {
    expect(toCents('0.10') * 3).toBe(30);
    expect(toCents('1,200.50')).toBe(120050);
    expect(toCents(null)).toBe(0);
  });
  test('formats pesos', () => {
    expect(formatCents(123456)).toBe('₱1,234.56');
    expect(formatPeso('3')).toBe('₱3.00');
    expect(formatCents(0)).toBe('₱0.00');
  });
});

describe('validation', () => {
  test('phone numbers', () => {
    expect(normalizePhone('0917 123 4567')).toBe('+639171234567');
    expect(normalizePhone('+63-917-123-4567')).toBe('+639171234567');
    expect(normalizePhone('12345')).toBeNull();
    expect(validatePhone('')).toMatch(/required/);
    expect(validatePhone('0817 123 4567')).toMatch(/valid/);
  });
  test('name and email', () => {
    expect(validateName(' ')).toBeTruthy();
    expect(validateName('12345')).toMatch(/letters/);
    expect(validateName('Juan Dela Cruz')).toBeNull();
    expect(validateEmail('')).toBeNull();
    expect(validateEmail('bad@')).toBeTruthy();
    expect(validateEmail('juan@example.com')).toBeNull();
  });
  test('pickup must be future, respect lead time, window and max days', () => {
    const now = new Date('2026-12-01T09:00:00+08:00');
    const rules = { min_lead_minutes: 60, max_advance_days: 30, open_time: '06:00', close_time: '18:00' };
    expect(validatePickup({ date: '2026-11-30', time: '10:00' }, rules, now).time).toMatch(/future/);
    expect(validatePickup({ date: '2026-12-01', time: '09:30' }, rules, now).time).toMatch(/at least 60/);
    expect(validatePickup({ date: '2026-12-01', time: '19:00' }, rules, now).time).toMatch(/between/);
    expect(validatePickup({ date: '2027-03-01', time: '10:00' }, rules, now).date).toMatch(/30 days/);
    expect(validatePickup({ date: '2026-12-02', time: '10:00' }, rules, now)).toEqual({});
    expect(validatePickup({ date: '', time: '' }, rules, now)).toEqual({ date: expect.any(String), time: expect.any(String) });
  });
});

describe('catalog filtering', () => {
  test('search, category and sort run locally', () => {
    expect(filterProducts(products, { search: 'pandesal' }).map((p) => p.id)).toEqual([1]);
    expect(filterProducts(products, { search: 'CHEESE' }).map((p) => p.id)).toEqual([4]);
    expect(filterProducts(products, { category: 'Breads', sortBy: 'name' }).map((p) => p.name)).toEqual(['Cheese Bread', 'Pandesal']);
    expect(filterProducts(products, { sortBy: '-price' })[0].id).toBe(3);
    expect(filterProducts(products, { sortBy: 'price' })[0].id).toBe(1);
    expect(filterProducts(products, { category: ALL_CATEGORIES })).toHaveLength(4);
  });
});

describe('cart reducer', () => {
  const add = (state, product, quantity) => cartReducer(state, { type: 'ADD', product, quantity });

  test('adds, merges, updates and totals', () => {
    let s = { ...initialCartState, hydrated: true };
    s = add(s, products[0], 10);
    s = add(s, products[0], 2);
    s = add(s, products[1], 3);
    expect(s.items).toHaveLength(2);
    expect(s.items[0].quantity).toBe(12);
    expect(cartTotals(s.items)).toEqual({ count: 15, subtotalCents: 12 * 300 + 3 * 2500 });
    s = cartReducer(s, { type: 'SET_QUANTITY', productId: 1, quantity: 4 });
    expect(s.items[0].quantity).toBe(4);
    s = cartReducer(s, { type: 'SET_QUANTITY', productId: 1, quantity: 0 });
    expect(s.items.map((i) => i.productId)).toEqual([2]);
    s = cartReducer(s, { type: 'REMOVE', productId: 2 });
    expect(s.items).toEqual([]);
  });

  test('refuses unavailable products and clamps quantities', () => {
    let s = add(initialCartState, products[2], 1);
    expect(s.items).toHaveLength(0);
    s = add(s, products[0], 9999);
    expect(s.items[0].quantity).toBe(500);
    s = cartReducer(s, { type: 'SET_QUANTITY', productId: 1, quantity: 2.7 });
    expect(s.items[0].quantity).toBe(2);
  });

  test('hydrate keeps items added before storage finished loading', () => {
    let s = add(initialCartState, products[0], 1);
    s = cartReducer(s, { type: 'HYDRATE', items: [{ productId: 2, name: 'Ensaymada', price: '25.00', quantity: 2 }, { bogus: true }] });
    expect(s.hydrated).toBe(true);
    expect(s.items.map((i) => i.productId).sort()).toEqual([1, 2]);
  });

  test('sync with catalog detects price changes and unavailable/missing items', () => {
    let s = add(initialCartState, products[0], 2);
    s = add(s, products[1], 1);
    s = add(s, products[3], 1);
    const fresh = [
      { ...products[0], price: '4.00' },
      { ...products[1], is_available: false },
    ];
    const changes = diffCartAgainstCatalog(s.items, fresh);
    expect(changes.map((c) => c.kind)).toEqual(['price', 'unavailable', 'missing']);
    s = cartReducer(s, { type: 'SYNC_PRODUCTS', products: fresh });
    expect(s.items[0].price).toBe('4.00');
    expect(s.items[1].isAvailable).toBe(false);
    expect(s.items[2]).toMatchObject({ isAvailable: false, missing: true });
    expect(diffCartAgainstCatalog(s.items.slice(0, 1), fresh)).toEqual([]);
  });

  test('clear empties the cart', () => {
    const s = cartReducer(add(initialCartState, products[0], 1), { type: 'CLEAR' });
    expect(s.items).toEqual([]);
  });
});
