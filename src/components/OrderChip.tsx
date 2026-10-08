import { isCustomised, type OrderMode, type OrderPreference } from '../lib/ordering.ts';
import { TRIP_WHY } from '../lib/zones.ts';

interface OrderChipProps {
  order: OrderPreference;
  onChange: (mode: OrderMode) => void;
}

const MODES: { mode: OrderMode; label: string }[] = [
  { mode: 'trip', label: 'Orden de compra' },
  { mode: 'custom', label: 'Mi orden' },
  { mode: 'az', label: 'A–Z' },
];

const MODE_LABEL: Record<OrderMode, string> = {
  trip: 'Orden de compra',
  custom: 'Mi orden',
  az: 'A–Z',
};

/**
 * Always states which order is in effect, because an order you cannot see is an
 * order you cannot trust.
 *
 * The group carries the current mode in its accessible name rather than leaving it
 * to a highlighted segment, so it is stated once, unambiguously, for anyone not
 * reading colour.
 *
 * It sits with the content it describes — at the top of the list, beneath the
 * search field — not in the app bar, which already holds the name, the search and
 * the way to the list.
 */
export function OrderChip({ order, onChange }: OrderChipProps) {
  const arranged = isCustomised(order);

  return (
    <div className="order">
      <div
        className="order__chip"
        role="group"
        aria-label={`Orden de la lista: ${MODE_LABEL[order.mode]}`}
      >
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            className="order__option"
            aria-pressed={order.mode === mode}
            // Nothing has been arranged yet, so "Mi orden" would be a second name
            // for the proposal. It reads as inert until a first move makes it real.
            disabled={mode === 'custom' && !arranged}
            onClick={() => onChange(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      {order.mode === 'trip' ? <p className="order__why">{TRIP_WHY}</p> : null}
    </div>
  );
}
