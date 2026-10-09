import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library auto-cleanup requires vitest globals; register it explicitly
// so each component test starts from a clean DOM.
afterEach(() => {
  cleanup();
});

// jsdom implements no layout, so scrolling is a no-op the app would otherwise
// trip over every time it moves focus to a new view.
window.scrollTo = () => {};

// jsdom implements the dialog *element* but not its modal methods, so a component
// using <dialog> cannot open at all under test. This stub makes the element
// visible; it deliberately does NOT imitate the behaviour that makes a native
// <dialog> worth using — the focus trap, Esc, and an inert background — because a
// stub cannot prove those. They are verified in a real browser instead.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  }
}

