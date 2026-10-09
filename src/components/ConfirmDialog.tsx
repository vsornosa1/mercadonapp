import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  /** As a question: "¿Vaciar la lista?" */
  title: string;
  /** What will happen, in the user's terms. */
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A confirmation for an action that cannot be undone, built on the native
 * `<dialog>`.
 *
 * The reason for the native element is everything it brings with it: a real focus
 * trap, Esc handling, an inert background, and placement in the browser's top
 * layer. All of that would otherwise be hand-rolled and subtly wrong.
 *
 * It is deliberately **not** `window.confirm`. That is the browser's alert, not the
 * app's: it cannot be styled, it is blocking, it can be suppressed by the browser
 * after enough uses — and it arrives looking like something the page did not do.
 * This one speaks the app's language and names the consequence before asking.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Start on the safe choice: a stray Return should not destroy anything.
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm"
      aria-labelledby={titleId}
      // Esc. Preventing the default close keeps the parent's state in charge of
      // whether the dialog is open, so there is one source of truth.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // A click on the backdrop targets the dialog element itself.
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel();
      }}
    >
      <h2 id={titleId} className="confirm__title">
        {title}
      </h2>
      <p className="confirm__message">{message}</p>
      <div className="confirm__actions">
        <button type="button" ref={cancelRef} className="confirm__cancel" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="confirm__confirm" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
