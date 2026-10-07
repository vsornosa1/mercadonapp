import { describe, expect, it } from 'vitest';

import { formatNutrient, formatPrice } from './format';

describe('formatPrice', () => {
  it('formats euros with a comma decimal and a non-breaking space before the symbol', () => {
    expect(formatPrice(5.22)).toBe('5,22\u00A0€');
  });

  it('keeps two decimals', () => {
    expect(formatPrice(0.5)).toBe('0,50\u00A0€');
  });

  it('formats whole euros without a decimal', () => {
    expect(formatPrice(3)).toBe('3,00\u00A0€');
  });
  });

  // formatReason and formatNumber were removed with the v2 ranking: reason wording
  // now lives in benefits.ts (toBenefit/toCost) as the single source of truth, so
  // the badge, the chips and the accessible name cannot drift apart.

  describe('formatNutrient', () => {
  it('rounds energy to a whole number — Open Food Facts returns long floats', () => {
    expect(formatNutrient(76.66666666666667, 'kcal')).toBe('77 kcal');
  });

  it('keeps one decimal for macros', () => {
    expect(formatNutrient(4.8, 'g')).toBe('4,8 g');
    expect(formatNutrient(18, 'g')).toBe('18 g');
    expect(formatNutrient(3.6, 'g')).toBe('3,6 g');
  });

  it('keeps two decimals below one gram, where rounding to one would distort the value', () => {
    expect(formatNutrient(0.15, 'g')).toBe('0,15 g');
    expect(formatNutrient(0.098, 'g')).toBe('0,1 g');
  });

  it('renders zero plainly', () => {
    expect(formatNutrient(0, 'g')).toBe('0 g');
  });
});
