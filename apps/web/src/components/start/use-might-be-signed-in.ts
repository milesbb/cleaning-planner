'use client';

import { useSyncExternalStore } from 'react';
import { useAccountAuth } from '@/lib/auth/account-auth-provider';

const NEVER_CHANGES = (): (() => void) => () => undefined;
const NOT_SIGNED_IN_ON_THE_SERVER = (): boolean => false;

// Whether this browser holds a session, without downloading Amplify. The static
// HTML assumes not, so signed-out visitors see the right page straight away.
export function useMightBeSignedIn(): boolean {
  const auth = useAccountAuth();
  return useSyncExternalStore(NEVER_CHANGES, auth.mightBeSignedIn, NOT_SIGNED_IN_ON_THE_SERVER);
}
