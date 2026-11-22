import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountScreen } from '@/components/account/account-screen';
import { ResetPasswordForm } from './reset-password-form';
import { ResetPasswordHeading } from './reset-password-heading';

export const metadata: Metadata = { title: 'Set a new password' };

export default function ResetPasswordPage(): ReactNode {
  return (
    <AccountScreen back={{ href: '/forgot-password', label: 'Back' }}>
      <ResetPasswordHeading />
      <ResetPasswordForm />
    </AccountScreen>
  );
}
