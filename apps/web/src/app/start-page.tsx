'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { StartRedirect } from '@/components/start/start-redirect';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import type { StartRoute } from '@/lib/navigation/start-route';
import { WelcomeScreen } from './welcome/welcome-sections';

const NEVER_CHANGES = (): (() => void) => () => undefined;
const NOT_SIGNED_IN_ON_THE_SERVER = (): boolean => false;

// "/" is Welcome for anyone with no session (also in the static HTML). Anyone
// who might be signed in is sent on to Start or join a home, or Today.
export function StartPage(): ReactNode {
  const auth = useAccountAuth();
  const router = useRouter();
  const mightBeSignedIn = useSyncExternalStore(
    NEVER_CHANGES,
    auth.mightBeSignedIn,
    NOT_SIGNED_IN_ON_THE_SERVER,
  );
  const goTo = useCallback(
    (route: StartRoute) => {
      router.replace(route);
    },
    [router],
  );
  if (!mightBeSignedIn) return <WelcomeScreen />;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <StartRedirect isSignedIn={auth.isSignedIn} goTo={goTo} />
    </main>
  );
}
