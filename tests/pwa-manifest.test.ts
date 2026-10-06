import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '..');
const publicDir = resolve(projectRoot, 'public');

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

// The manifest is the machine-checkable half of installability. A broken manifest
// silently means "not installable" — so the fields that make install work are
// pinned here, and the icon files are checked to actually exist on disk.
describe('PWA manifest contract', () => {
  const manifestPath = resolve(publicDir, 'manifest.webmanifest');

  it('exists and parses as JSON', () => {
    expect(existsSync(manifestPath), 'public/manifest.webmanifest must exist').toBe(true);
    expect(() => JSON.parse(readFileSync(manifestPath, 'utf8'))).not.toThrow();
  });

  it('declares a Spanish standalone app', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    expect(manifest.name).toBeTruthy();
    expect(manifest.lang).toBe('es');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.theme_color).toBeTruthy();
  });

  it('ships icons with declared sizes, and every referenced file exists', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    const icons = manifest.icons as ManifestIcon[] | undefined;
    expect(icons, 'manifest must declare icons').toBeTruthy();
    expect(icons!.length).toBeGreaterThanOrEqual(2);
    expect(icons!.some((icon) => icon.purpose === 'maskable'), 'needs a maskable icon').toBe(true);
    for (const icon of icons!) {
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
      expect(icon.type).toBe('image/png');
      expect(
        existsSync(resolve(publicDir, icon.src.replace(/^\//, ''))),
        `${icon.src} must exist on disk`,
      ).toBe(true);
    }
  });
});
