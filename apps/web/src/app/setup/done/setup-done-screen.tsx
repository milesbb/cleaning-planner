'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { AppGuide } from '@/components/guide/app-guide';
import { ButtonLink } from '@/components/ui/button';
import { hasJustCreatedHome } from '@/lib/setup/just-created-home';

const NEVER_CHANGES = (): (() => void) => () => undefined;
const NOT_KNOWN_ON_THE_SERVER = (): boolean => false;

export function SetupDoneScreen(): ReactNode {
  const router = useRouter();
  const isJustAfterSetup = useSyncExternalStore(
    NEVER_CHANGES,
    hasJustCreatedHome,
    NOT_KNOWN_ON_THE_SERVER,
  );
  useEffect(() => {
    if (!isJustAfterSetup) router.replace('/today');
  }, [isJustAfterSetup, router]);
  if (!isJustAfterSetup) return null;
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
