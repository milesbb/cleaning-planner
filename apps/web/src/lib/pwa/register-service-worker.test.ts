import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './register-service-worker';
import type { ServiceWorkerHost } from './register-service-worker';

function hostWith(register: ServiceWorkerHost['register']): ServiceWorkerHost {
  return { register: vi.fn(register) };
}

describe('registerServiceWorker', () => {
  it('registers the service worker for the whole site', async () => {
    const host = hostWith(() => Promise.resolve());
    await expect(registerServiceWorker(host, true)).resolves.toBe('registered');
    expect(host.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('leaves the development server alone, so its pages are never cached', async () => {
    const host = hostWith(() => Promise.resolve());
    await expect(registerServiceWorker(host, false)).resolves.toBe('off');
    expect(host.register).not.toHaveBeenCalled();
  });

  it('does nothing in a browser without service workers', async () => {
    await expect(registerServiceWorker(undefined, true)).resolves.toBe('unsupported');
  });

  it('reports a failed registration instead of throwing', async () => {
    const host = hostWith(() => Promise.reject(new DOMException('Blocked', 'SecurityError')));
    await expect(registerServiceWorker(host, true)).resolves.toBe('failed');
  });
});
