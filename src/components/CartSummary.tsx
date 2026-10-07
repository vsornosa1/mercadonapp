import type { CartTotal } from '../lib/cart.ts';
import { formatPrice } from '../lib/format.ts';
import { pluralise } from '../lib/plural.ts';

interface CartSummaryProps {
  total: CartTotal;
}

/**
 * What the list costs, and the two things that make the number honest.
 *
 * The total counts one of each item, and an item sold by weight is priced at the
 * amount the catalogue lists — not at whatever the scales say. Stating both is
 * the same standard the nutrition figures are held to: never present a
 * computation as more than it is.
 */
export function CartSummary({ total }: CartSummaryProps) {
  if (total.pricedCount === 0) return null;

  return (
    <aside className="cart-summary" aria-label="Total de la lista">
      <p className="cart-summary__label">Total de la lista</p>
      <p className="cart-summary__amount">{formatPrice(total.total)}</p>
      <p className="cart-summary__note">Un artículo de cada uno.</p>
      {total.variableWeightCount > 0 ? (
        <p className="cart-summary__note">
          Lo que se vende al peso se cuenta por el peso que indica la ficha.
        </p>
      ) : null}
      {total.missingCount > 0 ? (
        <p className="cart-summary__note">
          {pluralise(total.missingCount, 'Un producto ya no está', 'Algunos productos ya no están')}{' '}
          en el catálogo, así que no se cuenta.
        </p>
      ) : null}
    </aside>
  );
}
