'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountForm, FootnoteLinks, FormAlert } from '@/components/account/account-screen';
import { hasErrors, useFields } from '@/components/account/use-fields';
import type { Fields } from '@/components/account/use-fields';
import { useSubmission } from '@/components/account/use-submission';
import type { Submission } from '@/components/account/use-submission';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { emailError, nameError, newPasswordError } from '@/lib/auth/account-validation';
import { rememberPendingEmail } from '@/lib/auth/pending-email';

const MINIMUM_PASSWORD_LENGTH = 12;

type SignUpField = 'name' | 'email' | 'password';

interface SignUp {
  fields: Fields<SignUpField>;
  submission: Submission;
  submit: () => boolean;
}

function useSignUp(): SignUp {
  const auth = useAccountAuth();
  const router = useRouter();
  const submission = useSubmission();
  const fields = useFields<SignUpField>({ name: '', email: '', password: '' });
  const submit = (): boolean => {
    const { name, email, password } = fields.values;
    const errors = {
      name: nameError(name),
      email: emailError(email),
      password: newPasswordError(password),
    };
    fields.setErrors(errors);
    if (hasErrors(errors)) return false;
    submission.run(
      async () => {
        await auth.signUp({ name: name.trim(), email: email.trim(), password });
        rememberPendingEmail(email.trim());
        router.push('/verify');
      },
      (error) => {
        if (error.kind === 'weakPassword') fields.setErrors({ password: error.message });
        else submission.showAlert(error.message);
      },
    );
    return true;
  };
  return { fields, submission, submit };
}

function SignUpActions({ isSubmitting }: { isSubmitting: boolean }): ReactNode {
  return (
    <>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating your account…' : 'Create account'}
      </Button>
      <FootnoteLinks>
        <span>
          Already have an account?{' '}
          <Link href="/sign-in" className="font-bold underline">
            Log in
          </Link>
        </span>
      </FootnoteLinks>
    </>
  );
}

export function SignUpForm(): ReactNode {
  const { fields, submission, submit } = useSignUp();
  return (
    <AccountForm
      onSubmit={submit}
      actions={<SignUpActions isSubmitting={submission.isSubmitting} />}
    >
      <TextField
        label="Your name"
        hint="Shown to people you share a home with."
        autoComplete="name"
        {...fields.bind('name')}
      />
      <TextField
        label="Email"
        type="email"
        hint="We’ll send a code to confirm it’s yours."
        autoComplete="email"
        {...fields.bind('email')}
      />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        minimumLength={MINIMUM_PASSWORD_LENGTH}
        {...fields.bind('password')}
      />
      {submission.alert !== null && <FormAlert>{submission.alert}</FormAlert>}
    </AccountForm>
  );
}
