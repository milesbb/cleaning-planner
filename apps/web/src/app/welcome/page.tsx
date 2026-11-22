import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountScreen } from '@/components/account/account-screen';
import { WelcomeActions, WelcomeIntro } from './welcome-sections';

export const metadata: Metadata = { title: 'Welcome' };

export default function WelcomePage(): ReactNode {
  return (
    <AccountScreen>
      <WelcomeIntro />
      <WelcomeActions />
    </AccountScreen>
  );
}
