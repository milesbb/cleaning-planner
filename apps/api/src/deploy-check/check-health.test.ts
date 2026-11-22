import { describe, expect, it, vi } from 'vitest';
import { checkHealth } from './check-health';

function respondWith(body: string, status = 200): typeof fetch {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(body, { status })));
}

const healthyBody = JSON.stringify({ status: 'ok', version: 'abc123' });

describe('checkHealth', () => {
  it('is healthy when /v1/health answers ok, and reports the deployed version', async () => {
    await expect(checkHealth('https://api.example.com', respondWith(healthyBody))).resolves.toEqual(
      {
        healthy: true,
        version: 'abc123',
      },
    );
  });

  it.each(['https://api.example.com', 'https://api.example.com/'])(
    'calls /v1/health on %s',
    async (baseUrl) => {
      const fetchHealth = respondWith(healthyBody);
      await checkHealth(baseUrl, fetchHealth);
      expect(vi.mocked(fetchHealth).mock.calls[0]?.[0]).toBe('https://api.example.com/v1/health');
    },
  );

  it('is unhealthy on an error status', async () => {
    await expect(checkHealth('https://api.example.com', respondWith('', 503))).resolves.toEqual({
      healthy: false,
      reason: 'Health check returned HTTP 503',
    });
  });

  it('is unhealthy when the body is not JSON', async () => {
    await expect(
      checkHealth('https://api.example.com', respondWith('<html>gateway</html>')),
    ).resolves.toEqual({ healthy: false, reason: 'Health check did not return JSON' });
  });

  it('is unhealthy when the body does not say ok', async () => {
    await expect(
      checkHealth('https://api.example.com', respondWith(JSON.stringify({ status: 'starting' }))),
    ).resolves.toEqual({ healthy: false, reason: 'Health check did not say status "ok"' });
  });

  it('is unhealthy when the request fails', async () => {
    const failingFetch = vi.fn<typeof fetch>(() =>
      Promise.reject(new Error('getaddrinfo ENOTFOUND')),
    );
    await expect(checkHealth('https://api.example.com', failingFetch)).resolves.toEqual({
      healthy: false,
      reason: 'Health check request failed: getaddrinfo ENOTFOUND',
    });
  });

  it('gives up after the timeout', async () => {
    const neverAnswers = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation timed out.', 'TimeoutError'));
          });
        }),
    );
    await expect(checkHealth('https://api.example.com', neverAnswers, 20)).resolves.toEqual({
      healthy: false,
      reason: 'Health check timed out after 20 ms',
    });
  });
});
