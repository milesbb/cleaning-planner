import {
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  resetPassword,
  signIn,
  signUp,
} from 'aws-amplify/auth';

// Passwords go from the browser straight to Cognito (SRP), never to our API.

export type AccountAuthFailureKind =
  | 'emailTaken'
  | 'weakPassword'
  | 'wrongCode'
  | 'expiredCode'
  | 'wrongDetails'
  | 'tooManyAttempts'
  | 'offline'
  | 'unexpected';

const MESSAGES: Record<AccountAuthFailureKind, string> = {
  emailTaken:
    'There’s already an account for this email. Log in, or reset your password if you’ve forgotten it.',
  weakPassword: 'Use at least 12 characters.',
  wrongCode: 'That code doesn’t match. Check the email and try again.',
  expiredCode: 'That code has expired. Send a new code and try again.',
  wrongDetails: 'That email and password don’t match. Check for typos, or reset your password.',
  tooManyAttempts: 'Too many tries for now. Wait a few minutes, then try again.',
  offline: 'Can’t reach Cleaning Planner. Check your connection and try again.',
  unexpected: 'Something went wrong. Try again.',
};

export class AccountAuthError extends Error {
  readonly kind: AccountAuthFailureKind;

  constructor(kind: AccountAuthFailureKind) {
    super(MESSAGES[kind]);
    this.name = 'AccountAuthError';
    this.kind = kind;
  }
}

const KIND_BY_COGNITO_ERROR: Record<string, AccountAuthFailureKind> = {
  UsernameExistsException: 'emailTaken',
  AliasExistsException: 'emailTaken',
  InvalidPasswordException: 'weakPassword',
  CodeMismatchException: 'wrongCode',
  ExpiredCodeException: 'expiredCode',
  NotAuthorizedException: 'wrongDetails',
  UserNotFoundException: 'wrongDetails',
  TooManyRequestsException: 'tooManyAttempts',
  LimitExceededException: 'tooManyAttempts',
  TooManyFailedAttemptsException: 'tooManyAttempts',
  NetworkError: 'offline',
};

const TOO_MANY_ATTEMPTS_MESSAGE = /attempts exceeded/i;

function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

function failureOf(error: unknown): AccountAuthError {
  if (error instanceof Error && TOO_MANY_ATTEMPTS_MESSAGE.test(error.message)) {
    return new AccountAuthError('tooManyAttempts');
  }
  return new AccountAuthError(KIND_BY_COGNITO_ERROR[nameOf(error)] ?? 'unexpected');
}

async function translated<Result>(attempt: () => Promise<Result>): Promise<Result> {
  try {
    return await attempt();
  } catch (error) {
    throw failureOf(error);
  }
}

interface SignUpStep {
  nextStep: { signUpStep: string };
}

interface SignInStep {
  nextStep: { signInStep: string };
}

export interface CognitoFunctions {
  signUp: (input: {
    username: string;
    password: string;
    options: { userAttributes: { email: string; name: string } };
  }) => Promise<SignUpStep>;
  confirmSignUp: (input: { username: string; confirmationCode: string }) => Promise<SignUpStep>;
  resendSignUpCode: (input: { username: string }) => Promise<unknown>;
  signIn: (input: { username: string; password: string }) => Promise<SignInStep>;
  resetPassword: (input: { username: string }) => Promise<unknown>;
  confirmResetPassword: (input: {
    username: string;
    confirmationCode: string;
    newPassword: string;
  }) => Promise<unknown>;
  fetchAuthSession: () => Promise<{ tokens?: unknown }>;
}

const AMPLIFY: CognitoFunctions = {
  signUp,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
};

interface NewAccount {
  name: string;
  email: string;
  password: string;
}

interface PasswordReset {
  email: string;
  code: string;
  newPassword: string;
}

type SignInOutcome = 'signedIn' | 'confirmEmail';
type ConfirmOutcome = 'signedIn' | 'logIn';

export interface AccountAuth {
  signUp: (account: NewAccount) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<ConfirmOutcome>;
  resendSignUpCode: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInOutcome>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (reset: PasswordReset) => Promise<void>;
  isSignedIn: () => Promise<boolean>;
}

const CONFIRM_SIGN_UP = 'CONFIRM_SIGN_UP';

async function signInWith(
  cognito: CognitoFunctions,
  email: string,
  password: string,
): Promise<SignInOutcome> {
  try {
    const { nextStep } = await cognito.signIn({ username: email, password });
    return nextStep.signInStep === CONFIRM_SIGN_UP ? 'confirmEmail' : 'signedIn';
  } catch (error) {
    if (nameOf(error) === 'UserNotConfirmedException') return 'confirmEmail';
    if (nameOf(error) === 'UserAlreadyAuthenticatedException') return 'signedIn';
    throw failureOf(error);
  }
}

async function signUpWith(
  cognito: CognitoFunctions,
  { name, email, password }: NewAccount,
): Promise<void> {
  await translated(() =>
    cognito.signUp({
      username: email,
      password,
      options: { userAttributes: { email, name } },
    }),
  );
}

// The password typed at sign-up (or at a log in that needed the code), kept in
// memory only, so confirming the email can sign straight in with SRP. Amplify's
// own autoSignIn needs the USER_AUTH flow, which the app client doesn't allow.
interface WaitingSignIn {
  email: string;
  password: string;
}

async function confirmSignUpWith(
  cognito: CognitoFunctions,
  { email, code }: { email: string; code: string },
  waiting: WaitingSignIn | null,
): Promise<ConfirmOutcome> {
  await translated(() => cognito.confirmSignUp({ username: email, confirmationCode: code }));
  if (waiting?.email !== email) return 'logIn';
  try {
    return (await signInWith(cognito, email, waiting.password)) === 'signedIn'
      ? 'signedIn'
      : 'logIn';
  } catch {
    return 'logIn';
  }
}

async function resendSignUpCodeWith(cognito: CognitoFunctions, email: string): Promise<void> {
  await translated(() => cognito.resendSignUpCode({ username: email }));
}

async function requestPasswordResetWith(cognito: CognitoFunctions, email: string): Promise<void> {
  try {
    await cognito.resetPassword({ username: email });
  } catch (error) {
    // Never reveal whether the email has an account.
    if (nameOf(error) !== 'UserNotFoundException') throw failureOf(error);
  }
}

async function resetPasswordWith(
  cognito: CognitoFunctions,
  { email, code, newPassword }: PasswordReset,
): Promise<void> {
  await translated(() =>
    cognito.confirmResetPassword({ username: email, confirmationCode: code, newPassword }),
  );
  await signInWith(cognito, email, newPassword);
}

async function isSignedInWith(cognito: CognitoFunctions): Promise<boolean> {
  try {
    const { tokens } = await cognito.fetchAuthSession();
    return tokens !== undefined;
  } catch {
    return false;
  }
}

export function createAccountAuth(cognito: CognitoFunctions = AMPLIFY): AccountAuth {
  let waiting: WaitingSignIn | null = null;
  return {
    signUp: async (account): Promise<void> => {
      await signUpWith(cognito, account);
      waiting = { email: account.email, password: account.password };
    },
    confirmSignUp: (email, code): Promise<ConfirmOutcome> => {
      const used = waiting;
      waiting = null;
      return confirmSignUpWith(cognito, { email, code }, used);
    },
    resendSignUpCode: (email) => resendSignUpCodeWith(cognito, email),
    signIn: async (email, password): Promise<SignInOutcome> => {
      const outcome = await signInWith(cognito, email, password);
      waiting = outcome === 'confirmEmail' ? { email, password } : null;
      return outcome;
    },
    requestPasswordReset: (email) => requestPasswordResetWith(cognito, email),
    resetPassword: (reset) => resetPasswordWith(cognito, reset),
    isSignedIn: () => isSignedInWith(cognito),
  };
}
