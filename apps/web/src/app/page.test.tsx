import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { ApiClient } from '@/lib/api/api-client';
import { ApiProvider } from '@/lib/api/api-provider';
import { AccountAuthProvider } from '@/lib/auth/account-auth-provider';
import { stubAccountAuth } from '@/test/account-auth-stub';
import HomePage from './page';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

const NO_CALLS: ApiClient = { request: () => Promise.reject(new Error('not called')) };

function renderStart(isSignedIn: boolean): void {
  render(
    <AccountAuthProvider auth={stubAccountAuth({ isSignedIn: () => Promise.resolve(isSignedIn) })}>
      <ApiProvider client={NO_CALLS} onSignedOut={vi.fn()}>
        <HomePage />
      </ApiProvider>
    </AccountAuthProvider>,
  );
}

describe('HomePage', () => {
  it('has no accessibility violations while it decides', async () => {
    renderStart(false);
    expect(await axe(document.body)).toHaveNoViolations();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('sends someone signed out to Welcome', async () => {
    renderStart(false);
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/welcome');
    });
  });
});
