import { describe, expect, it } from 'vitest';

import { pluralise } from './plural.ts';

describe('pluralise', () => {
  it('uses the singular for exactly one', () => {
    expect(pluralise(1, 'producto', 'productos')).toBe('1 producto');
  });

  it('uses the plural for more than one', () => {
    expect(pluralise(2, 'producto', 'productos')).toBe('2 productos');
    expect(pluralise(139, 'producto', 'productos')).toBe('139 productos');
  });

  it('uses the PLURAL for zero, as Spanish requires — not the singular', () => {
    // The reason this helper exists: a hand-rolled `count === 1` gets this right
    // by accident, and a future `count > 0` refactor would silently break it.
    expect(pluralise(0, 'producto', 'productos')).toBe('0 productos');
    expect(pluralise(0, 'resultado', 'resultados')).toBe('0 resultados');
  });

  it('takes the noun pair, so it is not tied to one word', () => {
    expect(pluralise(1, 'resultado', 'resultados')).toBe('1 resultado');
    expect(pluralise(3, 'resultado', 'resultados')).toBe('3 resultados');
  });

  it('does not format the number — callers keep control of that', () => {
    expect(pluralise(1000, 'producto', 'productos')).toBe('1000 productos');
  });
});
