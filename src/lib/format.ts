const priceFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

/** Formats a euro amount the way a Spanish shelf label does: comma decimal. */
export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

/**
 * Formats a nutrition figure for display. Open Food Facts returns long floats
 * (e.g. 76.66666666666667 kcal), so energy is rounded to a whole number and
 * macros to one decimal — except below one gram, where one decimal would
 * distort the value (0.098 g is not 0.1 g).
 */
export function formatNutrientValue(value: number, unit: 'kcal' | 'g'): string {
  const rounded =
    unit === 'kcal'
      ? Math.round(value)
      : Math.abs(value) < 1 && value !== 0
        ? Math.round(value * 100) / 100
        : Math.round(value * 10) / 10;
  return rounded.toLocaleString('es-ES');
}

/** A nutrition figure with its unit, e.g. "77 kcal" or "0,15 g". */
export function formatNutrient(value: number, unit: 'kcal' | 'g'): string {
  return `${formatNutrientValue(value, unit)} ${unit}`;
}
