import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog } from './ConfirmDialog.tsx';

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="¿Vaciar la lista?"
      message="Se quitarán 7 productos."
      confirmLabel="Vaciar"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('is a modal dialog that names itself, not an alert box', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: '¿Vaciar la lista?' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
  });

  it('describes the consequence, so the choice is not made blind', () => {
    renderDialog();
    expect(screen.getByText('Se quitarán 7 productos.')).toBeInTheDocument();
  });

  it('starts on the safe choice, so a stray Enter does not destroy anything', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('reports the confirmation', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Vaciar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('reports the cancellation, and does nothing else', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('stays shut when it is not open, rather than lurking in the page', () => {
    renderDialog({ open: false });
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).not.toHaveAttribute('open');
  });

  it('names itself uniquely when two of them are mounted at once', () => {
    // The cart has two destructive actions, so both dialogs exist together. Duplicate
    // ids would make a screen reader announce the wrong title.
    render(
      <>
        <ConfirmDialog
          open
          title="¿Vaciar la lista?"
          message="A"
          confirmLabel="Vaciar"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
        <ConfirmDialog
          open={false}
          title="¿Restablecer el orden?"
          message="B"
          confirmLabel="Restablecer"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </>,
    );

    const ids = [...document.querySelectorAll('dialog h2')].map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(screen.getByRole('dialog', { name: '¿Vaciar la lista?' })).toBeInTheDocument();
  });
});

describe('ConfirmDialog — opening and closing as the app drives it', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Vaciar lista
        </button>
        <ConfirmDialog
          open={open}
          title="¿Vaciar la lista?"
          message="Se quitarán 7 productos."
          confirmLabel="Vaciar"
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  }

  it('opens on demand and closes when answered', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');

    await user.click(screen.getByRole('button', { name: 'Vaciar lista' }));
    expect(screen.getByRole('dialog', { name: '¿Vaciar la lista?' })).toHaveAttribute('open');

    await user.click(screen.getByRole('button', { name: 'Vaciar' }));
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
  });
});
