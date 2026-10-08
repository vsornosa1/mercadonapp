import type { MoveDirection } from '../lib/ordering.ts';

interface MoveControlsProps {
  /** What is being moved, as it should read after "Subir": "la zona Refrigerados". */
  what: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: MoveDirection) => void;
}

/**
 * A one-step move, up or down.
 *
 * This is the required path for every reorder, and drag may only ever be added on
 * top of it. Three reasons, each sufficient: drag-and-drop is not keyboard
 * operable and the project holds itself to WCAG 2.1 AA; dragging on a phone,
 * one-handed, with a trolley in the other hand, is exactly the fiddly interaction
 * this feature was warned against; and move buttons are testable with real user
 * events where synthesised drags are not.
 *
 * A control with nowhere to go is disabled rather than silently doing nothing.
 */
export function MoveControls({ what, canMoveUp, canMoveDown, onMove }: MoveControlsProps) {
  return (
    <span className="move">
      <button
        type="button"
        className="move__button"
        aria-label={`Subir ${what}`}
        disabled={!canMoveUp}
        onClick={() => onMove('up')}
      >
        ↑
      </button>
      <button
        type="button"
        className="move__button"
        aria-label={`Bajar ${what}`}
        disabled={!canMoveDown}
        onClick={() => onMove('down')}
      >
        ↓
      </button>
    </span>
  );
}
