import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import SignInPage from './page';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): object => router }));

beforeEach(() => {
  router.replace.mockClear();
});

describe('Log in', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<SignInPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('asks someone signed out to log in', () => {
    renderWithAuth(<SignInPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sends someone already signed in to the page they were going to', async () => {
    window.history.replaceState(null, '', `/sign-in?next=${encodeURIComponent('/week')}`);
    renderWithAuth(
      <SignInPage />,
      stubAccountAuth({ mightBeSignedIn: () => true, isSignedIn: () => Promise.resolve(true) }),
    );
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/week');
    });
  });
});
