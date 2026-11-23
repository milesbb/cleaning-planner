import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ChangeEmailScreen } from './change-email-screen';

export const metadata: Metadata = { title: 'Change email' };

export default function ChangeEmailPage(): ReactNode {
  return <ChangeEmailScreen />;
}
