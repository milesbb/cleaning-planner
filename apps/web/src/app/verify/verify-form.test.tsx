import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { AccountAuthError } from '@/lib/auth/account-auth';
import { forgetPendingEmail, pendingEmail, rememberPendingEmail } from '@/lib/auth/pending-email';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { VerifyForm } from './verify-form';
import { VerifyHeading } from './verify-heading';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

beforeEach(() => {
  rememberPendingEmail('sam@example.com');
});

afterEach(() => {
  vi.clearAllMocks();
  forgetPendingEmail();
});

async function typeCode(code: string): Promise<void> {
  await userEvent.click(screen.getByRole('textbox', { name: 'Digit 1 of 6' }));
  await userEvent.keyboard(code);
}

describe('VerifyForm', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<VerifyForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says where the code went', () => {
    renderWithAuth(
      <>
        <VerifyHeading />
        <VerifyForm />
      </>,
    );
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('confirms as soon as all six digits are in, then starts the app', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<VerifyForm />, auth);
    await typeCode('482913');
    expect(auth.confirmSignUp).toHaveBeenCalledWith('sam@example.com', '482913');
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/');
    });
    expect(pendingEmail()).toBeNull();
  });

  it('sends people to log in when they are not signed in automatically', async () => {
    const auth = stubAccountAuth({ confirmSignUp: vi.fn(() => Promise.resolve('logIn' as const)) });
    renderWithAuth(<VerifyForm />, auth);
    await typeCode('482913');
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/sign-in');
    });
  });

  it('asks for every digit before Continue sends anything', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<VerifyForm />, auth);
    await typeCode('48');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Enter all 6 digits of the code')).toBeInTheDocument();
    expect(auth.confirmSignUp).not.toHaveBeenCalled();
  });

  it.each([
    ['wrongCode', 'That code doesn’t match. Check the email and try again.'],
    ['expiredCode', 'That code has expired. Send a new code and try again.'],
  ] as const)('shows a %s error on the code', async (kind, message) => {
    const auth = stubAccountAuth({
      confirmSignUp: vi.fn(() => Promise.reject(new AccountAuthError(kind))),
    });
    renderWithAuth(<VerifyForm />, auth);
    await typeCode('000000');
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('explains when the email was already confirmed', async () => {
    const auth = stubAccountAuth({
      confirmSignUp: vi.fn(() => Promise.reject(new AccountAuthError('wrongDetails'))),
    });
    renderWithAuth(<VerifyForm />, auth);
    await typeCode('482913');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This email is already confirmed. Log in to carry on.',
    );
  });

  it('sends a new code and says so', async () => {
    const auth = stubAccountAuth();
    renderWithAuth(<VerifyForm />, auth);
    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(auth.resendSignUpCode).toHaveBeenCalledWith('sam@example.com');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'We’ve sent a new code to sam@example.com.',
    );
  });

  it('offers a way back to use another email', () => {
    renderWithAuth(<VerifyForm />);
    expect(screen.getByRole('link', { name: 'Use another email' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  it('asks for the email when this tab does not know it', async () => {
    forgetPendingEmail();
    const auth = stubAccountAuth();
    renderWithAuth(
      <>
        <VerifyHeading />
        <VerifyForm />
      </>,
      auth,
    );
    expect(screen.getByText(/Enter your email and the 6-digit code/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'sam@example.com');
    await typeCode('482913');
    expect(auth.confirmSignUp).toHaveBeenCalledWith('sam@example.com', '482913');
  });

  it('checks that email before sending a new code', async () => {
    forgetPendingEmail();
    const auth = stubAccountAuth();
    renderWithAuth(<VerifyForm />, auth);
    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    expect(screen.getByText('Enter an email address like name@example.com')).toBeInTheDocument();
    expect(auth.resendSignUpCode).not.toHaveBeenCalled();
  });
});
