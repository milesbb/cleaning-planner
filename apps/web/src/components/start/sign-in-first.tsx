'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';
import { signInPathFor } from '@/lib/navigation/start-route';

// For signed-in screens that load nothing from the API (Help, the setup steps),
// so no 401 would send a signed-out visitor to Log in.
export function SignInFirst(): ReactNode {
  const auth = useAccountAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.mightBeSignedIn()) return;
    router.replace(signInPathFor(`${window.location.pathname}${window.location.search}`));
  }, [auth, router]);
  return null;
}
