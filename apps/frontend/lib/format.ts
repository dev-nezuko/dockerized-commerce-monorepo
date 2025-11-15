// A fixed locale keeps the server-rendered price identical to the hydrated one.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}
