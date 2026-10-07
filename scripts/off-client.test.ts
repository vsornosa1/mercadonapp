import { describe, expect, it } from 'vitest';

import { backoffDelayMs, fetchOffProduct, retryAfterMs } from './off-client.ts';

const sleepNow = async () => {};

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('retryAfterMs', () => {
  it('parses an integer Retry-After into milliseconds', () => {
    expect(retryAfterMs(new Headers({ 'retry-after': '5' }))).toBe(5000);
  });

  it('parses a fractional Retry-After', () => {
    expect(retryAfterMs(new Headers({ 'retry-after': '2.5' }))).toBe(2500);
  });

  it('returns null when the header is absent or unparseable', () => {
    expect(retryAfterMs(new Headers())).toBeNull();
    expect(retryAfterMs(new Headers({ 'retry-after': 'soon' }))).toBeNull();
  });
});

describe('backoffDelayMs', () => {
  it('doubles per attempt', () => {
    expect(backoffDelayMs(0)).toBe(1000);
    expect(backoffDelayMs(1)).toBe(2000);
    expect(backoffDelayMs(2)).toBe(4000);
  });
});

describe('fetchOffProduct', () => {
  it('returns the parsed JSON of a found product', async () => {
    const fetchFn = async () => jsonResponse({ status: 1, product: { code: 'x' } });
    await expect(fetchOffProduct('123', fetchFn, sleepNow)).resolves.toEqual({
      status: 1,
      product: { code: 'x' },
    });
  });

  it('retries a 429 and succeeds on the next attempt', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      if (calls === 1) return jsonResponse({}, 429, { 'retry-after': '0' });
      return jsonResponse({ status: 1 });
    };
    await expect(fetchOffProduct('123', fetchFn, sleepNow)).resolves.toEqual({ status: 1 });
    expect(calls).toBe(2);
  });

  it('retries a transient network error', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      if (calls === 1) throw new Error('ECONNRESET');
      return jsonResponse({ status: 0 });
    };
    await expect(fetchOffProduct('123', fetchFn, sleepNow)).resolves.toEqual({ status: 0 });
    expect(calls).toBe(2);
  });

  it('treats a 404 as a not-found product, not an error', async () => {
    const fetchFn = async () => jsonResponse({}, 404);
    await expect(fetchOffProduct('123', fetchFn, sleepNow)).resolves.toEqual({
      status: 0,
      status_verbose: 'product not found',
    });
  });

  it('gives up after exhausting retries on persistent 500s', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return jsonResponse({}, 500);
    };
    await expect(fetchOffProduct('123', fetchFn, sleepNow)).rejects.toThrow();
    expect(calls).toBeGreaterThan(1);
  });

  it('rethrows after exhausting retries on persistent network errors', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      throw new Error('ENETDOWN');
    };
    await expect(fetchOffProduct('123', fetchFn, sleepNow)).rejects.toThrow('ENETDOWN');
    expect(calls).toBe(5); // 1 initial attempt + 4 retries
  });
});
