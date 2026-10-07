import type { Reason } from '../types/swaps.ts';
import { toBenefit } from '../lib/benefits.ts';

export function BenefitChips({ reasons }: { reasons: Reason[] }) {
  return (
    <ul className="benefits" role="list">
      {reasons.map((reason) => {
        const benefit = toBenefit(reason);
        return (
          <li key={reason.kind} className="benefit">
            <span className="benefit__icon" aria-hidden="true">
              {benefit.direction === 'up' ? '↑' : '↓'}
            </span>
            <span className="benefit__label">{benefit.label}</span>
            <span className="benefit__delta">{benefit.delta}</span>
          </li>
        );
      })}
    </ul>
  );
}
