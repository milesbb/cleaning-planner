'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { ApiRequestError } from '@/lib/api/api-client';
import type { ApiClient } from '@/lib/api/api-client';
import { ApiProvider } from '@/lib/api/api-provider';
import { createAppApiClient } from '@/lib/api/app-client';
import { createAccountAuth } from '@/lib/auth/account-auth';
import { AccountAuthProvider } from '@/lib/auth/account-auth-provider';
import { configureAuth, readAuthSettings } from '@/lib/auth/amplify-auth';
import { signInPathFor } from '@/lib/navigation/start-route';

// Built in at build time from the NEXT_PUBLIC_ variables (Vercel, or the e2e build).
configureAuth(
  readAuthSettings({
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
  }),
);

const NO_API: ApiClient = {
  request: () =>
    Promise.reject(
      new ApiRequestError(
        'unavailable',
        'Something went wrong on our side. Try again in a moment.',
      ),
    ),
};

const accountAuth = createAccountAuth();
const apiClient = createAppApiClient(process.env.NEXT_PUBLIC_API_URL) ?? NO_API;

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): ReactNode {
  const router = useRouter();
  const sendToSignIn = useCallback(() => {
    router.replace(signInPathFor(`${window.location.pathname}${window.location.search}`));
  }, [router]);
  return (
    <AccountAuthProvider auth={accountAuth}>
      <ApiProvider client={apiClient} onSignedOut={sendToSignIn}>
        {children}
      </ApiProvider>
    </AccountAuthProvider>
  );
}
