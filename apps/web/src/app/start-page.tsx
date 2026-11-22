'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { StartRedirect } from '@/components/start/start-redirect';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import type { StartRoute } from '@/lib/navigation/start-route';

export function StartPage(): ReactNode {
  const auth = useAccountAuth();
  const router = useRouter();
  const goTo = useCallback(
    (route: StartRoute) => {
      router.replace(route);
    },
    [router],
  );
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <StartRedirect isSignedIn={auth.isSignedIn} goTo={goTo} />
    </main>
  );
}
