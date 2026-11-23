import { AccountAuthError, failureOf } from './account-auth-error';

// The pool keeps the old email until the new one is confirmed with a code
// (AttributesRequireVerificationBeforeUpdate), so logging in never breaks halfway.

type EmailAttribute = 'email';
const EMAIL: EmailAttribute = 'email';
const CHANGED_WITHOUT_CODE = 'DONE';

export interface EmailChangeCognito {
  updateUserAttribute: (input: {
    userAttribute: { attributeKey: EmailAttribute; value: string };
  }) => Promise<{ nextStep: { updateAttributeStep: string } }>;
  confirmUserAttribute: (input: {
    userAttributeKey: EmailAttribute;
    confirmationCode: string;
  }) => Promise<void>;
  sendUserAttributeVerificationCode: (input: {
    userAttributeKey: EmailAttribute;
  }) => Promise<unknown>;
}

type EmailChangeOutcome = 'confirmCode' | 'changed';

export interface EmailChange {
  requestEmailChange: (newEmail: string) => Promise<EmailChangeOutcome>;
  confirmEmailChange: (code: string) => Promise<void>;
  resendEmailChangeCode: () => Promise<void>;
}

// Signed in already, so "taken" means someone else's account, and a refused
// token is never a mistyped password.
function emailChangeFailure(error: unknown): AccountAuthError {
  const failure = failureOf(error);
  if (failure.kind === 'emailTaken') return new AccountAuthError('emailInUse');
  if (failure.kind === 'wrongDetails') return new AccountAuthError('unexpected');
  return failure;
}

async function translated<Result>(attempt: () => Promise<Result>): Promise<Result> {
  try {
    return await attempt();
  } catch (error) {
    throw emailChangeFailure(error);
  }
}

export function createEmailChange(cognito: EmailChangeCognito): EmailChange {
  return {
    requestEmailChange: async (newEmail): Promise<EmailChangeOutcome> => {
      const { nextStep } = await translated(() =>
        cognito.updateUserAttribute({ userAttribute: { attributeKey: EMAIL, value: newEmail } }),
      );
      return nextStep.updateAttributeStep === CHANGED_WITHOUT_CODE ? 'changed' : 'confirmCode';
    },
    confirmEmailChange: (code) =>
      translated(() =>
        cognito.confirmUserAttribute({ userAttributeKey: EMAIL, confirmationCode: code }),
      ),
    resendEmailChangeCode: async (): Promise<void> => {
      await translated(() =>
        cognito.sendUserAttributeVerificationCode({ userAttributeKey: EMAIL }),
      );
    },
  };
}
