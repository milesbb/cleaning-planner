'use client';

import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { ArtFrame } from '@/components/art/art-frame';
import { useHomes } from '@/lib/home/home-queries';
import { JoinSomeonesHome, StartANewHome } from './start-or-join-sections';

const WAY_BACK = { back: { href: '/today', label: 'Back to Today' } };

// Someone with no home yet has nowhere to go back to; someone adding another
// home (from the home switcher or Your account) does.
export function StartOrJoinScreen(): ReactNode {
  const homes = useHomes();
  const hasAHome = (homes.data?.length ?? 0) > 0;
  return (
    <AccountScreen {...(hasAHome ? WAY_BACK : {})}>
      <ArtFrame artKey="newKeys" alt="" />
      {hasAHome ? (
        <AccountHeading title="Add another home">
          Start another home, or join one someone has shared with you.
        </AccountHeading>
      ) : (
        <AccountHeading title="Let’s set up your home">
          Start a new home, or join the people you live with.
        </AccountHeading>
      )}
      <StartANewHome />
      <JoinSomeonesHome />
    </AccountScreen>
  );
}
