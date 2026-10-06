const DEFAULT_USER_AGENT = 'mercadonapp/0.1 (single-user nutrition assistant; build-time enrichment)';
const MAX_RETRIES = 4;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;
export type SleepFn = (ms: number) => Promise<void>;

export function retryAfterMs(headers: Headers): number | null {
  const value = headers.get('retry-after');
  if (!value) return null;
  const seconds = Number.parseFloat(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

export function backoffDelayMs(attempt: number): number {
  return 1000 * 2 ** attempt;
}

/**
 * Fetches one product from Open Food Facts with a descriptive User-Agent,
 * honouring Retry-After on 429/503 and backing off on transient network errors.
 * Unknown barcodes come back as `{ status: 0 }` (HTTP 200), which is not an error.
 */
export async function fetchOffProduct(
  ean: string,
  fetchFn: FetchFn = fetch,
  sleepFn: SleepFn = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<unknown> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=code,product_name,nutriments,nova_group,additives_tags,ingredients_text`;

  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetchFn(url, { headers: { 'user-agent': DEFAULT_USER_AGENT } });
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      await sleepFn(backoffDelayMs(attempt));
      continue;
    }

    if (response.ok) return response.json();

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      const waitMs = retryAfterMs(response.headers) ?? backoffDelayMs(attempt);
      await sleepFn(waitMs);
      continue;
    }

    throw new Error(`Open Food Facts HTTP ${response.status} for ${ean}`);
  }
}
