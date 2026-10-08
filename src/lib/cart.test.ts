import { describe, expect, it } from 'vitest';

import type { CatalogProduct } from '../types/catalog.ts';
import {
  addItem,
  cartTotal,
  clearCart,
  createCart,
  isInCart,
  loadCart,
  removeItem,
  saveCart,
  setQuantity,
  toggleChecked,
  CART_STORAGE_KEY,
} from './cart.ts';

function priced(id: number, unitPrice: number, isVariableWeight = false): CatalogProduct {
  return {
    id,
    ean: String(id),
    slug: 'x',
    name: `Producto ${id}`,
    brand: '',
    categoryPath: [],
    leafCategoryId: 0,
    thumbnail: '',
    photo: '',
    unitPrice,
    bulkPrice: null,
    unitSize: '',
    packaging: null,
    ingredientsHtml: null,
    allergensHtml: null,
    isVariableWeight,
    shareUrl: '',
  };
}

const t0 = new Date('2026-10-06T12:00:00Z');

function storageWith(value: string | null) {
  const map = new Map<string, string>();
  if (value !== null) map.set(CART_STORAGE_KEY, value);
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, v: string) => void map.set(key, v),
  };
}

describe('cart mutations', () => {
  it('adds an item with checked false, a quantity of one, and a timestamp', () => {
    const cart = addItem(createCart(t0), 42, t0);
    expect(cart.items).toEqual([
      { productId: 42, addedAt: t0.toISOString(), checked: false, quantity: 1 },
    ]);
  });

  it('does not duplicate an already-added product (set semantics)', () => {
    const once = addItem(createCart(t0), 42, t0);
    const twice = addItem(once, 42, t0);
    expect(twice.items).toHaveLength(1);
  });

  it('removes a product and toggles checked', () => {
    let cart = addItem(createCart(t0), 1, t0);
    cart = addItem(cart, 2, t0);
    expect(removeItem(cart, 1, t0).items.map((i) => i.productId)).toEqual([2]);
    const toggled = toggleChecked(cart, 2, t0);
    expect(toggled.items.find((i) => i.productId === 2)?.checked).toBe(true);
  });

  it('clears the cart and reports membership', () => {
    const cart = addItem(createCart(t0), 7, t0);
    expect(isInCart(cart, 7)).toBe(true);
    expect(clearCart(t0).items).toEqual([]);
  });
});

describe('cart total', () => {
  const products = [priced(1, 5.76), priced(2, 0.96), priced(3, 2.68, true)];

  it('multiplies each line by how many of it there are', () => {
    let cart = addItem(createCart(t0), 1, t0);
    cart = addItem(cart, 2, t0);
    cart = setQuantity(cart, 2, 3, t0);
    expect(cartTotal(cart, products).total).toBeCloseTo(5.76 + 3 * 0.96, 5);
  });

  it('counts the items, not the lines, so a badge says how much is in the bag', () => {
    let cart = addItem(createCart(t0), 2, t0);
    cart = setQuantity(cart, 2, 4, t0);
    cart = addItem(cart, 1, t0);

    const total = cartTotal(cart, products);
    expect(total.units).toBe(5);
    expect(total.lines).toBe(2);
  });

  it('totals zero for an empty list', () => {
    expect(cartTotal(createCart(t0), products)).toMatchObject({ total: 0, lines: 0, units: 0 });
  });

  it('leaves out a product the catalogue no longer has, and says how many', () => {
    let cart = addItem(createCart(t0), 1, t0);
    cart = addItem(cart, 999, t0);
    const total = cartTotal(cart, products);
    expect(total.total).toBeCloseTo(5.76, 5);
    expect(total.lines).toBe(1);
    expect(total.missingCount).toBe(1);
  });

  it('counts the items sold by weight, whose price follows the listed weight', () => {
    let cart = addItem(createCart(t0), 1, t0);
    cart = addItem(cart, 3, t0);
    expect(cartTotal(cart, products).variableWeightCount).toBe(1);
  });
});

describe('quantities', () => {
  const cart = () => addItem(addItem(createCart(t0), 1, t0), 2, t0);

  it('changes how many of one product are on the list', () => {
    const updated = setQuantity(cart(), 1, 3, t0);
    expect(updated.items.find((i) => i.productId === 1)?.quantity).toBe(3);
    expect(updated.items.find((i) => i.productId === 2)?.quantity).toBe(1);
  });

  it('never lets a quantity reach zero, so "none" is a removal and nothing else', () => {
    const updated = setQuantity(cart(), 1, 0, t0);
    expect(updated.items.find((i) => i.productId === 1)?.quantity).toBe(1);
  });

  it('never lets a quantity go negative', () => {
    expect(setQuantity(cart(), 1, -5, t0).items.find((i) => i.productId === 1)?.quantity).toBe(1);
  });

  it('keeps whole items only', () => {
    expect(setQuantity(cart(), 1, 2.7, t0).items.find((i) => i.productId === 1)?.quantity).toBe(2);
  });

  it('does nothing for a product that is not on the list', () => {
    expect(setQuantity(cart(), 99, 4, t0)).toEqual(cart());
  });

  it('stamps the change', () => {
    const later = new Date('2026-10-06T13:00:00Z');
    expect(setQuantity(cart(), 1, 2, later).updatedAt).toBe(later.toISOString());
  });

  it('reads a stored list from before quantities as one of each', () => {
    const before = {
      items: [{ productId: 42, addedAt: '', checked: false }],
      updatedAt: '',
    };
    expect(loadCart(storageWith(JSON.stringify(before))).items[0]!.quantity).toBe(1);
  });

  it('ignores a stored quantity that could not have come from the app', () => {
    const bad = {
      items: [
        { productId: 1, addedAt: '', checked: false, quantity: 0 },
        { productId: 2, addedAt: '', checked: false, quantity: 'lots' },
        { productId: 3, addedAt: '', checked: false, quantity: -2 },
      ],
      updatedAt: '',
    };
    const loaded = loadCart(storageWith(JSON.stringify(bad)));
    expect(loaded.items.map((i) => i.quantity)).toEqual([1, 1, 1]);
  });
});

describe('cart persistence', () => {
  it('round-trips a cart through storage', () => {
    const storage = storageWith(null);
    const cart = addItem(createCart(t0), 42, t0);
    saveCart(storage, cart);
    expect(loadCart(storage)).toEqual(cart);
  });

  it('returns an empty cart when nothing is stored', () => {
    expect(loadCart(storageWith(null), t0)).toEqual(createCart(t0));
  });

  it('degrades to an empty cart on corrupt JSON', () => {
    expect(loadCart(storageWith('{not json'), t0)).toEqual(createCart(t0));
  });

  it('degrades to an empty cart when items is not an array', () => {
    expect(loadCart(storageWith(JSON.stringify({ items: 'nope' })), t0)).toEqual(createCart(t0));
  });

  it('degrades to an empty cart when an item is malformed', () => {
    const bad = {
      items: [{ productId: 'x', addedAt: '', checked: false, quantity: 1 }],
      updatedAt: '',
    };
    expect(loadCart(storageWith(JSON.stringify(bad)), t0)).toEqual(createCart(t0));
  });
});
