import { useMemo } from 'react';

import { CartItemRow } from '../components/CartItemRow.tsx';
import { CartSummary } from '../components/CartSummary.tsx';
import { MoveControls } from '../components/MoveControls.tsx';
import { OrderChip } from '../components/OrderChip.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import type { CartTotal } from '../lib/cart.ts';
import {
  isCustomised,
  moveProduct,
  moveZone,
  nextMode,
  orderWithinZone,
  orderZones,
  resetOrder,
  sortByName,
  type OrderMode,
  type OrderPreference,
} from '../lib/ordering.ts';
import { zoneFor, type ZoneId } from '../lib/zones.ts';
import type { EnrichedCatalogProduct } from '../types/catalog.ts';
import type { Cart, CartItem } from '../types/cart.ts';

interface CartScreenProps {
  cart: Cart;
  products: EnrichedCatalogProduct[];
  /** Priced by the app, so the total in the navigation and here are one number. */
  total: CartTotal;
  order: OrderPreference;
  onOrderChange: (order: OrderPreference) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onSetQuantity: (id: number, quantity: number) => void;
}

interface Row {
  item: CartItem;
  product: EnrichedCatalogProduct;
}

interface Block {
  key: string;
  heading: string | null;
  zone: ZoneId | null;
  rows: Row[];
}

/**
 * The list, as a walk.
 *
 * Zones group what belongs together and the mode decides the sequence, so this
 * screen only has to arrange blocks. `A–Z` is deliberately a flat list with no
 * headings: it exists to check whether something is on the list, not to walk it.
 *
 * On a phone the total is a bar fixed above the tabs; on a window it is a card
 * beside the list.
 */
export function CartScreen({
  cart,
  products,
  total,
  order,
  onOrderChange,
  onToggle,
  onRemove,
  onClear,
  onSetQuantity,
}: CartScreenProps) {
  const { blocks, zoneIds } = useMemo(
    () => buildBlocks(cart, products, order),
    [cart, products, order],
  );

  const missing = cart.items.filter((item) => !products.some((p) => p.id === item.productId));

  const handleClear = () => {
    if (window.confirm('¿Vaciar la lista entera?')) onClear();
  };

  const handleReset = () => {
    if (window.confirm('¿Volver al orden de compra y descartar tu orden?')) {
      onOrderChange(resetOrder());
    }
  };

  if (cart.items.length === 0) {
    return (
      <section aria-label="Mi lista">
        <h1 className="screen-title">Mi lista</h1>
        <StateMessage
          icon="cart"
          title="La lista está vacía"
          hint="Busca un producto y añádelo. Aquí podrás ir tachándolo en la tienda."
        />
      </section>
    );
  }

  return (
    <section aria-label="Mi lista">
      <h1 className="screen-title">Mi lista</h1>

      <div className="cart-layout">
        <div className="cart-layout__list">
          <OrderChip
            order={order}
            onChange={(mode: OrderMode) => onOrderChange(nextMode(order, mode))}
          />

          {blocks.map((block) => {
            const zone = block.zone;
            const position = zone === null ? -1 : zoneIds.indexOf(zone);
            const canReorder = zone !== null && order.mode !== 'az';

            return (
              <section
                key={block.key}
                className="cart-block"
                aria-labelledby={block.heading === null ? undefined : `zona-${block.key}`}
              >
                {block.heading === null ? null : (
                  <div className="cart-block__head">
                    <h2 id={`zona-${block.key}`} className="cart-block__title">
                      {block.heading}
                    </h2>
                    {canReorder ? (
                      <MoveControls
                        what={`la zona ${block.heading}`}
                        canMoveUp={position > 0}
                        canMoveDown={position >= 0 && position < zoneIds.length - 1}
                        onMove={(direction) => onOrderChange(moveZone(order, zone, direction, zoneIds))}
                      />
                    ) : null}
                  </div>
                )}

                <ul className="cart-list" role="list">
                  {block.rows.map(({ item, product }, index) => (
                    <CartItemRow
                      key={item.productId}
                      item={item}
                      product={product}
                      // A zone holding one product has nothing to reorder, and two
                      // disabled arrows on every row is clutter that says so badly.
                      // The controls appear when there is actually a choice.
                      reorder={
                        canReorder && block.rows.length > 1
                          ? {
                              canMoveUp: index > 0,
                              canMoveDown: index < block.rows.length - 1,
                              onMove: (direction) =>
                                onOrderChange(
                                  moveProduct(
                                    order,
                                    zone,
                                    product.id,
                                    direction,
                                    block.rows.map((row) => row.product),
                                  ),
                                ),
                            }
                          : undefined
                      }
                      onToggle={() => onToggle(item.productId)}
                      onRemove={() => onRemove(item.productId)}
                      onSetQuantity={(quantity) => onSetQuantity(item.productId, quantity)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          {missing.length > 0 ? (
            <section className="cart-block" aria-labelledby="zona-faltantes">
              <div className="cart-block__head">
                <h2 id="zona-faltantes" className="cart-block__title">
                  Ya no disponibles
                </h2>
              </div>
              <ul className="cart-list" role="list">
                {missing.map((item) => (
                  <li key={item.productId} className="cart-item cart-item--missing">
                    <span className="cart-item__name muted">Producto no disponible</span>
                    <button
                      type="button"
                      className="cart-item__remove"
                      aria-label="Eliminar producto no disponible"
                      onClick={() => onRemove(item.productId)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="cart-actions">
            {isCustomised(order) ? (
              <button type="button" className="cart-action" onClick={handleReset}>
                Restablecer orden
              </button>
            ) : null}
            <button type="button" className="cart-clear" onClick={handleClear}>
              Vaciar lista
            </button>
          </div>
        </div>

        <CartSummary total={total} />
      </div>
    </section>
  );
}

/**
 * Turns the list into the blocks to render.
 *
 * A delisted product has no zone and no catalogue record, so it cannot be placed
 * on the walk at all. Rather than drop it, it is kept where it can still be
 * removed — and `cartTotal` counts it as missing rather than silently pricing it.
 */
function buildBlocks(
  cart: Cart,
  products: EnrichedCatalogProduct[],
  order: OrderPreference,
): { blocks: Block[]; zoneIds: ZoneId[] } {
  const byId = new Map(products.map((product) => [product.id, product]));
  const present = cart.items.flatMap((item) => {
    const product = byId.get(item.productId);
    return product === undefined ? [] : [{ item, product }];
  });

  const rowByProduct = new Map(present.map((entry) => [entry.product.id, entry]));

  if (order.mode === 'az') {
    const rows = sortByName(present.map((entry) => entry.product)).map(
      (product) => rowByProduct.get(product.id)!,
    );
    return { blocks: [{ key: 'az', heading: null, zone: null, rows }], zoneIds: [] };
  }

  const byZone = new Map<ZoneId, Row[]>();
  for (const entry of present) {
    const zone = zoneFor(entry.product);
    const bucket = byZone.get(zone);
    if (bucket) bucket.push(entry);
    else byZone.set(zone, [entry]);
  }

  // Only the zones with something in them: an empty one would take a step from a
  // reorder that the user cannot see the result of.
  const zoneIds = orderZones(order)
    .map((zone) => zone.id)
    .filter((id) => (byZone.get(id)?.length ?? 0) > 0);

  const blocks = orderZones(order)
    .filter((zone) => zoneIds.includes(zone.id))
    .map((zone) => {
      const entries = byZone.get(zone.id)!;
      // Within a zone, the order things were added; layer 2 reorders it once the
      // user says so.
      const arranged = orderWithinZone(
        order,
        zone.id,
        entries.map((entry) => entry.product),
      );
      return {
        key: zone.id,
        heading: zone.label,
        zone: zone.id,
        rows: arranged.map((product) => rowByProduct.get(product.id)!),
      };
    });

  return { blocks, zoneIds };
}
