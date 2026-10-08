import type { CatalogProduct } from '../types/catalog.ts';
import type { Cart, CartItem } from '../types/cart.ts';

export const CART_STORAGE_KEY = 'mercadonapp.cart.v1';

export function createCart(now: Date = new Date()): Cart {
  return { items: [], updatedAt: now.toISOString() };
}

export function addItem(cart: Cart, productId: number, now: Date = new Date()): Cart {
  if (isInCart(cart, productId)) return cart;
  const item: CartItem = { productId, addedAt: now.toISOString(), checked: false, quantity: 1 };
  return { items: [...cart.items, item], updatedAt: now.toISOString() };
}

/**
 * How many of one product are on the list.
 *
 * Clamped to a whole number of at least one: "none of it" is what `removeItem` is
 * for, so a quantity can never reach zero by arithmetic and leave a row that
 * counts for nothing. A product not on the list is left alone.
 */
export function setQuantity(
  cart: Cart,
  productId: number,
  quantity: number,
  now: Date = new Date(),
): Cart {
  if (!isInCart(cart, productId)) return cart;
  const wanted = Math.max(1, Math.floor(quantity));
  return {
    items: cart.items.map((item) =>
      item.productId === productId ? { ...item, quantity: wanted } : item,
    ),
    updatedAt: now.toISOString(),
  };
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
  /** What the list costs, with every quantity multiplied in, in euros. */
  total: number;
  /** Items on the list, counting quantities — what a badge should say. */
  units: number;
  /** Distinct products on the list — how many rows there are. */
  lines: number;
  /** Lines the catalogue no longer has, so they cannot be priced. */
  missingCount: number;
  /** Lines sold by weight, priced at the weight the catalogue lists. */
  variableWeightCount: number;
}

/**
 * What the list costs.
 *
 * The catalogue's `unitPrice` is the real price of one purchase unit — a litre of
 * milk, the 1,07 kg of pears it lists — so this is a genuine total, not an estimate
 * built from `bulkPrice`. It is derived on demand rather than stored, which is why
 * adding quantities needed no schema migration and no second source of truth.
 */
export function cartTotal(cart: Cart, products: readonly CatalogProduct[]): CartTotal {
  const priceById = new Map(products.map((product) => [product.id, product]));
  const total: CartTotal = {
    total: 0,
    units: 0,
    lines: 0,
    missingCount: 0,
    variableWeightCount: 0,
  };

  for (const item of cart.items) {
    const product = priceById.get(item.productId);
    if (!product) {
      total.missingCount += 1;
      continue;
    }
    total.total += product.unitPrice * item.quantity;
    total.units += item.quantity;
    total.lines += 1;
    if (product.isVariableWeight) total.variableWeightCount += 1;
  }

  return total;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * How many of one product, as read back from storage.
 *
 * A cart saved before quantities existed has no `quantity`, and a value that could
 * not have come from the app (zero, negative, fractional, a string) is treated the
 * same way: one of it. Tolerating this is why the storage key did not need
 * bumping — bumping would have thrown away a list the user had already built.
 */
function readQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const whole = Math.floor(value);
  return whole >= 1 ? whole : 1;
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
    return {
      ...parsed,
      items: parsed.items.map((item) => ({ ...item, quantity: readQuantity(item.quantity) })),
    };
  } catch {
    return createCart(now);
  }
}

export function saveCart(storage: StorageLike, cart: Cart): void {
  storage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}
