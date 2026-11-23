'use client';

import type { ReactNode } from 'react';
import { AccountHeading } from '@/components/account/account-screen';
import { useKnownEmail } from '@/components/account/code-flow';

export function ResetPasswordHeading(): ReactNode {
  const email = useKnownEmail();
  return (
    <AccountHeading title="Set a new password">
      {email === null ? (
        'Enter your email and the code we sent you, then choose a new password.'
      ) : (
        <>
          Enter the code we sent to <b>{email}</b>, then choose a new password.
        </>
      )}
    </AccountHeading>
  );
}
