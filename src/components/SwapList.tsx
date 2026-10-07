import type { AlternativesResult } from '../lib/alternatives.ts';
import { formatPrice, formatReason } from '../lib/format.ts';
import type { Swap } from '../types/swaps.ts';
import { BenefitChips } from './BenefitChips.tsx';

interface SwapListProps {
  result: AlternativesResult;
  onSelect: (swap: Swap) => void;
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
          Lo hemos comparado con {result.comparedCount}{' '}
          {result.comparedCount === 1 ? 'producto' : 'productos'} de su categoría y ninguno es mejor.
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
              aria-label={`Ver ${swap.product.name}. Mejor: ${swap.reasons
                .map(formatReason)
                .join('; ')}`}
            >
              <img className="swap-item__thumb" src={swap.product.thumbnail} alt="" loading="lazy" />
              <span className="swap-item__body">
                <span className="swap-item__name">{swap.product.name}</span>
                <BenefitChips reasons={swap.reasons} />
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
