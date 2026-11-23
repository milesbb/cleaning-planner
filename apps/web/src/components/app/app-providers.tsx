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
import {
  accessTokenFrom,
  cognitoFunctionsFrom,
  lazyAmplifyAuth,
  readAuthSettings,
  storedSessionCheck,
} from '@/lib/auth/amplify-auth';
import { signInPathFor } from '@/lib/navigation/start-route';
import { useServiceWorker } from '@/lib/pwa/use-service-worker';

// Built in at build time from the NEXT_PUBLIC_ variables (Vercel, or the e2e build).
const authSettings = readAuthSettings({
  userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
  userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
});
const loadAmplifyAuth = lazyAmplifyAuth(authSettings);
const hasStoredSession = storedSessionCheck(authSettings);

const NO_API: ApiClient = {
  request: () =>
    Promise.reject(
      new ApiRequestError(
        'unavailable',
        'Something went wrong on our side. Try again in a moment.',
      ),
    ),
};

const accountAuth = createAccountAuth(
  cognitoFunctionsFrom(loadAmplifyAuth, hasStoredSession),
  hasStoredSession,
);
const apiClient =
  createAppApiClient(
    process.env.NEXT_PUBLIC_API_URL,
    accessTokenFrom(loadAmplifyAuth, hasStoredSession),
  ) ?? NO_API;

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): ReactNode {
  const router = useRouter();
  useServiceWorker();
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
