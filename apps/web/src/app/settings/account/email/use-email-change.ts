'use client';

import { profileSchema } from '@cleaning-planner/contracts/profile';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useFields } from '@/components/account/use-fields';
import type { Fields } from '@/components/account/use-fields';
import { useSubmission } from '@/components/account/use-submission';
import type { Submission } from '@/components/account/use-submission';
import { useApiClient } from '@/lib/api/api-provider';
import type { AccountAuthError } from '@/lib/auth/account-auth-error';
import type { AccountAuth } from '@/lib/auth/account-auth';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { codeError, emailError } from '@/lib/auth/account-validation';

const ALREADY_YOUR_EMAIL = 'That’s already your email.';

export type EmailChangeStep =
  | { kind: 'enterEmail' }
  | { kind: 'enterCode'; newEmail: string }
  | { kind: 'saveFailed'; newEmail: string }
  | { kind: 'changed'; newEmail: string };

export interface EmailChangeFlow {
  step: EmailChangeStep;
  emailField: Fields<'email'>;
  submission: Submission;
  code: string;
  setCode: (code: string) => void;
  codeError: string | undefined;
  status: string | null;
  sendCode: () => boolean;
  confirm: (code: string) => boolean;
  resend: () => void;
  chooseAnotherEmail: () => void;
  saveAgain: () => void;
}

function newEmailError(newEmail: string, currentEmail: string): string | undefined {
  const shapeError = emailError(newEmail);
  if (shapeError !== undefined) return shapeError;
  return newEmail.toLowerCase() === currentEmail.toLowerCase() ? ALREADY_YOUR_EMAIL : undefined;
}

// Cognito has the new email once the code is confirmed; the API then copies it
// to the profile everyone in your homes sees.
function useSaveConfirmedEmail(): () => Promise<boolean> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return async () => {
    try {
      const profile = await client.request({
        method: 'POST',
        path: '/v1/me/email',
        response: profileSchema,
      });
      queryClient.setQueryData(['me'], profile);
      await queryClient.invalidateQueries({ queryKey: ['home'] });
      return true;
    } catch {
      return false;
    }
  };
}

interface CodeState {
  code: string;
  setCode: (code: string) => void;
  codeError: string | undefined;
  setCodeError: (error: string | undefined) => void;
  status: string | null;
  setStatus: (status: string | null) => void;
}

function useCodeState(): CodeState {
  const [code, setCode] = useState('');
  const [codeErrorText, setCodeError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | null>(null);
  return { code, setCode, codeError: codeErrorText, setCodeError, status, setStatus };
}

// What every step's action needs: where the flow is and how to move it on.
interface FlowContext {
  auth: AccountAuth;
  submission: Submission;
  emailField: Fields<'email'>;
  codeState: CodeState;
  setStep: (step: EmailChangeStep) => void;
  newEmail: string;
  finish: () => Promise<void>;
  showFailure: (error: AccountAuthError) => void;
}

function showFailureIn(context: Omit<FlowContext, 'showFailure'>): FlowContext['showFailure'] {
  return (error) => {
    if (error.kind === 'wrongCode' || error.kind === 'expiredCode') {
      context.codeState.setCodeError(error.message);
    } else if (error.kind === 'emailInUse') {
      context.setStep({ kind: 'enterEmail' });
      context.emailField.setErrors({ email: error.message });
    } else {
      context.submission.showAlert(error.message);
    }
  };
}

function sendCodeIn(context: FlowContext, currentEmail: string): () => boolean {
  const { auth, submission, codeState, newEmail } = context;
  return () => {
    const error = newEmailError(newEmail, currentEmail);
    context.emailField.setErrors({ email: error });
    if (error !== undefined) return false;
    submission.run(async () => {
      const outcome = await auth.requestEmailChange(newEmail);
      codeState.setStatus(null);
      codeState.setCodeError(undefined);
      if (outcome === 'changed') await context.finish();
      else context.setStep({ kind: 'enterCode', newEmail });
    }, context.showFailure);
    return true;
  };
}

function confirmIn(context: FlowContext): (code: string) => boolean {
  const { auth, submission, codeState } = context;
  return (code) => {
    codeState.setCodeError(codeError(code));
    if (codeError(code) !== undefined) return false;
    codeState.setStatus(null);
    submission.run(async () => {
      await auth.confirmEmailChange(code);
      await context.finish();
    }, context.showFailure);
    return true;
  };
}

function resendIn(context: FlowContext): () => void {
  return () => {
    context.submission.run(async () => {
      await context.auth.resendEmailChangeCode();
      context.codeState.setStatus(`We’ve sent a new code to ${context.newEmail}.`);
    }, context.showFailure);
  };
}

function useFlowContext(): FlowContext & { step: EmailChangeStep } {
  const auth = useAccountAuth();
  const submission = useSubmission();
  const emailField = useFields({ email: '' });
  const codeState = useCodeState();
  const saveConfirmedEmail = useSaveConfirmedEmail();
  const [step, setStep] = useState<EmailChangeStep>({ kind: 'enterEmail' });
  const newEmail = step.kind === 'enterEmail' ? emailField.values.email.trim() : step.newEmail;
  const finish = async (): Promise<void> => {
    const isSaved = await saveConfirmedEmail();
    setStep({ kind: isSaved ? 'changed' : 'saveFailed', newEmail });
  };
  const context = { auth, submission, emailField, codeState, setStep, newEmail, finish };
  return { ...context, step, showFailure: showFailureIn(context) };
}

export function useEmailChange(currentEmail: string): EmailChangeFlow {
  const context = useFlowContext();
  const { step, emailField, submission, codeState } = context;
  return {
    ...{ step, emailField, submission },
    code: codeState.code,
    setCode: codeState.setCode,
    codeError: codeState.codeError,
    status: codeState.status,
    sendCode: sendCodeIn(context, currentEmail),
    confirm: confirmIn(context),
    resend: resendIn(context),
    chooseAnotherEmail: (): void => {
      submission.showAlert(null);
      context.setStep({ kind: 'enterEmail' });
    },
    saveAgain: (): void => {
      submission.run(context.finish, context.showFailure);
    },
  };
}
