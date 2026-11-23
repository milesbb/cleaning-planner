import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AccountAuthError } from '@/lib/auth/account-auth-error';
import { forgetPendingEmail, pendingEmail, rememberPendingEmail } from '@/lib/auth/pending-email';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { ResetPasswordForm } from './reset-password-form';
import { ResetPasswordHeading } from './reset-password-heading';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

beforeEach(() => {
  rememberPendingEmail('sam@example.com');
});

afterEach(() => {
  vi.clearAllMocks();
  forgetPendingEmail();
});

async function reset(code: string, password: string): Promise<void> {
  await userEvent.click(screen.getByRole('textbox', { name: 'Digit 1 of 6' }));
  await userEvent.keyboard(code);
  if (password !== '') await userEvent.type(screen.getByLabelText('New password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Save and log in' }));
}

describe('ResetPasswordForm', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(
      <>
        <ResetPasswordHeading />
        <ResetPasswordForm />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says where the code went and offers the new password to managers', () => {
    renderWithAuth(
      <>
        <ResetPasswordHeading />
        <ResetPasswordForm />
      </>,
    );
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('sets the new password, logs in and starts the app', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<ResetPasswordForm />, auth);
    await reset('719042', 'window pepper gate');
    expect(auth.resetPassword).toHaveBeenCalledWith({
      email: 'sam@example.com',
      code: '719042',
      newPassword: 'window pepper gate',
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
    expect(pendingEmail()).toBeNull();
  });

  it('checks the code and the password first', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<ResetPasswordForm />, auth);
    await reset('71', 'short');
    expect(screen.getByText('Enter all 6 digits of the code')).toBeInTheDocument();
    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument();
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['wrongCode', 'That code doesn’t match. Check the email and try again.'],
    ['expiredCode', 'That code has expired. Send a new code and try again.'],
  ] as const)('shows a %s error on the code', async (kind, message) => {
    const auth = stubAccountAuth({
      resetPassword: vi.fn(() => Promise.reject(new AccountAuthError(kind))),
    });
    renderWithAuth(<ResetPasswordForm />, auth);
    await reset('000000', 'window pepper gate');
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('puts a password Cognito rejects on the password field', async () => {
    const auth = stubAccountAuth({
      resetPassword: vi.fn(() => Promise.reject(new AccountAuthError('weakPassword'))),
    });
    renderWithAuth(<ResetPasswordForm />, auth);
    await reset('719042', 'window pepper gate');
    expect(await screen.findByText('Use at least 12 characters.')).toBeInTheDocument();
  });

  it('sends a new code', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<ResetPasswordForm />, auth);
    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('sam@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'We’ve sent a new code to sam@example.com.',
    );
  });

  it('asks for the email when this tab does not know it', async () => {
    forgetPendingEmail();
    const auth = stubAccountAuth();
    renderWithAuth(<ResetPasswordForm />, auth);
    await userEvent.type(screen.getByLabelText('Email'), 'sam@example.com');
    await reset('719042', 'window pepper gate');
    expect(auth.resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sam@example.com' }),
    );
  });
});
