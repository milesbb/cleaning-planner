'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  AccountForm,
  FootnoteLinks,
  FormAlert,
  TEXT_ACTION_CLASSES,
} from '@/components/account/account-screen';
import { hasErrors, useFields } from '@/components/account/use-fields';
import type { Fields } from '@/components/account/use-fields';
import { useSubmission } from '@/components/account/use-submission';
import type { Submission } from '@/components/account/use-submission';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { emailError, existingPasswordError } from '@/lib/auth/account-validation';
import { rememberPendingEmail } from '@/lib/auth/pending-email';
import { safeReturnPath } from '@/lib/navigation/start-route';

type SignInField = 'email' | 'password';

interface SignIn {
  fields: Fields<SignInField>;
  submission: Submission;
  submit: () => boolean;
}

function returnPath(): string {
  return safeReturnPath(new URLSearchParams(window.location.search).get('next'));
}

function useSignIn(): SignIn {
  const auth = useAccountAuth();
  const router = useRouter();
  const submission = useSubmission();
  const fields = useFields<SignInField>({ email: '', password: '' });
  const submit = (): boolean => {
    const { email, password } = fields.values;
    const errors = { email: emailError(email), password: existingPasswordError(password) };
    fields.setErrors(errors);
    if (hasErrors(errors)) return false;
    const trimmedEmail = email.trim();
    submission.run(
      async () => {
        if ((await auth.signIn(trimmedEmail, password)) === 'signedIn') {
          router.replace(returnPath());
          return;
        }
        // Signed up but never confirmed: a fresh code, then the code screen.
        rememberPendingEmail(trimmedEmail);
        await auth.resendSignUpCode(trimmedEmail).catch(() => undefined);
        router.push('/verify');
      },
      (error) => {
        submission.showAlert(error.message);
      },
    );
    return true;
  };
  return { fields, submission, submit };
}

function SignInActions({ isSubmitting }: { isSubmitting: boolean }): ReactNode {
  return (
    <>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in…' : 'Log in'}
      </Button>
      <FootnoteLinks>
        <span>
          New here?{' '}
          <Link href="/sign-up" className="font-bold underline">
            Create an account
          </Link>
        </span>
      </FootnoteLinks>
    </>
  );
}

export function SignInForm(): ReactNode {
  const { fields, submission, submit } = useSignIn();
  return (
    <AccountForm
      onSubmit={submit}
      actions={<SignInActions isSubmitting={submission.isSubmitting} />}
    >
      <TextField label="Email" type="email" autoComplete="username" {...fields.bind('email')} />
      <div className="flex flex-col gap-1">
        <PasswordField
          label="Password"
          autoComplete="current-password"
          {...fields.bind('password')}
        />
        <Link href="/forgot-password" className={`${TEXT_ACTION_CLASSES} self-end`}>
          Forgot password?
        </Link>
      </div>
      {submission.alert !== null && <FormAlert>{submission.alert}</FormAlert>}
    </AccountForm>
  );
}
