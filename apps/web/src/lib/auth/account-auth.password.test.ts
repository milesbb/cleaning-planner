import { describe, expect, it, vi } from 'vitest';
import { cognitoError, failureOf, stubCognito } from '@/test/cognito-stub';
import { createAccountAuth } from './account-auth';

const CHANGE = {
  email: 'sam@example.com',
  currentPassword: 'lemon kettle sunday',
  newPassword: 'window pepper gate',
  signOutOtherDevices: false,
};

describe('changing your password', () => {
  it('sends the current and new passwords to Cognito', async () => {
    const cognito = stubCognito();
    await expect(createAccountAuth(cognito).changePassword(CHANGE)).resolves.toBe('changed');
    expect(cognito.updatePassword).toHaveBeenCalledWith({
      oldPassword: 'lemon kettle sunday',
      newPassword: 'window pepper gate',
    });
    expect(cognito.signOut).not.toHaveBeenCalled();
  });

  it('logs out everywhere, then logs this device back in with the new password', async () => {
    const cognito = stubCognito();
    const outcome = await createAccountAuth(cognito).changePassword({
      ...CHANGE,
      signOutOtherDevices: true,
    });
    expect(outcome).toBe('changed');
    expect(cognito.signOut).toHaveBeenCalledWith({ global: true });
    expect(cognito.signIn).toHaveBeenCalledWith({
      username: 'sam@example.com',
      password: 'window pepper gate',
    });
  });

  it('asks to log in again when this device can’t log straight back in', async () => {
    const cognito = stubCognito({
      signIn: vi.fn(() => Promise.reject(cognitoError('NetworkError'))),
    });
    const outcome = await createAccountAuth(cognito).changePassword({
      ...CHANGE,
      signOutOtherDevices: true,
    });
    expect(outcome).toBe('logIn');
  });

  it('says when the current password is wrong', async () => {
    const cognito = stubCognito({
      updatePassword: vi.fn(() => Promise.reject(cognitoError('NotAuthorizedException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).changePassword(CHANGE));
    expect(failure).toMatchObject({
      kind: 'wrongCurrentPassword',
      message: 'That isn’t your current password. Check for typos, or reset it.',
    });
  });

  it('says when the new password is too short', async () => {
    const cognito = stubCognito({
      updatePassword: vi.fn(() => Promise.reject(cognitoError('InvalidPasswordException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).changePassword(CHANGE));
    expect(failure.kind).toBe('weakPassword');
  });

  it('says when there have been too many tries', async () => {
    const cognito = stubCognito({
      updatePassword: vi.fn(() => Promise.reject(cognitoError('LimitExceededException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).changePassword(CHANGE));
    expect(failure.kind).toBe('tooManyAttempts');
  });
});

describe('re-checking your password', () => {
  it('signs out and back in with the typed password', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).recheckPassword('sam@example.com', 'lemon kettle sunday');
    expect(cognito.signOut).toHaveBeenCalledWith();
    expect(cognito.signIn).toHaveBeenCalledWith({
      username: 'sam@example.com',
      password: 'lemon kettle sunday',
    });
  });

  it('says when the password is wrong, leaving this device signed out', async () => {
    const cognito = stubCognito({
      signIn: vi.fn(() => Promise.reject(cognitoError('NotAuthorizedException'))),
    });
    const failure = await failureOf(
      createAccountAuth(cognito).recheckPassword('sam@example.com', 'lemon kettle'),
    );
    expect(failure).toMatchObject({
      kind: 'wrongCurrentPassword',
      message: 'That isn’t your current password. Check for typos, or reset it.',
    });
  });

  it('fails when the sign-in needs anything more', async () => {
    const cognito = stubCognito({
      signIn: vi.fn(() =>
        Promise.resolve({ isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_UP' } }),
      ),
    });
    const failure = await failureOf(
      createAccountAuth(cognito).recheckPassword('sam@example.com', 'lemon kettle sunday'),
    );
    expect(failure.kind).toBe('unexpected');
  });
});
