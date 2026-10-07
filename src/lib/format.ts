const priceFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

/** Formats a euro amount the way a Spanish shelf label does: comma decimal. */
export function formatPrice(value: number): string {
  return priceFormat.format(value);
}
