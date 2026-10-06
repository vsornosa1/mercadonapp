import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The coverage floor applies to pure logic only — the code whose correctness
      // the product actually rests on: app logic in src/lib, and the data-pipeline
      // pure functions in scripts (category lineage, additive parsing, enrichment).
      include: ['src/lib/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['**/*.test.ts', 'scripts/fetch-catalog.ts', 'scripts/coverage-spike.ts', 'scripts/build-bundle.ts'],
      reporter: ['text'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
