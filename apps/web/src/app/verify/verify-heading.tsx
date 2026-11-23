'use client';

import type { ReactNode } from 'react';
import { AccountHeading } from '@/components/account/account-screen';
import { useKnownEmail } from '@/components/account/code-flow';
import { ArtFrame } from '@/components/art/art-frame';

export function VerifyHeading(): ReactNode {
  const email = useKnownEmail();
  return (
    <>
      <ArtFrame artKey="checkEmail" alt="" className="w-56" />
      <AccountHeading title="Check your email">
        {email === null ? (
          'Enter your email and the 6-digit code we sent you. It works for 24 hours.'
        ) : (
          <>
            We sent a 6-digit code to <b>{email}</b>. It works for 24 hours.
          </>
        )}
      </AccountHeading>
    </>
  );
}
