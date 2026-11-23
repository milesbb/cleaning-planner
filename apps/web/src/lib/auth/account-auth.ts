// Passwords go from the browser straight to Cognito (SRP), never to our API.

import { AccountAuthError, failureOf, nameOf, translated } from './account-auth-error';
import { createEmailChange } from './email-change';
import type { EmailChange, EmailChangeCognito } from './email-change';

interface SignUpStep {
  nextStep: { signUpStep: string };
}

interface SignInStep {
  nextStep: { signInStep: string };
}

export interface CognitoFunctions extends EmailChangeCognito {
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
  fetchAuthSession: () => Promise<{ tokens?: { accessToken: { toString: () => string } } }>;
  signOut: (input?: { global: boolean }) => Promise<void>;
  updatePassword: (input: { oldPassword: string; newPassword: string }) => Promise<void>;
}

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

interface PasswordChange {
  email: string;
  currentPassword: string;
  newPassword: string;
  signOutOtherDevices: boolean;
}

type SignInOutcome = 'signedIn' | 'confirmEmail';
type PasswordChangeOutcome = 'changed' | 'logIn';
type ConfirmOutcome = 'signedIn' | 'logIn';

export interface AccountAuth extends EmailChange {
  signUp: (account: NewAccount) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<ConfirmOutcome>;
  resendSignUpCode: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<SignInOutcome>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (reset: PasswordReset) => Promise<void>;
  isSignedIn: () => Promise<boolean>;
  // Instant and offline: false only when the browser holds no session at all.
  mightBeSignedIn: () => boolean;
  signOut: () => Promise<void>;
  // 'logIn' when other devices were logged out and this one couldn't log
  // straight back in with the new password.
  changePassword: (change: PasswordChange) => Promise<PasswordChangeOutcome>;
  recheckPassword: (email: string, password: string) => Promise<void>;
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

async function updatePasswordWith(
  cognito: CognitoFunctions,
  change: PasswordChange,
): Promise<void> {
  try {
    await cognito.updatePassword({
      oldPassword: change.currentPassword,
      newPassword: change.newPassword,
    });
  } catch (error) {
    const failure = failureOf(error);
    throw failure.kind === 'wrongDetails' ? new AccountAuthError('wrongCurrentPassword') : failure;
  }
}

// Logging out everywhere ends this device's session too, so it logs back in
// with the password just set.
async function changePasswordWith(
  cognito: CognitoFunctions,
  change: PasswordChange,
): Promise<PasswordChangeOutcome> {
  await updatePasswordWith(cognito, change);
  if (!change.signOutOtherDevices) return 'changed';
  await translated(() => cognito.signOut({ global: true }));
  try {
    const outcome = await signInWith(cognito, change.email, change.newPassword);
    return outcome === 'signedIn' ? 'changed' : 'logIn';
  } catch {
    return 'logIn';
  }
}

// Amplify won't start a second sign-in while one is active, so the only way
// to check the password is to sign out and back in with it. A wrong password
// leaves this device signed out; the screen lets the person try again.
async function recheckPasswordWith(
  cognito: CognitoFunctions,
  email: string,
  password: string,
): Promise<void> {
  await translated(() => cognito.signOut());
  let outcome: SignInOutcome;
  try {
    outcome = await signInWith(cognito, email, password);
  } catch (error) {
    const isWrongPassword = error instanceof AccountAuthError && error.kind === 'wrongDetails';
    throw isWrongPassword ? new AccountAuthError('wrongCurrentPassword') : error;
  }
  if (outcome !== 'signedIn') throw new AccountAuthError('unexpected');
}

const MIGHT_BE_SIGNED_IN = (): boolean => true;

export function createAccountAuth(
  cognito: CognitoFunctions,
  hasStoredSession: () => boolean = MIGHT_BE_SIGNED_IN,
): AccountAuth {
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
    mightBeSignedIn: hasStoredSession,
    signOut: () => translated(() => cognito.signOut()),
    changePassword: (change) => changePasswordWith(cognito, change),
    recheckPassword: (email, password) => recheckPasswordWith(cognito, email, password),
    ...createEmailChange(cognito),
  };
}
