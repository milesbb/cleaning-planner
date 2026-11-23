import { jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { QueryClient } from '@tanstack/react-query';
import { ApiRequestError, NO_CONTENT } from './api-client';
import type { ApiClient, ApiRequest } from './api-client';
import { isConnectionFailure, shouldRetry } from './query-policy';

export const QUEUED_REQUEST_KEY = ['queued-request'];
const QUEUE_SCOPE = { id: 'queued-requests' };
const REFUSED_FALLBACK = 'A change made offline couldn’t be saved.';

// Queued requests are saved on the device as plain data, so each names its
// response schema rather than carrying it.
const RESPONSE_SCHEMAS = {
  jobProgress: jobProgressSchema,
  nothing: NO_CONTENT,
};

type QueuedResponse = keyof typeof RESPONSE_SCHEMAS;

export interface QueuedRequest {
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body: Record<string, unknown>;
  response: QueuedResponse;
}

function apiRequestFor({ method, path, body, response }: QueuedRequest): ApiRequest<unknown> {
  return { method, path, body, response: RESPONSE_SCHEMAS[response] };
}

// A lost connection is retried until it returns; a server error gets the usual
// few tries, so the screen can put the change back and say so.
export function keepsTrying(failureCount: number, error: unknown): boolean {
  return isConnectionFailure(error) || shouldRetry(failureCount, error);
}

function refusedMessage(error: unknown): string {
  return error instanceof ApiRequestError && error.message !== ''
    ? error.message
    : REFUSED_FALLBACK;
}

// Changes that must reach the API even if the app closes before it's back
// online: one at a time in the order made, each with its own idempotency key.
export function queueRequests(
  queryClient: QueryClient,
  client: ApiClient,
  onRefused: (message: string) => void,
): void {
  queryClient.setMutationDefaults(QUEUED_REQUEST_KEY, {
    mutationFn: (request: QueuedRequest) => client.request(apiRequestFor(request)),
    scope: QUEUE_SCOPE,
    retry: keepsTrying,
    onError: (error) => {
      onRefused(refusedMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['home'] }),
  });
}
