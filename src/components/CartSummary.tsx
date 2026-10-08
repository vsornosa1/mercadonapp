import type { CartTotal } from '../lib/cart.ts';
import { formatPrice } from '../lib/format.ts';
import { pluralise } from '../lib/plural.ts';

interface CartSummaryProps {
  total: CartTotal;
}

/**
 * What the list costs, and what the number does not cover.
 *
 * Goods sold by weight are priced at the amount the catalogue lists, not at
 * whatever the scales say, and a product the catalogue has dropped cannot be
 * priced at all. Saying both is the same standard the nutrition figures are held
 * to: never present a computation as more than it is.
 */
export function CartSummary({ total }: CartSummaryProps) {
  if (total.lines === 0) return null;

  return (
    <aside className="cart-summary" aria-label="Total de la lista">
      <p className="cart-summary__label">Total de la lista</p>
      <p className="cart-summary__amount">{formatPrice(total.total)}</p>
      <p className="cart-summary__note">
        {pluralise(total.units, 'producto', 'productos')} ·{' '}
        {pluralise(total.lines, 'línea', 'líneas')}
      </p>
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
