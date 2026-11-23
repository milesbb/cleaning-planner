import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import type { AccountAuth } from '@/lib/auth/account-auth';
import { AccountAuthError } from '@/lib/auth/account-auth-error';
import { stubAccountAuth } from '@/test/account-auth-stub';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { homeAnswers } from '@/test/fake-home-answers';
import { ChangeEmailScreen } from './change-email-screen';

vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: (): string => '/settings/account/email',
}));

const PICK_UP_EMAIL = 'POST /v1/me/email';
const NEW_EMAIL = 'alex@new.example';

function withNewEmail(): FakeAnswers {
  return {
    ...homeAnswers(),
    [PICK_UP_EMAIL]: () =>
      Promise.resolve({ id: 'user-alex', name: 'Alex', email: NEW_EMAIL, colour: 'pink' }),
  };
}

function signedIn(overrides: Partial<AccountAuth> = {}): AccountAuth {
  return stubAccountAuth({ isSignedIn: () => Promise.resolve(true), ...overrides });
}

function openChangeEmail(auth: AccountAuth = signedIn(), answers = withNewEmail()): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<ChangeEmailScreen />, client, auth);
  return client;
}

async function askForCode(email = NEW_EMAIL): Promise<void> {
  await userEvent.type(await screen.findByLabelText('New email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
}

async function enterCode(code = '123456'): Promise<void> {
  await userEvent.click(await screen.findByRole('textbox', { name: 'Digit 1 of 6' }));
  await userEvent.keyboard(code);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ChangeEmailScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<ChangeEmailScreen />, clientAnswering(withNewEmail()));
    await screen.findByLabelText('New email');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations while it waits for the code', async () => {
    const { container } = renderWithApi(
      <ChangeEmailScreen />,
      clientAnswering(withNewEmail()),
      signedIn(),
    );
    await askForCode();
    await screen.findByText(/We’ve sent a 6-digit code to alex@new.example/);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting your account while it loads', () => {
    openChangeEmail(signedIn(), { ...withNewEmail(), 'GET /v1/me': () => new Promise(() => {}) });
    expect(screen.getByRole('status')).toHaveTextContent('Getting your account');
  });

  it('explains when your account cannot be loaded', async () => {
    openChangeEmail(signedIn(), {
      ...withNewEmail(),
      'GET /v1/me': () => Promise.reject(new ApiRequestError('rejected', 'Your account is busy')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Your account is busy');
  });

  it('shows the email you use now', async () => {
    openChangeEmail();
    expect(await screen.findByText(/You log in with alex@example.com/)).toBeInTheDocument();
  });

  it('sends a code to the new email, then saves it once the code is confirmed', async () => {
    const auth = signedIn();
    const client = openChangeEmail(auth);
    await askForCode();
    expect(auth.requestEmailChange).toHaveBeenCalledWith(NEW_EMAIL);
    await enterCode();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your email is now alex@new.example.',
    );
    expect(auth.confirmEmailChange).toHaveBeenCalledWith('123456');
    expect(client.calls).toContain(PICK_UP_EMAIL);
    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute('href', '/settings/account');
  });

  it('saves the new email straight away when no code is needed', async () => {
    const client = openChangeEmail(
      signedIn({ requestEmailChange: vi.fn(() => Promise.resolve('changed' as const)) }),
    );
    await askForCode();
    expect(await screen.findByRole('status')).toHaveTextContent('Your email is now');
    expect(client.calls).toContain(PICK_UP_EMAIL);
  });

  it('checks the new email before sending anything', async () => {
    const auth = signedIn();
    openChangeEmail(auth);
    await askForCode('not an email');
    expect(screen.getByLabelText('New email')).toHaveAccessibleDescription(
      /Enter an email address/,
    );
    await userEvent.clear(screen.getByLabelText('New email'));
    await askForCode('Alex@Example.com');
    expect(screen.getByLabelText('New email')).toHaveAccessibleDescription(
      /That’s already your email/,
    );
    expect(auth.requestEmailChange).not.toHaveBeenCalled();
  });

  it('says when another account already uses the new email', async () => {
    openChangeEmail(
      signedIn({
        requestEmailChange: vi.fn(() => Promise.reject(new AccountAuthError('emailInUse'))),
      }),
    );
    await askForCode();
    await waitFor(() => {
      expect(screen.getByLabelText('New email')).toHaveAccessibleDescription(
        /Another account already uses that email/,
      );
    });
  });

  it('says when the code is wrong, and keeps waiting for the right one', async () => {
    openChangeEmail(
      signedIn({
        confirmEmailChange: vi.fn(() => Promise.reject(new AccountAuthError('wrongCode'))),
      }),
    );
    await askForCode();
    await enterCode('000000');
    expect(await screen.findByText('That code doesn’t match. Check the email and try again.'));
    expect(screen.getByRole('button', { name: 'Confirm email' })).toBeEnabled();
  });

  it('sends a new code', async () => {
    const auth = signedIn();
    openChangeEmail(auth);
    await askForCode();
    await userEvent.click(await screen.findByRole('button', { name: 'Send a new code' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'We’ve sent a new code to alex@new.example.',
    );
    expect(auth.resendEmailChangeCode).toHaveBeenCalled();
  });

  it('goes back to choose a different email', async () => {
    openChangeEmail();
    await askForCode();
    await userEvent.click(await screen.findByRole('button', { name: 'Use a different email' }));
    expect(screen.getByLabelText('New email')).toHaveValue(NEW_EMAIL);
  });

  it('offers to try saving again when the confirmed email can’t be saved', async () => {
    const pickUp = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new ApiRequestError('offline', 'Can’t reach Cleaning Planner'))
      .mockResolvedValue({ id: 'user-alex', name: 'Alex', email: NEW_EMAIL, colour: 'pink' });
    openChangeEmail(signedIn(), { ...withNewEmail(), [PICK_UP_EMAIL]: pickUp });
    await askForCode();
    await enterCode();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your new email is confirmed, but we couldn’t finish saving it',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your email is now');
  });
});
