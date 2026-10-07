import { describe, expect, it } from 'vitest';

import { formatPrice, formatReason } from './format';

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

describe('formatReason', () => {
  it('renders the additive reason with counts', () => {
    expect(formatReason({ kind: 'additives', from: 3, to: 0, detail: ['407'] })).toBe(
      'menos aditivos (3 → 0)',
    );
  });

  it('renders the nova reason', () => {
    expect(formatReason({ kind: 'nova', from: 4, to: 1 })).toBe('NOVA más bajo (4 → 1)');
  });

  it('renders the protein reason with per-100g units', () => {
    expect(formatReason({ kind: 'protein', from: 3, to: 9 })).toBe(
      'más proteína (3 g → 9 g por 100 g)',
    );
  });

  it('renders sugars and salt with a comma decimal', () => {
    expect(formatReason({ kind: 'sugars', from: 12, to: 4 })).toBe('menos azúcar (12 g → 4 g)');
    expect(formatReason({ kind: 'salt', from: 0.2, to: 0.1 })).toBe('menos sal (0,2 g → 0,1 g)');
  });
});
