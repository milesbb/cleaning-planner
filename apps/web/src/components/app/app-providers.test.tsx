import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { NO_CONTENT } from '@/lib/api/api-client';
import type { ApiClient } from '@/lib/api/api-client';
import { useApiClient } from '@/lib/api/api-provider';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { AppProviders } from './app-providers';

vi.mock('next/navigation', () => ({
  useRouter: (): { replace: () => void; push: () => void } => ({ replace: vi.fn(), push: vi.fn() }),
}));

function CaptureClient({ onClient }: { onClient: (client: ApiClient) => void }): ReactNode {
  onClient(useApiClient());
  return null;
}

function UsesBoth(): ReactNode {
  const auth = useAccountAuth();
  const client = useApiClient();
  return (
    <p>
      {typeof auth.signIn === 'function' && typeof client.request === 'function'
        ? 'ready'
        : 'missing'}
    </p>
  );
}

describe('AppProviders', () => {
  it('gives every screen the account auth and the API client', () => {
    render(
      <AppProviders>
        <UsesBoth />
      </AppProviders>,
    );
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('refuses to use the auth outside the providers', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<UsesBoth />)).toThrow(
      'useAccountAuth needs an AccountAuthProvider above it',
    );
  });

  it('answers API calls with a calm error when no API address was built in', async () => {
    const onClient = vi.fn<(client: ApiClient) => void>();
    render(
      <AppProviders>
        <CaptureClient onClient={onClient} />
      </AppProviders>,
    );
    const client = onClient.mock.calls[0]?.[0];
    await expect(
      client?.request({ method: 'GET', path: '/v1/me', response: NO_CONTENT }),
    ).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('sets up the service worker on the built site, for offline start and reminders', async () => {
    const register = vi.fn(() => Promise.resolve());
    vi.stubEnv('NODE_ENV', 'production');
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    render(<AppProviders>{null}</AppProviders>);
    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    });
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });
});
