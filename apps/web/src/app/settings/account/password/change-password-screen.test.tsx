import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { AccountAuthError } from '@/lib/auth/account-auth-error';
import type { AccountAuth } from '@/lib/auth/account-auth';
import { stubAccountAuth } from '@/test/account-auth-stub';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import { homeAnswers } from '@/test/fake-home-answers';
import { ChangePasswordScreen } from './change-password-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/settings/account/password',
}));

function authWith(overrides: Partial<AccountAuth> = {}): AccountAuth {
  return stubAccountAuth({ isSignedIn: () => Promise.resolve(true), ...overrides });
}

function openChangePassword(auth: AccountAuth = authWith()): void {
  renderWithApi(<ChangePasswordScreen />, clientAnswering(homeAnswers()), auth);
}

async function fillIn(current: string, next: string): Promise<void> {
  await userEvent.type(await screen.findByLabelText('Current password'), current);
  await userEvent.type(screen.getByLabelText('New password'), next);
}

async function submit(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ChangePasswordScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(
      <ChangePasswordScreen />,
      clientAnswering(homeAnswers()),
      authWith(),
    );
    await screen.findByLabelText('Current password');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting your account while it loads', () => {
    renderWithApi(
      <ChangePasswordScreen />,
      clientAnswering({ ...homeAnswers(), 'GET /v1/me': () => new Promise(() => undefined) }),
      authWith(),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Getting your account');
  });

  it('changes the password and logs out other devices by default', async () => {
    const auth = authWith();
    openChangePassword(auth);
    await fillIn('lemon kettle sunday', 'window pepper gate');
    expect(screen.getByRole('switch', { name: /Log out on my other devices/ })).toBeChecked();
    await submit();
    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been changed.');
    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute('href', '/settings');
    expect(auth.changePassword).toHaveBeenCalledWith({
      email: 'alex@example.com',
      currentPassword: 'lemon kettle sunday',
      newPassword: 'window pepper gate',
      signOutOtherDevices: true,
    });
  });

  it('can keep other devices logged in', async () => {
    const auth = authWith();
    openChangePassword(auth);
    await fillIn('lemon kettle sunday', 'window pepper gate');
    await userEvent.click(screen.getByRole('switch', { name: /Log out on my other devices/ }));
    await submit();
    await screen.findByText('Your password has been changed.');
    expect(auth.changePassword).toHaveBeenCalledWith(
      expect.objectContaining({ signOutOtherDevices: false }),
    );
  });

  it('asks to log in again when this device was logged out too', async () => {
    openChangePassword(
      authWith({ changePassword: vi.fn(() => Promise.resolve('logIn' as const)) }),
    );
    await fillIn('lemon kettle sunday', 'window pepper gate');
    await submit();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/sign-in?next=%2Fsettings');
    });
  });

  it('checks both passwords before asking Cognito', async () => {
    const auth = authWith();
    openChangePassword(auth);
    await userEvent.type(await screen.findByLabelText('New password'), 'too short');
    await submit();
    expect(screen.getByLabelText('Current password')).toHaveAccessibleDescription(
      /Enter your password/,
    );
    expect(screen.getByLabelText('New password')).toHaveAccessibleDescription(
      /Use at least 12 characters/,
    );
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('says when the current password is wrong', async () => {
    openChangePassword(
      authWith({
        changePassword: vi.fn(() => Promise.reject(new AccountAuthError('wrongCurrentPassword'))),
      }),
    );
    await fillIn('wrong password here', 'window pepper gate');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('That isn’t your current password.');
  });

  it('offers to reset a forgotten password', async () => {
    openChangePassword();
    expect(
      await screen.findByRole('link', { name: 'Forgot your current password?' }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('explains when your account cannot be loaded', async () => {
    renderWithApi(
      <ChangePasswordScreen />,
      clientAnswering({
        ...homeAnswers(),
        'GET /v1/me': () => Promise.reject(new ApiRequestError('rejected', 'Sign in again')),
      }),
      authWith(),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in again');
  });
});
