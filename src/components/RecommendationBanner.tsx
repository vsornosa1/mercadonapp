import type { Reason } from '../types/swaps.ts';
import { BenefitChips } from './BenefitChips.tsx';

interface RecommendationBannerProps {
  fromName: string;
  reasons: Reason[];
  onBack: () => void;
}

/**
 * Shown on a product reached from an alternatives list. It answers the question
 * the user arrives with — "why am I looking at this?" — immediately, instead of
 * making them remember what they tapped.
 */
export function RecommendationBanner({ fromName, reasons, onBack }: RecommendationBannerProps) {
  return (
    <section className="recommendation" role="status" aria-label="Producto recomendado">
      <p className="recommendation__title">
        <span aria-hidden="true">⭐ </span>
        Recomendado en lugar de <strong>{fromName}</strong>
      </p>
      <BenefitChips reasons={reasons} />
      <button type="button" className="recommendation__back" onClick={onBack}>
        ← Volver a {fromName}
      </button>
    </section>
  );
}
