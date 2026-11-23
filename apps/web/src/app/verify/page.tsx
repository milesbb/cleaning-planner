import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountScreen } from '@/components/account/account-screen';
import { VerifyForm } from './verify-form';
import { VerifyHeading } from './verify-heading';

export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyPage(): ReactNode {
  return (
    <AccountScreen back={{ href: '/sign-up', label: 'Back' }}>
      <VerifyHeading />
      <VerifyForm />
    </AccountScreen>
  );
}
