import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { ArtFrame } from '@/components/art/art-frame';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = { title: 'Forgot your password' };

export default function ForgotPasswordPage(): ReactNode {
  return (
    <AccountScreen back={{ href: '/sign-in', label: 'Back to Log in' }}>
      <ArtFrame artKey="newKeys" alt="" className="w-56" />
      <AccountHeading title="Forgot your password?">
        Enter your email and we’ll send a 6-digit code so you can choose a new one.
      </AccountHeading>
      <ForgotPasswordForm />
    </AccountScreen>
  );
}
