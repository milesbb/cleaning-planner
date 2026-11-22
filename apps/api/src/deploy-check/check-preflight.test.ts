import { describe, expect, it, vi } from 'vitest';
import { checkPreflight } from './check-preflight';

function respondWith(status: number, headers: Record<string, string> = {}): typeof fetch {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status, headers })));
}

const ALLOWED = { 'access-control-allow-origin': 'https://localhost' };

describe('checkPreflight', () => {
  it('passes when API Gateway answers a signed-in request’s preflight for the app', async () => {
    await expect(
      checkPreflight('https://api.example.com/', respondWith(204, ALLOWED)),
    ).resolves.toEqual({ passed: true });
  });

  it('asks the way a browser does before a signed-in PATCH', async () => {
    const fetchPreflight = respondWith(204, ALLOWED);
    await checkPreflight('https://api.example.com', fetchPreflight);
    const [url, init] = vi.mocked(fetchPreflight).mock.calls[0] ?? [];
    expect(url).toBe('https://api.example.com/v1/me');
    expect(init?.method).toBe('OPTIONS');
    const headers = new Headers(init?.headers);
    expect(headers.get('Origin')).toBe('https://localhost');
    expect(headers.get('Access-Control-Request-Method')).toBe('PATCH');
    expect(headers.get('Access-Control-Request-Headers')).toBe('authorization,content-type');
  });

  it('fails when the preflight is rejected, even with CORS headers', async () => {
    await expect(
      checkPreflight('https://api.example.com', respondWith(401, ALLOWED)),
    ).resolves.toEqual({ passed: false, reason: 'Browser preflight returned HTTP 401' });
  });

  it('fails when the app’s origin is not allowed', async () => {
    await expect(checkPreflight('https://api.example.com', respondWith(204))).resolves.toEqual({
      passed: false,
      reason: 'Browser preflight did not allow https://localhost',
    });
  });

  it('fails when the request fails', async () => {
    const failingFetch = vi.fn<typeof fetch>(() => Promise.reject(new Error('ECONNRESET')));
    await expect(checkPreflight('https://api.example.com', failingFetch)).resolves.toEqual({
      passed: false,
      reason: 'Browser preflight request failed: ECONNRESET',
    });
  });

  it('gives up after the timeout', async () => {
    const neverAnswers = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation timed out', 'TimeoutError'));
          });
        }),
    );
    await expect(checkPreflight('https://api.example.com', neverAnswers, 20)).resolves.toEqual({
      passed: false,
      reason: 'Browser preflight timed out after 20 ms',
    });
  });
});
