'use client';

import type { ReactNode } from 'react';
import {
  AccountForm,
  FormAlert,
  FormStatus,
  TextButton,
} from '@/components/account/account-screen';
import { Button, ButtonLink } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { TextField } from '@/components/ui/text-field';
import type { EmailChangeFlow } from './use-email-change';

interface StepProps {
  flow: EmailChangeFlow;
}

function SubmissionAlert({ flow }: StepProps): ReactNode {
  return flow.submission.alert === null ? null : <FormAlert>{flow.submission.alert}</FormAlert>;
}

export function NewEmailStep({
  flow,
  currentEmail,
}: StepProps & { currentEmail: string }): ReactNode {
  return (
    <AccountForm
      onSubmit={flow.sendCode}
      actions={
        <Button type="submit" disabled={flow.submission.isSubmitting}>
          {flow.submission.isSubmitting ? 'Sending…' : 'Send code'}
        </Button>
      }
    >
      <p className="break-words">
        You log in with {currentEmail}. We’ll send a code to the new email to check it’s yours, and
        you keep logging in with this one until you enter it.
      </p>
      <TextField
        label="New email"
        type="email"
        autoComplete="email"
        {...flow.emailField.bind('email')}
      />
      <SubmissionAlert flow={flow} />
    </AccountForm>
  );
}

function CodeActions({ flow }: StepProps): ReactNode {
  return (
    <>
      <Button type="submit" disabled={flow.submission.isSubmitting}>
        {flow.submission.isSubmitting ? 'Confirming…' : 'Confirm email'}
      </Button>
      <div className="flex flex-wrap justify-center gap-x-5 text-[0.9375rem]">
        <TextButton onClick={flow.resend} disabled={flow.submission.isSubmitting}>
          Send a new code
        </TextButton>
        <TextButton onClick={flow.chooseAnotherEmail} disabled={flow.submission.isSubmitting}>
          Use a different email
        </TextButton>
      </div>
    </>
  );
}

export function CodeStep({ flow, newEmail }: StepProps & { newEmail: string }): ReactNode {
  return (
    <AccountForm onSubmit={() => flow.confirm(flow.code)} actions={<CodeActions flow={flow} />}>
      <p className="break-words">
        We’ve sent a 6-digit code to {newEmail}. Enter it here to finish changing your email.
      </p>
      <CodeInput
        label="Code"
        onChange={flow.setCode}
        onComplete={(code) => {
          flow.confirm(code);
        }}
        error={flow.codeError}
      />
      {flow.status !== null && <FormStatus>{flow.status}</FormStatus>}
      <SubmissionAlert flow={flow} />
    </AccountForm>
  );
}

export function SaveFailedStep({ flow }: StepProps): ReactNode {
  return (
    <div className="flex flex-col gap-5">
      <FormAlert>
        Your new email is confirmed, but we couldn’t finish saving it. Check your connection and try
        again.
      </FormAlert>
      <Button onClick={flow.saveAgain} disabled={flow.submission.isSubmitting}>
        {flow.submission.isSubmitting ? 'Trying again…' : 'Try again'}
      </Button>
    </div>
  );
}

export function ChangedStep({ newEmail }: { newEmail: string }): ReactNode {
  return (
    <div className="flex flex-col gap-5">
      <FormStatus>Your email is now {newEmail}.</FormStatus>
      <ButtonLink href="/settings/account">Done</ButtonLink>
    </div>
  );
}
