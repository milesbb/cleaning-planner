import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountScreen } from '@/components/account/account-screen';
import { JoinInvite } from './join-invite';

export const metadata: Metadata = { title: 'Join a home' };

export default function JoinPage(): ReactNode {
  return (
    <AccountScreen>
      <JoinInvite />
    </AccountScreen>
  );
}
