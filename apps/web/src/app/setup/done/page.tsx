import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SetupDoneScreen } from './setup-done-screen';

export const metadata: Metadata = { title: 'You’re all set' };

export default function SetupDonePage(): ReactNode {
  return <SetupDoneScreen />;
}
