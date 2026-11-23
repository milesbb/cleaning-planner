import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AccountAuthError } from '@/lib/auth/account-auth-error';
import { forgetPendingEmail, pendingEmail } from '@/lib/auth/pending-email';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { SignUpForm } from './sign-up-form';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

afterEach(() => {
  vi.clearAllMocks();
  forgetPendingEmail();
});

async function fillIn(name: string, email: string, password: string): Promise<void> {
  if (name !== '') await userEvent.type(screen.getByLabelText('Your name'), name);
  if (email !== '') await userEvent.type(screen.getByLabelText('Email'), email);
  if (password !== '') await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('SignUpForm', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<SignUpForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('asks for a name, an email and a new password that managers can save', () => {
    renderWithAuth(<SignUpForm />);
    expect(screen.getByLabelText('Your name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/sign-in');
  });

  it('creates the account, remembers the email and asks for the code', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<SignUpForm />, auth);
    await fillIn('Sam', ' sam@example.com ', 'lemon kettle sunday');
    expect(auth.signUp).toHaveBeenCalledWith({
      name: 'Sam',
      email: 'sam@example.com',
      password: 'lemon kettle sunday',
    });
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/verify');
    });
    expect(pendingEmail()).toBe('sam@example.com');
  });

  it('checks every field before sending anything', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<SignUpForm />, auth);
    await fillIn('', 'sam@', 'short');
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter an email address like name@example.com')).toBeInTheDocument();
    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveFocus();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('says when the email already has an account', async () => {
    const auth = stubAccountAuth({
      signUp: vi.fn(() => Promise.reject(new AccountAuthError('emailTaken'))),
    });
    renderWithAuth(<SignUpForm />, auth);
    await fillIn('Sam', 'sam@example.com', 'lemon kettle sunday');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There’s already an account for this email.',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('puts a password Cognito rejects on the password field', async () => {
    const auth = stubAccountAuth({
      signUp: vi.fn(() => Promise.reject(new AccountAuthError('weakPassword'))),
    });
    renderWithAuth(<SignUpForm />, auth);
    await fillIn('Sam', 'sam@example.com', 'lemon kettle sunday');
    expect(await screen.findByText('Use at least 12 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows that it is working and cannot be sent twice', async () => {
    const auth = stubAccountAuth({ signUp: vi.fn(() => new Promise<void>(() => undefined)) });
    renderWithAuth(<SignUpForm />, auth);
    await fillIn('Sam', 'sam@example.com', 'lemon kettle sunday');
    expect(screen.getByRole('button', { name: 'Creating your account…' })).toBeDisabled();
  });
});
