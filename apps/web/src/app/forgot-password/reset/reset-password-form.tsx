'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AccountForm,
  FormAlert,
  FormStatus,
  TextButton,
} from '@/components/account/account-screen';
import { useCodeFlow } from '@/components/account/code-flow';
import type { CodeFlow } from '@/components/account/code-flow';
import { useSubmission } from '@/components/account/use-submission';
import type { Submission } from '@/components/account/use-submission';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import type { AccountAuthError } from '@/lib/auth/account-auth-error';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { codeError, newPasswordError } from '@/lib/auth/account-validation';
import { forgetPendingEmail } from '@/lib/auth/pending-email';

const MINIMUM_PASSWORD_LENGTH = 12;

interface Reset {
  flow: CodeFlow;
  submission: Submission;
  password: string;
  setPassword: (password: string) => void;
  passwordError: string | undefined;
  submit: () => boolean;
  resend: () => void;
}

function useReset(): Reset {
  const auth = useAccountAuth();
  const router = useRouter();
  const submission = useSubmission();
  const flow = useCodeFlow();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const handleFailure = (error: AccountAuthError): void => {
    if (error.kind === 'wrongCode' || error.kind === 'expiredCode')
      flow.setCodeError(error.message);
    else if (error.kind === 'weakPassword') setPasswordError(error.message);
    else submission.showAlert(error.message);
  };
  const submit = (): boolean => {
    const email = flow.checkedEmail();
    flow.setCodeError(codeError(flow.code));
    setPasswordError(newPasswordError(password));
    const isValid = codeError(flow.code) === undefined && newPasswordError(password) === undefined;
    if (email === null || !isValid) return false;
    submission.run(async () => {
      await auth.resetPassword({ email, code: flow.code, newPassword: password });
      forgetPendingEmail();
      router.replace('/');
    }, handleFailure);
    return true;
  };
  const resend = (): void => {
    const email = flow.checkedEmail();
    if (email === null) return;
    submission.run(async () => {
      await auth.requestPasswordReset(email);
      flow.setStatus(`We’ve sent a new code to ${email}.`);
    }, handleFailure);
  };
  return { flow, submission, password, setPassword, passwordError, submit, resend };
}

function ResetFields({ reset }: { reset: Reset }): ReactNode {
  const { flow } = reset;
  return (
    <>
      {flow.knownEmail === null && (
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          {...flow.emailField.bind('email')}
        />
      )}
      <div className="flex flex-col gap-1">
        <CodeInput
          label="Code"
          onChange={flow.setCode}
          onComplete={flow.setCode}
          error={flow.codeError}
        />
        <p className="flex flex-wrap items-center gap-x-1 text-sm">
          Works for 1 hour.
          <TextButton onClick={reset.resend} disabled={reset.submission.isSubmitting}>
            Send a new code
          </TextButton>
        </p>
      </div>
      <PasswordField
        label="New password"
        autoComplete="new-password"
        minimumLength={MINIMUM_PASSWORD_LENGTH}
        value={reset.password}
        error={reset.passwordError}
        onChange={(event) => {
          reset.setPassword(event.target.value);
        }}
      />
    </>
  );
}

export function ResetPasswordForm(): ReactNode {
  const reset = useReset();
  const { submission, flow } = reset;
  return (
    <AccountForm
      onSubmit={reset.submit}
      actions={
        <Button type="submit" disabled={submission.isSubmitting}>
          {submission.isSubmitting ? 'Saving…' : 'Save and log in'}
        </Button>
      }
    >
      <ResetFields reset={reset} />
      {flow.status !== null && <FormStatus>{flow.status}</FormStatus>}
      {submission.alert !== null && <FormAlert>{submission.alert}</FormAlert>}
    </AccountForm>
  );
}
