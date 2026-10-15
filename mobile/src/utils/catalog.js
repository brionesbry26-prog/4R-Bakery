import { toCents } from './money';

export const ALL_CATEGORIES = 'All';

/** Local search/filter/sort over the already-loaded product list. */
export function filterProducts(products, { category = ALL_CATEGORIES, search = '', sortBy = 'featured' } = {}) {
  const term = search.trim().toLowerCase();
  let list = products.filter((p) => {
    if (category !== ALL_CATEGORIES && p.category !== category) return false;
    if (!term) return true;
    return p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term);
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  const sorters = {
    featured: (a, b) => Number(b.is_featured) - Number(a.is_featured) || a.category.localeCompare(b.category) || byName(a, b),
    name: byName,
    '-name': (a, b) => byName(b, a),
    price: (a, b) => toCents(a.price) - toCents(b.price) || byName(a, b),
    '-price': (a, b) => toCents(b.price) - toCents(a.price) || byName(a, b),
  };
  list = [...list].sort(sorters[sortBy] || sorters.featured);
  return list;
}

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
];
