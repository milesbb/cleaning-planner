import { describe, expect, it, vi } from 'vitest';
import { cognitoError, failureOf, stubCognito } from '@/test/cognito-stub';
import { createAccountAuth } from './account-auth';

describe('changing your email', () => {
  it('asks Cognito to send a code to the new email', async () => {
    const cognito = stubCognito();
    const outcome = await createAccountAuth(cognito).requestEmailChange('sam@new.example');
    expect(outcome).toBe('confirmCode');
    expect(cognito.updateUserAttribute).toHaveBeenCalledWith({
      userAttribute: { attributeKey: 'email', value: 'sam@new.example' },
    });
  });

  it('says the email has changed when Cognito needs no code', async () => {
    const cognito = stubCognito({
      updateUserAttribute: vi.fn(() =>
        Promise.resolve({ isUpdated: true, nextStep: { updateAttributeStep: 'DONE' } }),
      ),
    });
    const outcome = await createAccountAuth(cognito).requestEmailChange('sam@new.example');
    expect(outcome).toBe('changed');
  });

  it('says when another account already uses the new email', async () => {
    const cognito = stubCognito({
      updateUserAttribute: vi.fn(() => Promise.reject(cognitoError('AliasExistsException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).requestEmailChange('ali@x.example'));
    expect(failure).toMatchObject({
      kind: 'emailInUse',
      message: 'Another account already uses that email. Choose a different one.',
    });
  });

  it('confirms the new email with the code', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).confirmEmailChange('123456');
    expect(cognito.confirmUserAttribute).toHaveBeenCalledWith({
      userAttributeKey: 'email',
      confirmationCode: '123456',
    });
  });

  it('says when the code is wrong', async () => {
    const cognito = stubCognito({
      confirmUserAttribute: vi.fn(() => Promise.reject(cognitoError('CodeMismatchException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).confirmEmailChange('000000'));
    expect(failure.kind).toBe('wrongCode');
  });

  it('says when someone took the new email while the code was on its way', async () => {
    const cognito = stubCognito({
      confirmUserAttribute: vi.fn(() => Promise.reject(cognitoError('AliasExistsException'))),
    });
    const failure = await failureOf(createAccountAuth(cognito).confirmEmailChange('123456'));
    expect(failure.kind).toBe('emailInUse');
  });

  it('sends a new code to the new email', async () => {
    const cognito = stubCognito();
    await createAccountAuth(cognito).resendEmailChangeCode();
    expect(cognito.sendUserAttributeVerificationCode).toHaveBeenCalledWith({
      userAttributeKey: 'email',
    });
  });

  it('never blames a password when the session has gone', async () => {
    const cognito = stubCognito({
      sendUserAttributeVerificationCode: vi.fn(() =>
        Promise.reject(cognitoError('NotAuthorizedException')),
      ),
    });
    const failure = await failureOf(createAccountAuth(cognito).resendEmailChangeCode());
    expect(failure.kind).toBe('unexpected');
  });
});
