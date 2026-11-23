'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { StartRedirect } from '@/components/start/start-redirect';
import { useMightBeSignedIn } from '@/components/start/use-might-be-signed-in';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import type { StartRoute } from '@/lib/navigation/start-route';
import { WelcomeScreen } from './welcome/welcome-sections';

// "/" is Welcome for anyone with no session (also in the static HTML). Anyone
// who might be signed in is sent on to Start or join a home, or Today.
export function StartPage(): ReactNode {
  const auth = useAccountAuth();
  const router = useRouter();
  const mightBeSignedIn = useMightBeSignedIn();
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
