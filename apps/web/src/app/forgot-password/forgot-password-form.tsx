'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountForm, FootnoteLinks, FormAlert } from '@/components/account/account-screen';
import { useFields } from '@/components/account/use-fields';
import { useSubmission } from '@/components/account/use-submission';
import { MailIcon } from '@/components/icons/interface-icons';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { emailError } from '@/lib/auth/account-validation';
import { rememberPendingEmail } from '@/lib/auth/pending-email';

function ForgotPasswordActions({ isSubmitting }: { isSubmitting: boolean }): ReactNode {
  return (
    <>
      <Button type="submit" disabled={isSubmitting}>
        <MailIcon size={22} />
        {isSubmitting ? 'Sending…' : 'Email me a code'}
      </Button>
      <FootnoteLinks>
        <span>
          Remembered it?{' '}
          <Link href="/sign-in" className="font-bold underline">
            Log in
          </Link>
        </span>
      </FootnoteLinks>
    </>
  );
}

export function ForgotPasswordForm(): ReactNode {
  const auth = useAccountAuth();
  const router = useRouter();
  const submission = useSubmission();
  const fields = useFields({ email: '' });
  const submit = (): boolean => {
    const error = emailError(fields.values.email);
    fields.setErrors({ email: error });
    if (error !== undefined) return false;
    const email = fields.values.email.trim();
    submission.run(
      async () => {
        await auth.requestPasswordReset(email);
        rememberPendingEmail(email);
        router.push('/forgot-password/reset');
      },
      (failure) => {
        submission.showAlert(failure.message);
      },
    );
    return true;
  };
  return (
    <AccountForm
      onSubmit={submit}
      actions={<ForgotPasswordActions isSubmitting={submission.isSubmitting} />}
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        hint="If there’s an account for this email, the code arrives in a minute or two. Check your spam folder too."
        {...fields.bind('email')}
      />
      {submission.alert !== null && <FormAlert>{submission.alert}</FormAlert>}
    </AccountForm>
  );
}
