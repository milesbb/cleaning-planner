import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import WelcomePage from './page';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): object => router }));

describe('Welcome', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<WelcomePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says what the app is for and offers both ways in', () => {
    renderWithAuth(<WelcomePage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Know what needs cleaning, and when.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/sign-in');
  });

  it('sends someone who is already signed in on to their homes', async () => {
    window.history.replaceState(null, '', '/welcome');
    renderWithAuth(
      <WelcomePage />,
      stubAccountAuth({ mightBeSignedIn: () => true, isSignedIn: () => Promise.resolve(true) }),
    );
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });
});
