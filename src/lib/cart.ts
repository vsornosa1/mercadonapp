import type { CatalogProduct } from '../types/catalog.ts';
import type { Cart, CartItem } from '../types/cart.ts';

export const CART_STORAGE_KEY = 'mercadonapp.cart.v1';

export function createCart(now: Date = new Date()): Cart {
  return { items: [], updatedAt: now.toISOString() };
}

export function addItem(cart: Cart, productId: number, now: Date = new Date()): Cart {
  if (isInCart(cart, productId)) return cart;
  const item: CartItem = { productId, addedAt: now.toISOString(), checked: false };
  return { items: [...cart.items, item], updatedAt: now.toISOString() };
}

export function removeItem(cart: Cart, productId: number, now: Date = new Date()): Cart {
  return {
    items: cart.items.filter((item) => item.productId !== productId),
    updatedAt: now.toISOString(),
  };
}

export function toggleChecked(cart: Cart, productId: number, now: Date = new Date()): Cart {
  return {
    items: cart.items.map((item) =>
      item.productId === productId ? { ...item, checked: !item.checked } : item,
    ),
    updatedAt: now.toISOString(),
  };
}

export function clearCart(now: Date = new Date()): Cart {
  return { items: [], updatedAt: now.toISOString() };
}

export function isInCart(cart: Cart, productId: number): boolean {
  return cart.items.some((item) => item.productId === productId);
}

export interface CartTotal {
  /** Price of one of each item on the list, in euros. */
  total: number;
  /** Items that contributed to the total. */
  pricedCount: number;
  /** Items the catalogue no longer has, so they cannot be priced. */
  missingCount: number;
  /** Items sold by weight, priced at the weight the catalogue lists. */
  variableWeightCount: number;
}

/**
 * What the list costs, as one of each item.
 *
 * The catalogue's `unitPrice` is the real price of one purchase unit — a litre
 * of milk, the 1,07 kg of pears it lists — so this is a genuine total, not an
 * estimate built from `bulkPrice`. It is derived on demand rather than stored:
 * a `quantity` field would multiply into the same sum, but the cart is a
 * checklist and SPEC-cart requires asking before that changes.
 */
export function cartTotal(cart: Cart, products: readonly CatalogProduct[]): CartTotal {
  const priceById = new Map(products.map((product) => [product.id, product]));
  const total: CartTotal = {
    total: 0,
    pricedCount: 0,
    missingCount: 0,
    variableWeightCount: 0,
  };

  for (const item of cart.items) {
    const product = priceById.get(item.productId);
    if (!product) {
      total.missingCount += 1;
      continue;
    }
    total.total += product.unitPrice;
    total.pricedCount += 1;
    if (product.isVariableWeight) total.variableWeightCount += 1;
  }

  return total;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Loads the cart, degrading to an empty cart on any malformed stored value. */
export function loadCart(storage: StorageLike, now: Date = new Date()): Cart {
  try {
    const raw = storage.getItem(CART_STORAGE_KEY);
    if (!raw) return createCart(now);
    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed.items)) return createCart(now);
    const valid = parsed.items.every(
      (item) => typeof item.productId === 'number' && typeof item.checked === 'boolean',
    );
    if (!valid) return createCart(now);
    return parsed;
  } catch {
    return createCart(now);
  }
}

export function saveCart(storage: StorageLike, cart: Cart): void {
  storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}
