import type { AlternativesResult } from '../lib/alternatives.ts';
import { toBenefit, toCost } from '../lib/benefits.ts';
import { formatPrice } from '../lib/format.ts';
import { pluralise } from '../lib/plural.ts';
import type { Swap } from '../types/swaps.ts';
import { BenefitChips } from './BenefitChips.tsx';

interface SwapListProps {
  result: AlternativesResult;
  onSelect: (swap: Swap) => void;
}

/** What a recommendation gives up, if anything. Never smaller than the benefit. */
function CostNote({ swap }: { swap: Swap }) {
  if (!swap.cost) return null;
  const cost = toCost(swap.cost);
  return (
    <ul className="costs" role="list">
      <li className="cost">
        <span className="cost__prefix">A cambio:</span>
        <span className="cost__label">{cost.label}</span>
        <span className="cost__delta">{cost.delta}</span>
      </li>
    </ul>
  );
}

function accessibleName(swap: Swap): string {
  const benefits = swap.reasons
    .map((reason) => {
      const benefit = toBenefit(reason);
      return `${benefit.label}, ${benefit.delta}`;
    })
    .join('; ');
  const cost = swap.cost ? `. A cambio: ${toCost(swap.cost).label}, ${toCost(swap.cost).delta}` : '';
  return `Ver ${swap.product.name}. Mejor: ${benefits}${cost}`;
}

export function SwapList({ result, onSelect }: SwapListProps) {
  // Non-food gets no panel at all: "healthier alternatives" for shampoo is noise.
  if (result.kind === 'non-food') return null;

  if (result.kind === 'no-data') {
    return (
      <section className="panel" aria-labelledby="alternativas-title">
        <h2 id="alternativas-title" className="panel__title">
          Alternativas
        </h2>
        <p className="muted" role="status">
          No hay datos suficientes para compararlo con otros productos de su categoría.
        </p>
      </section>
    );
  }

  if (result.kind === 'none-better') {
    return (
      <section className="panel" aria-labelledby="alternativas-title">
        <h2 id="alternativas-title" className="panel__title">
          Alternativas
        </h2>
        <p className="muted" role="status">
          Lo hemos comparado con {pluralise(result.comparedCount, 'producto', 'productos')} de su
          categoría y ninguno es mejor.
        </p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="alternativas-title">
      <h2 id="alternativas-title" className="panel__title">
        Alternativas mejores
      </h2>
      <ul className="swap-list" role="list">
        {result.swaps.map((swap) => (
          <li key={swap.product.id}>
            <button
              type="button"
              className="swap-item"
              onClick={() => onSelect(swap)}
              aria-label={accessibleName(swap)}
            >
              <img className="swap-item__thumb" src={swap.product.thumbnail} alt="" loading="lazy" />
              <span className="swap-item__body">
                <span className="swap-item__name">{swap.product.name}</span>
                <BenefitChips reasons={swap.reasons} />
                <CostNote swap={swap} />
              </span>
              <span className="swap-item__aside">
                <span className="swap-item__price">{formatPrice(swap.product.unitPrice)}</span>
                <span className="swap-item__chevron" aria-hidden="true">
                  ›
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
