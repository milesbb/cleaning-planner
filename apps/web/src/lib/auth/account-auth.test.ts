import { describe, expect, it, vi } from 'vitest';
import { AccountAuthError, createAccountAuth } from './account-auth';
import type { CognitoFunctions } from './account-auth';

function cognitoError(name: string, message = name): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function stubCognito(overrides: Partial<CognitoFunctions> = {}): CognitoFunctions {
  return {
    signUp: vi.fn(() =>
      Promise.resolve({ isSignUpComplete: false, nextStep: { signUpStep: 'CONFIRM_SIGN_UP' } }),
    ),
    confirmSignUp: vi.fn(() =>
      Promise.resolve({ isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } }),
    ),
    resendSignUpCode: vi.fn(() => Promise.resolve({})),
    signIn: vi.fn(() => Promise.resolve({ isSignedIn: true, nextStep: { signInStep: 'DONE' } })),
    resetPassword: vi.fn(() => Promise.resolve({})),
    confirmResetPassword: vi.fn(() => Promise.resolve()),
    fetchAuthSession: vi.fn(() => Promise.resolve({ tokens: { accessToken: {} } })),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

async function failureOf(promise: Promise<unknown>): Promise<AccountAuthError> {
  const outcome: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  if (outcome instanceof AccountAuthError) return outcome;
  throw new Error('Expected an AccountAuthError');
}

const SAM = { name: 'Sam', email: 'sam@example.com', password: 'lemon kettle sunday' };

describe('signing up', () => {
  it('creates the account with the email as the username and the name as an attribute', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).signUp(SAM);
    expect(cognito.signUp).toHaveBeenCalledWith({
      username: 'sam@example.com',
      password: 'lemon kettle sunday',
      options: { userAttributes: { email: 'sam@example.com', name: 'Sam' } },
    });
  });

  it('says when the email already has an account', async () => {
    const cognito = stubCognito({
      signUp: vi.fn(() => Promise.reject(cognitoError('UsernameExistsException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).signUp(SAM));
    expect(failure.kind).toBe('emailTaken');
    expect(failure.message).toBe(
      'There’s already an account for this email. Log in, or reset your password if you’ve forgotten it.',
    );
  });

  it('says when the password is too short', async () => {
    const cognito = stubCognito({
      signUp: vi.fn(() => Promise.reject(cognitoError('InvalidPasswordException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).signUp(SAM));
    expect(failure).toMatchObject({ kind: 'weakPassword', message: 'Use at least 12 characters.' });
  });
});

describe('confirming the email', () => {
  it('confirms the code, then signs in with the password just chosen', async () => {
    const cognito = stubCognito();
    const auth = createAccountAuth(cognito);
    await auth.signUp(SAM);
    await expect(auth.confirmSignUp('sam@example.com', '123456')).resolves.toBe('signedIn');
    expect(cognito.confirmSignUp).toHaveBeenCalledWith({
      username: 'sam@example.com',
      confirmationCode: '123456',
    });
    expect(cognito.signIn).toHaveBeenCalledWith({
      username: 'sam@example.com',
      password: 'lemon kettle sunday',
    });
  });

  it('signs in after confirming when the code was asked for at log in', async () => {
    const cognito = stubCognito({
      signIn: vi
        .fn<CognitoFunctions['signIn']>()
        .mockResolvedValueOnce({ nextStep: { signInStep: 'CONFIRM_SIGN_UP' } })
        .mockResolvedValue({ nextStep: { signInStep: 'DONE' } }),
    });
    const auth = createAccountAuth(cognito);
    await auth.signIn('sam@example.com', 'lemon kettle sunday');
    await expect(auth.confirmSignUp('sam@example.com', '123456')).resolves.toBe('signedIn');
    expect(cognito.signIn).toHaveBeenCalledTimes(2);
  });

  it('forgets the password once it has been used', async () => {
    const cognito = stubCognito();
    const auth = createAccountAuth(cognito);
    await auth.signUp(SAM);
    await auth.confirmSignUp('sam@example.com', '123456');
    await expect(auth.confirmSignUp('sam@example.com', '123456')).resolves.toBe('logIn');
    expect(cognito.signIn).toHaveBeenCalledTimes(1);
  });

  it('asks to log in when it does not know the password, such as after a reload', async () => {
    const cognito = stubCognito();
    await expect(
      createAccountAuth(cognito).confirmSignUp('sam@example.com', '123456'),
    ).resolves.toBe('logIn');
    expect(cognito.signIn).not.toHaveBeenCalled();
  });

  it('asks to log in when the code was for another email', async () => {
    const cognito = stubCognito();
    const auth = createAccountAuth(cognito);
    await auth.signUp(SAM);
    await expect(auth.confirmSignUp('alex@example.com', '123456')).resolves.toBe('logIn');
    expect(cognito.signIn).not.toHaveBeenCalled();
  });

  it('asks to log in when the sign-in after confirming fails', async () => {
    const cognito = stubCognito({ signIn: vi.fn(() => Promise.reject(new Error('offline'))) });
    const auth = createAccountAuth(cognito);
    await auth.signUp(SAM);
    await expect(auth.confirmSignUp('sam@example.com', '123456')).resolves.toBe('logIn');
  });

  it.each([
    [
      'CodeMismatchException',
      'wrongCode',
      'That code doesn’t match. Check the email and try again.',
    ],
    [
      'ExpiredCodeException',
      'expiredCode',
      'That code has expired. Send a new code and try again.',
    ],
  ])('turns %s into a %s message', async (name, kind, message) => {
    const cognito = stubCognito({ confirmSignUp: vi.fn(() => Promise.reject(cognitoError(name))) });
    const failure = await failureOf(
      createAccountAuth(cognito).confirmSignUp('sam@example.com', '000000'),
    );
    expect(failure).toMatchObject({ kind, message });
  });

  it('sends a new code', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).resendSignUpCode('sam@example.com');
    expect(cognito.resendSignUpCode).toHaveBeenCalledWith({ username: 'sam@example.com' });
  });
});

describe('logging in', () => {
  it('signs in with email and password', async () => {
    const cognito = stubCognito();
    await expect(
      createAccountAuth(cognito).signIn('sam@example.com', 'lemon kettle sunday'),
    ).resolves.toBe('signedIn');
    expect(cognito.signIn).toHaveBeenCalledWith({
      username: 'sam@example.com',
      password: 'lemon kettle sunday',
    });
  });

  it('asks to confirm the email when sign-up was never finished', async () => {
    const cognito = stubCognito({
      signIn: vi.fn(() =>
        Promise.resolve({ isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_UP' } }),
      ),
    });
    await expect(createAccountAuth(cognito).signIn('sam@example.com', 'x')).resolves.toBe(
      'confirmEmail',
    );
  });

  it('treats an unconfirmed-account error the same way', async () => {
    const cognito = stubCognito({
      signIn: vi.fn(() => Promise.reject(cognitoError('UserNotConfirmedException'))),
    });
    await expect(createAccountAuth(cognito).signIn('sam@example.com', 'x')).resolves.toBe(
      'confirmEmail',
    );
  });

  it('counts an existing session as signed in', async () => {
    const cognito = stubCognito({
      signIn: vi.fn(() => Promise.reject(cognitoError('UserAlreadyAuthenticatedException'))),
    });
    await expect(createAccountAuth(cognito).signIn('sam@example.com', 'x')).resolves.toBe(
      'signedIn',
    );
  });

  it.each(['NotAuthorizedException', 'UserNotFoundException'])(
    'gives one message for %s that never says whether the email has an account',
    async (name) => {
      const cognito = stubCognito({
        signIn: vi.fn(() => Promise.reject(cognitoError(name, 'Incorrect username or password.'))),
      });
      const failure = await failureOf(createAccountAuth(cognito).signIn('sam@example.com', 'x'));
      expect(failure).toMatchObject({
        kind: 'wrongDetails',
        message: 'That email and password don’t match. Check for typos, or reset your password.',
      });
    },
  );

  it.each([
    ['NotAuthorizedException', 'Password attempts exceeded'],
    ['TooManyRequestsException', 'Too many requests'],
    ['LimitExceededException', 'Attempt limit exceeded'],
    ['TooManyFailedAttemptsException', 'Too many failed attempts'],
  ])('asks calmly to wait after %s (%s)', async (name, message) => {
    const cognito = stubCognito({
      signIn: vi.fn(() => Promise.reject(cognitoError(name, message))),
    });
    const failure = await failureOf(createAccountAuth(cognito).signIn('sam@example.com', 'x'));
    expect(failure).toMatchObject({
      kind: 'tooManyAttempts',
      message: 'Too many tries for now. Wait a few minutes, then try again.',
    });
  });

  it('says when Cognito cannot be reached', async () => {
    const cognito = stubCognito({
      signIn: vi.fn(() => Promise.reject(cognitoError('NetworkError', 'Failed to fetch'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).signIn('sam@example.com', 'x'));
    expect(failure).toMatchObject({
      kind: 'offline',
      message: 'Can’t reach Cleaning Planner. Check your connection and try again.',
    });
  });

  it('gives a general message for anything else', async () => {
    const cognito = stubCognito({ signIn: vi.fn(() => Promise.reject(new Error('boom'))) });
    const failure = await failureOf(createAccountAuth(cognito).signIn('sam@example.com', 'x'));
    expect(failure).toMatchObject({
      kind: 'unexpected',
      message: 'Something went wrong. Try again.',
    });
  });
});

describe('resetting a password', () => {
  it('asks Cognito to email a code', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).requestPasswordReset('sam@example.com');
    expect(cognito.resetPassword).toHaveBeenCalledWith({ username: 'sam@example.com' });
  });

  it('never says whether the email has an account', async () => {
    const cognito = stubCognito({
      resetPassword: vi.fn(() => Promise.reject(cognitoError('UserNotFoundException'))),
    });
    await expect(
      createAccountAuth(cognito).requestPasswordReset('nobody@example.com'),
    ).resolves.toBeUndefined();
  });

  it('sets the new password with the code, then signs in with it', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).resetPassword({
      email: 'sam@example.com',
      code: '719042',
      newPassword: 'window pepper gate',
    });
    expect(cognito.confirmResetPassword).toHaveBeenCalledWith({
      username: 'sam@example.com',
      confirmationCode: '719042',
      newPassword: 'window pepper gate',
    });
    expect(cognito.signIn).toHaveBeenCalledWith({
      username: 'sam@example.com',
      password: 'window pepper gate',
    });
  });

  it('says when the reset code is wrong', async () => {
    const cognito = stubCognito({
      confirmResetPassword: vi.fn(() => Promise.reject(cognitoError('CodeMismatchException'))),
    });
    const failure = await failureOf(
      createAccountAuth(cognito).resetPassword({
        email: 'sam@example.com',
        code: '000000',
        newPassword: 'window pepper gate',
      }),
    );
    expect(failure.kind).toBe('wrongCode');
    expect(cognito.signIn).not.toHaveBeenCalled();
  });
});

describe('checking for a session', () => {
  it('is signed in when Amplify has tokens', async () => {
    await expect(createAccountAuth(stubCognito()).isSignedIn()).resolves.toBe(true);
  });

  it('is signed out without tokens or when the session cannot be read', async () => {
    const noTokens = stubCognito({ fetchAuthSession: vi.fn(() => Promise.resolve({})) });
    const broken = stubCognito({ fetchAuthSession: vi.fn(() => Promise.reject(new Error('x'))) });
    await expect(createAccountAuth(noTokens).isSignedIn()).resolves.toBe(false);
    await expect(createAccountAuth(broken).isSignedIn()).resolves.toBe(false);
  });

  it('can tell at once, without Cognito, that nobody is signed in', () => {
    expect(createAccountAuth(stubCognito(), () => false).mightBeSignedIn()).toBe(false);
    expect(createAccountAuth(stubCognito(), () => true).mightBeSignedIn()).toBe(true);
  });

  it('assumes someone might be signed in when it cannot tell', () => {
    expect(createAccountAuth(stubCognito()).mightBeSignedIn()).toBe(true);
  });
});

describe('signing out', () => {
  it('signs out of Cognito on this device', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).signOut();
    expect(cognito.signOut).toHaveBeenCalled();
  });
});
