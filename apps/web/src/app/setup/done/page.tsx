import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { AppGuide } from '@/components/guide/app-guide';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = { title: 'You’re all set' };

export default function SetupDonePage(): ReactNode {
  return (
    <AccountScreen>
      <AccountHeading title="You’re all set">
        Your home is ready. Here’s how it works; you can find this again any time under Help.
      </AccountHeading>
      <AppGuide />
      <ButtonLink href="/today">Go to Today</ButtonLink>
    </AccountScreen>
  );
}
