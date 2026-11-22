'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import type { QueryKey, UseQueryResult } from '@tanstack/react-query';
import { createContext, use, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiRequestError } from './api-client';
import type { ApiClient, ApiRequest } from './api-client';
import { shouldRetry } from './query-policy';

const FRESH_FOR_MS = 30_000;

const ApiClientContext = createContext<ApiClient | null>(null);

interface ApiProviderProps {
  client: ApiClient;
  onSignedOut: () => void;
  children: ReactNode;
}

function createQueryClient(onSignedOut: () => void): QueryClient {
  const handleError = (error: unknown): void => {
    if (error instanceof ApiRequestError && error.kind === 'signedOut') onSignedOut();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: FRESH_FOR_MS },
      mutations: { retry: shouldRetry },
    },
  });
}

export function ApiProvider({ client, onSignedOut, children }: ApiProviderProps): ReactNode {
  const [queryClient] = useState(() => createQueryClient(onSignedOut));
  return (
    <ApiClientContext value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiClientContext>
  );
}

export function useApiClient(): ApiClient {
  const client = use(ApiClientContext);
  if (client === null) throw new Error('useApiClient needs an ApiProvider above it');
  return client;
}

export function useApiQuery<Result>(
  queryKey: QueryKey,
  request: ApiRequest<Result>,
): UseQueryResult<Result> {
  const client = useApiClient();
  return useQuery({ queryKey, queryFn: () => client.request(request) });
}
