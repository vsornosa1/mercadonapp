import { describe, expect, it } from 'vitest';

import { formatPrice } from './format';

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
