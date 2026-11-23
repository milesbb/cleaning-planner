import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { ApiClient } from '@/lib/api/api-client';
import { ApiProvider } from '@/lib/api/api-provider';
import { AccountAuthProvider } from '@/lib/auth/account-auth-provider';
import { stubAccountAuth } from '@/test/account-auth-stub';
import HomePage from './page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

const NO_CALLS: ApiClient = { request: () => Promise.reject(new Error('not called')) };

function renderStart(isSignedIn: boolean, mightBeSignedIn = isSignedIn): void {
  const auth = stubAccountAuth({
    isSignedIn: () => Promise.resolve(isSignedIn),
    mightBeSignedIn: () => mightBeSignedIn,
  });
  render(
    <AccountAuthProvider auth={auth}>
      <ApiProvider client={NO_CALLS} onSignedOut={vi.fn()}>
        <HomePage />
      </ApiProvider>
    </AccountAuthProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('has no accessibility violations', async () => {
    renderStart(false);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('shows Welcome at once to anyone with no session, without asking Cognito', () => {
    renderStart(false);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Know what needs cleaning, and when.' }),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('checks a stored session, and sends someone whose session ended to Welcome', async () => {
    renderStart(false, true);
    expect(screen.getByRole('status')).toHaveTextContent('Getting your homes ready');
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/welcome');
    });
  });
});
