import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ChangePasswordScreen } from './change-password-screen';

export const metadata: Metadata = { title: 'Change password' };

export default function ChangePasswordPage(): ReactNode {
  return <ChangePasswordScreen />;
}
