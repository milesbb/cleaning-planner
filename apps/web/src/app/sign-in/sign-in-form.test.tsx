import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AccountAuthError } from '@/lib/auth/account-auth';
import { forgetPendingEmail, pendingEmail } from '@/lib/auth/pending-email';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { SignInForm } from './sign-in-form';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

afterEach(() => {
  vi.clearAllMocks();
  forgetPendingEmail();
  window.history.replaceState(null, '', '/');
});

async function logIn(email: string, password: string): Promise<void> {
  if (email !== '') await userEvent.type(screen.getByLabelText('Email'), email);
  if (password !== '') await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('SignInForm', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<SignInForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('works with password managers and links to the other ways in', () => {
    renderWithAuth(<SignInForm />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  it('logs in and starts the app', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<SignInForm />, auth);
    await logIn(' sam@example.com ', 'lemon kettle sunday');
    expect(auth.signIn).toHaveBeenCalledWith('sam@example.com', 'lemon kettle sunday');
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });

  it('goes back to the page that asked for a log in', async () => {
    window.history.replaceState(null, '', '/sign-in?next=%2Fweek');
    renderWithAuth(<SignInForm />);
    await logIn('sam@example.com', 'lemon kettle sunday');
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/week');
    });
  });

  it('never follows a return address to another site', async () => {
    window.history.replaceState(null, '', '/sign-in?next=%2F%2Fevil.example');
    renderWithAuth(<SignInForm />);
    await logIn('sam@example.com', 'lemon kettle sunday');
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
  });

  it('sends someone who never confirmed their email to get a new code', async () => {
    const auth = stubAccountAuth({ signIn: vi.fn(() => Promise.resolve('confirmEmail' as const)) });
    renderWithAuth(<SignInForm />, auth);
    await logIn('sam@example.com', 'lemon kettle sunday');
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/verify');
    });
    expect(auth.resendSignUpCode).toHaveBeenCalledWith('sam@example.com');
    expect(pendingEmail()).toBe('sam@example.com');
  });

  it('checks both fields before sending anything', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<SignInForm />, auth);
    await logIn('', '');
    expect(screen.getByText('Enter an email address like name@example.com')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it.each([
    [
      'wrongDetails',
      'That email and password don’t match. Check for typos, or reset your password.',
    ],
    ['tooManyAttempts', 'Too many tries for now. Wait a few minutes, then try again.'],
  ] as const)('shows the %s message', async (kind, message) => {
    const auth = stubAccountAuth({
      signIn: vi.fn(() => Promise.reject(new AccountAuthError(kind))),
    });
    renderWithAuth(<SignInForm />, auth);
    await logIn('sam@example.com', 'wrong password');
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
