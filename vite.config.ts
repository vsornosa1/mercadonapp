import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The manifest lives at public/manifest.webmanifest and is pinned by
      // tests/pwa-manifest.test.ts — the plugin must not generate a second one.
      manifest: false,
      includeAssets: ['manifest.webmanifest'],
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
});
