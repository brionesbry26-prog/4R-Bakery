// Money helpers. The API sends prices as 2-decimal strings ("12.50").
// The app only estimates totals for display, using integer centavos to
// avoid floating-point drift; the server always computes the real total.

export function toCents(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function formatCents(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const pesos = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const centavos = String(abs % 100).padStart(2, '0');
  return `${sign}₱${pesos}.${centavos}`;
}

export function formatPeso(value) {
  return formatCents(toCents(value));
}
