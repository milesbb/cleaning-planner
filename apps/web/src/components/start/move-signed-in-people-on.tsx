'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { safeReturnPath } from '@/lib/navigation/start-route';

// On Welcome, Log in and Create account: someone already signed in goes on to
// the page Log in was asked to return to, else the start ("/"), which picks
// Today or Start or join a home.
export function MoveSignedInPeopleOn(): ReactNode {
  const auth = useAccountAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.mightBeSignedIn()) return;
    let isStillHere = true;
    const destination = safeReturnPath(new URLSearchParams(window.location.search).get('next'));
    void auth.isSignedIn().then((isSignedIn) => {
      if (isSignedIn && isStillHere) router.replace(destination);
    });
    return (): void => {
      isStillHere = false;
    };
  }, [auth, router]);
  return null;
}
