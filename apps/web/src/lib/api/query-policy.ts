import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { ApiRequestError } from './api-client';
import type { ApiFailureKind } from './api-client';

const MAX_RETRIES = 2;
const RETRYABLE_FAILURES: readonly ApiFailureKind[] = ['offline', 'timeout', 'unavailable'];

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  return RETRYABLE_FAILURES.includes(error.kind) && failureCount < MAX_RETRIES;
}

interface OptimisticContext<Data> {
  previous: Data | undefined;
}

interface OptimisticHandlers<Data, Variables> {
  onMutate: (variables: Variables) => Promise<OptimisticContext<Data>>;
  onError: (
    error: unknown,
    variables: Variables,
    context: OptimisticContext<Data> | undefined,
  ) => void;
  onSettled: () => Promise<void>;
}

export function optimisticUpdate<Data, Variables>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  apply: (current: Data, variables: Variables) => Data,
): OptimisticHandlers<Data, Variables> {
  return {
    onMutate: async (variables): Promise<OptimisticContext<Data>> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Data>(queryKey);
      if (previous !== undefined) queryClient.setQueryData(queryKey, apply(previous, variables));
      return { previous };
    },
    onError: (_error, _variables, context): void => {
      if (context?.previous === undefined) {
        queryClient.removeQueries({ queryKey, exact: true });
        return;
      }
      queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  };
}
