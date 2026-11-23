'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import type { QueryKey, UseQueryResult } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createContext, use, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SavedDataStorage } from '@/lib/storage/saved-data-storage';
import { ApiRequestError } from './api-client';
import type { ApiClient, ApiRequest } from './api-client';
import { shouldRetry } from './query-policy';
import { queueRequests } from './queued-requests';
import { RefusedChangeContext } from './refused-change';
import { SAVED_FOR_MS, savedAnswers as createSavedAnswers } from './saved-answers';
import type { SavedAnswers } from './saved-answers';

const FRESH_FOR_MS = 30_000;

const ApiClientContext = createContext<ApiClient | null>(null);

interface ApiProviderProps {
  client: ApiClient;
  onSignedOut: () => void;
  savedData?: SavedDataStorage;
  children: ReactNode;
}

function isSignedOut(error: unknown): boolean {
  return error instanceof ApiRequestError && error.kind === 'signedOut';
}

function createQueryClient(onSignedOut: () => void): QueryClient {
  const handleError = (error: unknown): void => {
    if (isSignedOut(error)) onSignedOut();
  };
  const queryCache = new QueryCache({ onError: handleError });
  const mutationCache = new MutationCache({ onError: handleError });
  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: FRESH_FOR_MS, gcTime: SAVED_FOR_MS },
      mutations: { retry: shouldRetry, gcTime: SAVED_FOR_MS },
    },
  });
}

// Saved answers show at once but count as stale, so every screen asks the API
// again in the background (and a device that is no longer signed in finds out).
function refreshAfterRestoring(queryClient: QueryClient): Promise<void> {
  void queryClient.resumePausedMutations();
  return queryClient.invalidateQueries({ refetchType: 'none' });
}

function QueryProvider({
  queryClient,
  savedAnswers,
  children,
}: {
  queryClient: QueryClient;
  savedAnswers: SavedAnswers | null;
  children: ReactNode;
}): ReactNode {
  if (savedAnswers === null) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={savedAnswers.persistOptions}
      onSuccess={() => refreshAfterRestoring(queryClient)}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

export function ApiProvider({
  client,
  onSignedOut,
  savedData,
  children,
}: ApiProviderProps): ReactNode {
  const [refusedMessage, setRefusedMessage] = useState<string | null>(null);
  const [savedAnswers] = useState(() =>
    savedData === undefined ? null : createSavedAnswers(savedData),
  );
  // A 401 also forgets the saved answers, so the next person to sign in on this
  // device never sees them.
  const [queryClient] = useState(() => {
    const newQueryClient = createQueryClient(() => {
      savedAnswers?.forget();
      onSignedOut();
    });
    queueRequests(newQueryClient, client, setRefusedMessage);
    return newQueryClient;
  });
  const refusedChange = useMemo(
    () => ({
      message: refusedMessage,
      dismiss: (): void => {
        setRefusedMessage(null);
      },
    }),
    [refusedMessage],
  );
  return (
    <ApiClientContext value={client}>
      <RefusedChangeContext value={refusedChange}>
        <QueryProvider queryClient={queryClient} savedAnswers={savedAnswers}>
          {children}
        </QueryProvider>
      </RefusedChangeContext>
    </ApiClientContext>
  );
}

export function useApiClient(): ApiClient {
  const client = use(ApiClientContext);
  if (client === null) throw new Error('useApiClient needs an ApiProvider above it');
  return client;
}

// `isEnabled: false` waits, for a request that needs another query's answer first.
export function useApiQuery<Result>(
  queryKey: QueryKey,
  request: ApiRequest<Result>,
  { isEnabled = true }: { isEnabled?: boolean } = {},
): UseQueryResult<Result> {
  const client = useApiClient();
  return useQuery({ queryKey, queryFn: () => client.request(request), enabled: isEnabled });
}
