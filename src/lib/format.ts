import type { Reason } from '../types/swaps.ts';

const priceFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

/** Formats a euro amount the way a Spanish shelf label does: comma decimal. */
export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

/** Formats a plain number with a Spanish comma decimal. */
export function formatNumber(value: number): string {
  return value.toLocaleString('es-ES');
}

/** Renders a swap reason as Spanish text with its actual numbers. */
export function formatReason(reason: Reason): string {
  switch (reason.kind) {
    case 'additives':
      return `menos aditivos (${reason.from} → ${reason.to})`;
    case 'nova':
      return `NOVA más bajo (${reason.from} → ${reason.to})`;
    case 'protein':
      return `más proteína (${formatNumber(reason.from)} g → ${formatNumber(reason.to)} g por 100 g)`;
    case 'sugars':
      return `menos azúcar (${formatNumber(reason.from)} g → ${formatNumber(reason.to)} g)`;
    case 'salt':
      return `menos sal (${formatNumber(reason.from)} g → ${formatNumber(reason.to)} g)`;
  }
}
