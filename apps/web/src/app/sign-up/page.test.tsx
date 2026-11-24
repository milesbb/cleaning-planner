import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import SignUpPage from './page';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): object => router }));

describe('Create an account', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<SignUpPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends someone already signed in on to their homes instead', async () => {
    window.history.replaceState(null, '', '/sign-up');
    renderWithAuth(
      <SignUpPage />,
      stubAccountAuth({ mightBeSignedIn: () => true, isSignedIn: () => Promise.resolve(true) }),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });
});
