import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library auto-cleanup requires vitest globals; register it explicitly
// so each component test starts from a clean DOM.
afterEach(() => {
  cleanup();
});

