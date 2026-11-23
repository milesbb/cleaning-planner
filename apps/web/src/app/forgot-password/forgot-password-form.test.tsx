import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AccountAuthError } from '@/lib/auth/account-auth';
import { forgetPendingEmail, pendingEmail } from '@/lib/auth/pending-email';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { ForgotPasswordForm } from './forgot-password-form';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

afterEach(() => {
  vi.clearAllMocks();
  forgetPendingEmail();
});

async function requestCode(email: string): Promise<void> {
  if (email !== '') await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Email me a code' }));
}

describe('ForgotPasswordForm', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<ForgotPasswordForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('never promises that the email has an account', () => {
    renderWithAuth(<ForgotPasswordForm />);
    expect(
      screen.getByText(/If there’s an account for this email, the code arrives/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
  });

  it('asks for a code and moves on to setting the new password', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<ForgotPasswordForm />, auth);
    await requestCode('sam@example.com ');
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('sam@example.com');
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/forgot-password/reset');
    });
    expect(pendingEmail()).toBe('sam@example.com');
  });

  it('checks the email first', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<ForgotPasswordForm />, auth);
    await requestCode('sam');
    expect(screen.getByText('Enter an email address like name@example.com')).toBeInTheDocument();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('asks calmly to wait after too many requests', async () => {
    const auth = stubAccountAuth({
      requestPasswordReset: vi.fn(() => Promise.reject(new AccountAuthError('tooManyAttempts'))),
    });
    renderWithAuth(<ForgotPasswordForm />, auth);
    await requestCode('sam@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many tries for now.');
  });
});
