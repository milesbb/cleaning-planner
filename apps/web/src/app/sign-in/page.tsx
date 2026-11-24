import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { MoveSignedInPeopleOn } from '@/components/start/move-signed-in-people-on';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Log in' };

export default function SignInPage(): ReactNode {
  return (
    <AccountScreen back={{ href: '/welcome', label: 'Back' }}>
      <MoveSignedInPeopleOn />
      <AccountHeading title="Welcome back">Log in to see what needs doing at home.</AccountHeading>
      <SignInForm />
    </AccountScreen>
  );
}
