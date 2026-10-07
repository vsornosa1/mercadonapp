import { basisLabel, tierLabel } from '../lib/tier-labels.ts';
import type { ProcessingSignal } from '../types/nutrition.ts';

export function ProcessingBadge({ signal }: { signal: ProcessingSignal }) {
  return (
    <div className="processing">
      <span className={`badge badge--${signal.tier}`}>
        {tierLabel(signal.tier, signal.basis)}
      </span>
      {signal.tier !== 'unknown' ? (
        <span className="processing__basis">{basisLabel(signal.basis)}</span>
      ) : null}
    </div>
  );
}
