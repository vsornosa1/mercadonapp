import type { Swap } from '../types/swaps.ts';
import { formatPrice, formatReason } from '../lib/format.ts';

export function SwapList({ swaps }: { swaps: Swap[] }) {
  if (swaps.length === 0) {
    return (
      <section className="panel" aria-labelledby="swaps-title">
        <h2 id="swaps-title" className="panel__title">
          Alternativas
        </h2>
        <p className="muted" role="status">
          No hemos encontrado una alternativa mejor.
        </p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="swaps-title">
      <h2 id="swaps-title" className="panel__title">
        Alternativas mejores
      </h2>
      <ul className="swap-list" role="list">
        {swaps.map((swap) => (
          <li key={swap.product.id} className="swap-item">
            <img
              className="swap-item__thumb"
              src={swap.product.thumbnail}
              alt=""
              loading="lazy"
            />
            <div className="swap-item__body">
              <span className="swap-item__name">{swap.product.name}</span>
              <ul className="swap-item__reasons" role="list">
                {swap.reasons.map((reason) => (
                  <li key={reason.kind} className="swap-item__reason">
                    {formatReason(reason)}
                  </li>
                ))}
              </ul>
            </div>
            <span className="swap-item__price">{formatPrice(swap.product.unitPrice)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
