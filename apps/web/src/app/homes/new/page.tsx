import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { ArtFrame } from '@/components/art/art-frame';
import { JoinSomeonesHome, StartANewHome } from './start-or-join-sections';

export const metadata: Metadata = { title: 'Start or join a home' };

export default function StartOrJoinPage(): ReactNode {
  return (
    <AccountScreen>
      <ArtFrame artKey="newKeys" alt="" />
      <AccountHeading title="Let’s set up your home">
        Start a new home, or join the people you live with.
      </AccountHeading>
      <StartANewHome />
      <JoinSomeonesHome />
    </AccountScreen>
  );
}
