import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { forgetJustCreatedHome, rememberJustCreatedHome } from '@/lib/setup/just-created-home';
import SetupDonePage from './page';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): object => router }));

const signedIn = stubAccountAuth({ mightBeSignedIn: () => true });

function openJustAfterCreatingAHome(): void {
  rememberJustCreatedHome();
  renderWithAuth(<SetupDonePage />, signedIn);
}

afterEach(() => {
  forgetJustCreatedHome();
  router.replace.mockClear();
});

describe('Setup: done', () => {
  it('has no accessibility violations', async () => {
    rememberJustCreatedHome();
    const { container } = renderWithAuth(<SetupDonePage />, signedIn);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says the home is ready and explains how the app works', () => {
    openJustAfterCreatingAHome();
    expect(screen.getByRole('heading', { level: 1, name: 'You’re all set' })).toBeInTheDocument();
    expect(screen.getByText(/find this again any time under Help/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Today' })).toBeInTheDocument();
  });

  it('goes on to Today', () => {
    openJustAfterCreatingAHome();
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/today');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sends anyone who hasn’t just created a home to Today instead', () => {
    renderWithAuth(<SetupDonePage />, signedIn);
    expect(screen.queryByRole('heading', { name: 'You’re all set' })).not.toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith('/today');
  });
});
