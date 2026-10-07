export interface CatalogCheckResult {
  ok: boolean;
  count?: number;
  reason?: string;
}

const MIN_EXPECTED_PRODUCTS = 1000;

/**
 * Guards the built app against shipping without a catalogue. A missing or
 * truncated bundle would otherwise deploy silently as an app where search
 * returns nothing — the failure mode is invisible until someone tries to use it.
 *
 * `readFile` is injected so the check is pure and testable.
 */
export function checkCatalog(path: string, readFile: (path: string) => string | null): CatalogCheckResult {
  const raw = readFile(path);
  if (raw === null) {
    return { ok: false, reason: `no existe: ${path}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: `JSON inválido en ${path}` };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, reason: `el catálogo no es un array: ${path}` };
  }

  if (parsed.length < MIN_EXPECTED_PRODUCTS) {
    return { ok: false, reason: `solo ${parsed.length} productos, se esperaban ≥ ${MIN_EXPECTED_PRODUCTS}` };
  }

  return { ok: true, count: parsed.length };
}
