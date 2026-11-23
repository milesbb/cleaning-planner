'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  AccountForm,
  FormAlert,
  FormStatus,
  TEXT_ACTION_CLASSES,
  TextButton,
} from '@/components/account/account-screen';
import { useCodeFlow } from '@/components/account/code-flow';
import type { CodeFlow } from '@/components/account/code-flow';
import { useSubmission } from '@/components/account/use-submission';
import type { Submission } from '@/components/account/use-submission';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { TextField } from '@/components/ui/text-field';
import type { AccountAuthError } from '@/lib/auth/account-auth-error';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { codeError } from '@/lib/auth/account-validation';
import { forgetPendingEmail } from '@/lib/auth/pending-email';

const ALREADY_CONFIRMED = 'This email is already confirmed. Log in to carry on.';

interface Verify {
  flow: CodeFlow;
  submission: Submission;
  confirm: (code: string) => boolean;
  resend: () => void;
}

function useVerify(): Verify {
  const auth = useAccountAuth();
  const router = useRouter();
  const submission = useSubmission();
  const flow = useCodeFlow();
  const handleFailure = (error: AccountAuthError): void => {
    if (error.kind === 'wrongCode' || error.kind === 'expiredCode')
      flow.setCodeError(error.message);
    else submission.showAlert(error.kind === 'wrongDetails' ? ALREADY_CONFIRMED : error.message);
  };
  const confirm = (code: string): boolean => {
    const email = flow.checkedEmail();
    flow.setCodeError(codeError(code));
    if (email === null || codeError(code) !== undefined) return false;
    flow.setStatus(null);
    submission.run(async () => {
      const outcome = await auth.confirmSignUp(email, code);
      forgetPendingEmail();
      router.replace(outcome === 'signedIn' ? '/' : '/sign-in');
    }, handleFailure);
    return true;
  };
  const resend = (): void => {
    const email = flow.checkedEmail();
    if (email === null) return;
    submission.run(async () => {
      await auth.resendSignUpCode(email);
      flow.setStatus(`We’ve sent a new code to ${email}.`);
    }, handleFailure);
  };
  return { flow, submission, confirm, resend };
}

function VerifyActions({ verify }: { verify: Verify }): ReactNode {
  return (
    <>
      <Button type="submit" disabled={verify.submission.isSubmitting}>
        {verify.submission.isSubmitting ? 'Checking…' : 'Continue'}
      </Button>
      <div className="flex flex-wrap justify-center gap-x-5 text-[0.9375rem]">
        <TextButton onClick={verify.resend} disabled={verify.submission.isSubmitting}>
          Send a new code
        </TextButton>
        <Link href="/sign-up" className={TEXT_ACTION_CLASSES}>
          Use another email
        </Link>
      </div>
    </>
  );
}

export function VerifyForm(): ReactNode {
  const verify = useVerify();
  const { flow, submission } = verify;
  return (
    <AccountForm
      onSubmit={() => verify.confirm(flow.code)}
      actions={<VerifyActions verify={verify} />}
    >
      {flow.knownEmail === null && (
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          {...flow.emailField.bind('email')}
        />
      )}
      <CodeInput
        label="Code"
        onChange={flow.setCode}
        onComplete={(code) => {
          verify.confirm(code);
        }}
        error={flow.codeError}
      />
      <p className="-mt-3 text-sm">Pasting the whole code works too.</p>
      {flow.status !== null && <FormStatus>{flow.status}</FormStatus>}
      {submission.alert !== null && <FormAlert>{submission.alert}</FormAlert>}
    </AccountForm>
  );
}
