import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useServiceWorker } from './use-service-worker';

const register = vi.fn(() => Promise.resolve());

function giveBrowserServiceWorkers(): void {
  Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
}

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, 'serviceWorker');
  register.mockClear();
});

describe('useServiceWorker', () => {
  it('registers the service worker once the built site opens', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    giveBrowserServiceWorkers();
    renderHook(() => {
      useServiceWorker();
    });
    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    });
  });

  it('stays off outside the built site', () => {
    giveBrowserServiceWorkers();
    renderHook(() => {
      useServiceWorker();
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('copes with a browser that has no service workers', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() =>
      renderHook(() => {
        useServiceWorker();
      }),
    ).not.toThrow();
  });
});
