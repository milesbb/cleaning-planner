import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DeleteAccountScreen } from './delete-account-screen';

export const metadata: Metadata = { title: 'Delete account' };

export default function DeleteAccountPage(): ReactNode {
  return <DeleteAccountScreen />;
}
