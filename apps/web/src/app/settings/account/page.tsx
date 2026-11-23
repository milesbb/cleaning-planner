import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { YourAccountScreen } from './your-account-screen';

export const metadata: Metadata = { title: 'Your account' };

export default function YourAccountPage(): ReactNode {
  return <YourAccountScreen />;
}
