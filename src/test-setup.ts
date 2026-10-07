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

