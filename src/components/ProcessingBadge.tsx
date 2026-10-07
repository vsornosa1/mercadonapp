import type { ProcessingSignal } from '../types/nutrition.ts';

const TIER_LABEL: Record<ProcessingSignal['tier'], string> = {
  unknown: 'Sin datos',
  whole: 'Alimento entero',
  processed: 'Procesado',
  'ultra-processed': 'Ultraprocesado',
};

const BASIS_LABEL: Record<ProcessingSignal['basis'], string> = {
  'off-nova': 'NOVA',
  'ingredient-heuristic': 'según ingredientes',
  'category-rule': 'por categoría',
};

export function ProcessingBadge({ signal }: { signal: ProcessingSignal }) {
  return (
    <div className="processing">
      <span className={`badge badge--${signal.tier}`}>{TIER_LABEL[signal.tier]}</span>
      {signal.tier !== 'unknown' ? (
        <span className="processing__basis">Clasificación {BASIS_LABEL[signal.basis]}</span>
      ) : null}
    </div>
  );
}
