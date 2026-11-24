import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { MoveSignedInPeopleOn } from '@/components/start/move-signed-in-people-on';
import { SignUpForm } from './sign-up-form';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage(): ReactNode {
  return (
    <AccountScreen back={{ href: '/welcome', label: 'Back' }}>
      <MoveSignedInPeopleOn />
      <AccountHeading title="Create your account">
        Log in with your email and password on any phone or computer.
      </AccountHeading>
      <SignUpForm />
    </AccountScreen>
  );
}
