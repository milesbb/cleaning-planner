import { vi } from 'vitest';
import { AccountAuthError } from '@/lib/auth/account-auth-error';
import type { CognitoFunctions } from '@/lib/auth/account-auth';

// A stand-in for Amplify's Cognito calls, for testing createAccountAuth.

export function cognitoError(name: string, message = name): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

export function stubCognito(overrides: Partial<CognitoFunctions> = {}): CognitoFunctions {
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
    updatePassword: vi.fn(() => Promise.resolve()),
    updateUserAttribute: vi.fn(() =>
      Promise.resolve({
        isUpdated: false,
        nextStep: { updateAttributeStep: 'CONFIRM_ATTRIBUTE_WITH_CODE' },
      }),
    ),
    confirmUserAttribute: vi.fn(() => Promise.resolve()),
    sendUserAttributeVerificationCode: vi.fn(() => Promise.resolve({})),
    ...overrides,
  };
}

export async function failureOf(promise: Promise<unknown>): Promise<AccountAuthError> {
  const outcome: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  if (outcome instanceof AccountAuthError) return outcome;
  throw new Error('Expected an AccountAuthError');
}
