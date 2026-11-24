import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import HelpPage from './page';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): object => router }));

const signedIn = stubAccountAuth({ mightBeSignedIn: () => true });

beforeEach(() => {
  router.replace.mockClear();
  window.history.replaceState(null, '', '/help');
});

describe('Help', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<HelpPage />, signedIn);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is its own tab in the main menu, explaining how the app works', () => {
    renderWithAuth(<HelpPage />, signedIn);
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 2, name: 'Today' })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('asks someone signed out to log in first, then comes back', () => {
    renderWithAuth(<HelpPage />);
    expect(router.replace).toHaveBeenCalledWith(`/sign-in?next=${encodeURIComponent('/help')}`);
  });
});
